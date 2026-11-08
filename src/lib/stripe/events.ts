import "server-only";
import type Stripe from "stripe";
import { BOOST, CANCEL, type PlanId } from "@/lib/pricing";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/*
  What to do when Stripe tells us something happened. This is the ONLY place that grants a plan,
  extends a boost or finishes a late cancellation. The browser's "success" page never does, because a
  person can reach a success URL without paying. Only a message signed by Stripe counts.

  Stripe can send the same event more than once, or out of order, so every step here is safe to repeat.
*/

type Admin = ReturnType<typeof createAdminClient>;

function planOf(sub: Stripe.Subscription): PlanId | null {
  const price = sub.items.data[0]?.price;
  if (price?.lookup_key === "gigmate_weekly" || price?.recurring?.interval === "week") return "weekly";
  if (price?.lookup_key === "gigmate_monthly" || price?.recurring?.interval === "month") return "monthly";
  if (price?.lookup_key === "gigmate_yearly" || price?.recurring?.interval === "year") return "yearly";
  return null;
}

/* Newer Stripe versions keep the period end on the subscription item; older ones on the subscription. */
function periodEnd(sub: Stripe.Subscription): number | null {
  const item = sub.items.data[0] as unknown as { current_period_end?: number } | undefined;
  return item?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end ?? null;
}

const iso = (seconds: number | null | undefined) => (seconds ? new Date(seconds * 1000).toISOString() : null);

async function saveSubscription(admin: Admin, sub: Stripe.Subscription, fallbackUserId?: string | null): Promise<string> {
  let musicianId = sub.metadata?.user_id || fallbackUserId || undefined;
  if (!musicianId) {
    const { data } = await admin.from("subscriptions").select("musician_id").eq("stripe_subscription_id", sub.id).maybeSingle();
    musicianId = data?.musician_id;
  }
  if (!musicianId) return "subscription ignored: no GiGmate user attached";

  const { error } = await admin.from("subscriptions").upsert(
    {
      musician_id: musicianId,
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      stripe_subscription_id: sub.id,
      plan: planOf(sub),
      status: sub.status,
      current_period_end: iso(periodEnd(sub)),
      trial_end: iso(sub.trial_end),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "musician_id" },
  );
  if (error) throw new Error(`Could not save subscription: ${error.message}`);
  return `subscription ${sub.status}`;
}

async function handleBoost(admin: Admin, session: Stripe.Checkout.Session): Promise<string> {
  const slotId = session.metadata?.slot_id;
  const venueId = session.metadata?.venue_id;
  if (!slotId || !venueId) return "boost ignored: missing details";

  const now = new Date();
  // boosts.stripe_checkout_session_id is unique, so a repeated event inserts nothing and changes nothing.
  const { data: inserted, error } = await admin
    .from("boosts")
    .upsert(
      { slot_id: slotId, venue_id: venueId, stripe_checkout_session_id: session.id, starts_at: now.toISOString(), ends_at: new Date(now.getTime() + BOOST.hours * 3600 * 1000).toISOString() },
      { onConflict: "stripe_checkout_session_id", ignoreDuplicates: true },
    )
    .select("id");
  if (error) {
    // 23503 = the gig was deleted before the payment arrived. Nothing to boost; do not make Stripe retry forever.
    if (error.code === "23503") return "boost ignored: gig no longer exists";
    throw new Error(`Could not record boost: ${error.message}`);
  }
  if (!inserted?.length) return "boost already recorded";

  // Stack boosts: a second boost extends from the end of the first.
  const { data: slot } = await admin.from("gig_slots").select("boosted_until").eq("id", slotId).maybeSingle();
  const from = Math.max(now.getTime(), slot?.boosted_until ? new Date(slot.boosted_until).getTime() : 0);
  const { error: upd } = await admin.from("gig_slots").update({ boosted_until: new Date(from + BOOST.hours * 3600 * 1000).toISOString() }).eq("id", slotId);
  if (upd) throw new Error(`Could not boost the gig: ${upd.message}`);
  return "gig boosted";
}

async function handleLateCancellation(admin: Admin, session: Stripe.Checkout.Session): Promise<string> {
  const bookingId = session.metadata?.booking_id;
  if (!bookingId) return "cancellation ignored: missing booking";
  const { error } = await admin.rpc("apply_late_cancellation", { p_booking: bookingId, p_fee: session.amount_total ?? CANCEL.feeCents });
  if (error) {
    if (/does not exist|already happened/i.test(error.message)) return `cancellation ignored: ${error.message}`;
    throw new Error(`Could not finish the cancellation: ${error.message}`);
  }
  return "gig cancelled (late fee paid)";
}

async function handleCheckoutCompleted(admin: Admin, session: Stripe.Checkout.Session): Promise<string> {
  if (session.mode === "subscription") {
    if (!session.subscription) return "checkout ignored: no subscription";
    const id = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
    const sub = await getStripe().subscriptions.retrieve(id); // ask Stripe for the truth rather than trusting a copy
    return saveSubscription(admin, sub, session.client_reference_id);
  }
  if (session.payment_status !== "paid") return "checkout ignored: not paid";
  if (session.metadata?.type === "boost") return handleBoost(admin, session);
  if (session.metadata?.type === "late_cancellation") return handleLateCancellation(admin, session);
  return "checkout ignored: unknown purpose";
}

export async function handleStripeEvent(event: Stripe.Event): Promise<string> {
  const admin = createAdminClient();
  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutCompleted(admin, event.data.object as Stripe.Checkout.Session);
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return saveSubscription(admin, event.data.object as Stripe.Subscription);
    default:
      return `ignored ${event.type}`;
  }
}
