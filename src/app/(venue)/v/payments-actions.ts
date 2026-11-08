"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentProfile, homeFor, type CurrentProfile } from "@/lib/auth";
import { dayOf, formatDay, formatTime } from "@/lib/dates";
import { BOOST, CANCEL, isLateCancellation } from "@/lib/pricing";
import { siteUrl } from "@/lib/site-url";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

/*
  The venue's two payments, both through Stripe's own page (we never handle card numbers):
    * Boost a gig: $10 to show it first in Discover for 24 hours.
    * Cancel a confirmed gig. Free if it is 48 hours or more away. Closer than that, a $25 fee.
  Nothing changes when the venue comes back from Stripe. The webhook (src/lib/stripe/events.ts) makes the change
  after Stripe confirms the payment, so a person cannot skip paying by typing the success address.
*/
async function requireVenue(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "venue" || !profile.onboarded_at) redirect(homeFor(profile.role));
  return profile;
}

const id = z.uuid();
const isRedirect = (e: unknown) => typeof e === "object" && e !== null && "digest" in e;

// ---------------------------------------------------------------------------
// Boost
// ---------------------------------------------------------------------------
export async function startBoost(slotId: string): Promise<void> {
  const profile = await requireVenue();
  if (!id.safeParse(slotId).success) redirect("/v/calendar");

  const supabase = await createClient();
  const { data: slot } = await supabase
    .from("gig_slots")
    .select("id, starts_at, genre, status")
    .eq("id", slotId)
    .eq("venue_id", profile.id)
    .maybeSingle();
  if (!slot) redirect("/v/calendar");
  if (slot.status !== "open" || new Date(slot.starts_at).getTime() <= Date.now()) redirect(`/v/calendar/${slotId}?boost=closed`);

  let url: string | null = null;
  try {
    const base = await siteUrl();
    const day = formatDay(dayOf(slot.starts_at));
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: BOOST.cents,
            product_data: { name: `Boost your gig for ${BOOST.hours} hours`, description: `${slot.genre ?? "Any genre"} on ${day}, ${formatTime(slot.starts_at)}` },
          },
        },
      ],
      client_reference_id: profile.id,
      metadata: { type: "boost", slot_id: slotId, venue_id: profile.id },
      success_url: `${base}/v/calendar/${slotId}?boost=success`,
      cancel_url: `${base}/v/calendar/${slotId}?boost=cancelled`,
    });
    url = session.url;
  } catch (error) {
    if (isRedirect(error)) throw error;
    console.error("startBoost failed", error instanceof Error ? error.message : error);
    redirect(`/v/calendar/${slotId}?boost=error`);
  }
  redirect(url ?? `/v/calendar/${slotId}?boost=error`);
}

// ---------------------------------------------------------------------------
// Cancel a confirmed gig
// ---------------------------------------------------------------------------
export async function cancelGig(bookingId: string): Promise<void> {
  const profile = await requireVenue();
  if (!id.safeParse(bookingId).success) redirect("/v/calendar");

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, slot_id, venue_id, completed_at, cancelled_at, slot:gig_slots(starts_at, genre)")
    .eq("id", bookingId)
    .eq("venue_id", profile.id)
    .maybeSingle();
  if (!booking) redirect("/v/calendar");
  const slot = Array.isArray(booking.slot) ? booking.slot[0] : booking.slot;
  if (booking.completed_at || booking.cancelled_at || !slot) redirect(`/v/calendar/${booking.slot_id}`);

  if (!isLateCancellation(slot.starts_at)) {
    // Free. The database checks the same 48 hours itself, from the real start time.
    const { error } = await supabase.rpc("cancel_booking", { p_booking: bookingId });
    redirect(`/v/calendar/${booking.slot_id}?cancelled=${error ? "error" : "free"}`);
  }

  // Late: the venue pays the fee on Stripe, then the webhook finishes the cancellation.
  let url: string | null = null;
  try {
    const base = await siteUrl();
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: CANCEL.feeCents,
            product_data: { name: "Late cancellation fee", description: `Cancelling a confirmed gig under ${CANCEL.windowHours} hours before it starts` },
          },
        },
      ],
      client_reference_id: profile.id,
      metadata: { type: "late_cancellation", booking_id: bookingId, venue_id: profile.id, slot_id: booking.slot_id },
      success_url: `${base}/v/calendar/${booking.slot_id}?cancelled=paid`,
      cancel_url: `${base}/v/calendar/${booking.slot_id}?cancelled=no`,
    });
    url = session.url;
  } catch (error) {
    if (isRedirect(error)) throw error;
    console.error("cancelGig failed", error instanceof Error ? error.message : error);
    redirect(`/v/calendar/${booking.slot_id}?cancelled=error`);
  }
  redirect(url ?? `/v/calendar/${booking.slot_id}?cancelled=error`);
}
