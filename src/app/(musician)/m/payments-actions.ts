"use server";

import { redirect } from "next/navigation";
import { getCurrentProfile, homeFor, type CurrentProfile } from "@/lib/auth";
import { PLANS, TRIAL_DAYS, isPlanId } from "@/lib/pricing";
import { getMySubscription } from "@/lib/musician/subscription";
import { siteUrl } from "@/lib/site-url";
import { getStripe } from "@/lib/stripe";

/*
  Sends a musician to Stripe's own payment page, or to Stripe's page for managing a plan.
  We never see or store card numbers: Stripe's pages collect them. Access is granted later, by the webhook
  (src/lib/stripe/events.ts), once Stripe confirms the plan. Coming back from Stripe proves nothing.
*/
async function requireMusician(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "musician" || !profile.onboarded_at) redirect(homeFor(profile.role));
  return profile;
}

export async function startSubscription(formData: FormData): Promise<void> {
  const profile = await requireMusician();
  const plan = formData.get("plan");
  if (!isPlanId(plan)) redirect("/m/subscribe?error=plan");

  const mine = await getMySubscription(profile.id);
  if (mine.active) redirect("/m/subscribe"); // already covered; avoid paying twice

  let url: string | null = null;
  try {
    const stripe = getStripe();
    const lookupKey = PLANS.find((p) => p.id === plan)!.lookupKey;
    const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
    const price = prices.data[0];
    if (!price) redirect("/m/subscribe?error=setup");

    const base = await siteUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: price.id, quantity: 1 }],
      client_reference_id: profile.id,
      ...(mine.customerId ? { customer: mine.customerId } : {}),
      subscription_data: {
        metadata: { user_id: profile.id },
        // Only a first-time subscriber gets the free trial.
        ...(mine.hadPlan ? {} : { trial_period_days: TRIAL_DAYS }),
      },
      success_url: `${base}/m/subscribe?status=success`,
      cancel_url: `${base}/m/subscribe?status=cancelled`,
    });
    url = session.url;
  } catch (error) {
    // redirect() works by throwing; let those through.
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if (typeof error === "object" && error !== null && "digest" in error) throw error;
    console.error("startSubscription failed", error instanceof Error ? error.message : error);
    redirect("/m/subscribe?error=checkout");
  }
  if (!url) redirect("/m/subscribe?error=checkout");
  redirect(url);
}

export async function openBillingPortal(): Promise<void> {
  const profile = await requireMusician();
  const mine = await getMySubscription(profile.id);
  if (!mine.customerId) redirect("/m/subscribe");

  let url: string | null = null;
  try {
    const stripe = getStripe();
    const configs = await stripe.billingPortal.configurations.list({ limit: 20 });
    const config = configs.data.find((c) => c.metadata?.gigmate === "portal");
    const session = await stripe.billingPortal.sessions.create({
      customer: mine.customerId,
      return_url: `${await siteUrl()}/m/subscribe`,
      ...(config ? { configuration: config.id } : {}),
    });
    url = session.url;
  } catch (error) {
    if (typeof error === "object" && error !== null && "digest" in error) throw error;
    console.error("openBillingPortal failed", error instanceof Error ? error.message : error);
    redirect("/m/subscribe?error=portal");
  }
  redirect(url!);
}
