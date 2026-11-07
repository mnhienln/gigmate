"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentProfile, homeFor, type CurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isDateString, isTimeString, localToUtcIso, todayLocal } from "@/lib/dates";
import { ANY_GENRE, GEAR, GENRES, NEIGHBORHOODS, SET_LENGTHS, VENUE_TYPES } from "@/lib/options";
import { valuesFrom, type FormState } from "@/lib/form-state";

/* Every action starts here. The browser can send anything, so we look up who is
   calling and refuse anyone who is not a finished venue account. */
async function requireVenue(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "venue" || !profile.onboarded_at) redirect(homeFor(profile.role));
  return profile;
}

const idSchema = z.uuid();

// ---------------------------------------------------------------------------
// Post a gig (also used for "Need an act tonight")
// ---------------------------------------------------------------------------
const slotSchema = z.object({
  date: z.string().refine(isDateString, "Pick a date for the gig."),
  time: z.string().refine(isTimeString, "Pick a start time."),
  set_length_min: z.coerce
    .number({ message: "Choose a set length." })
    .refine((v) => (SET_LENGTHS as readonly number[]).includes(v), "Choose a set length."),
  pay: z.coerce
    .number({ message: "Enter the pay in dollars." })
    .int("Use whole dollars for the pay.")
    .min(0, "Pay cannot be negative.")
    .max(10000, "That pay looks too high. Check the amount."),
  genre: z.enum([ANY_GENRE, ...GENRES], { message: "Choose a genre, or Any genre." }),
  gear: z.array(z.enum(GEAR)),
  notes: z.string().trim().max(300, "Keep notes under 300 characters.").optional(),
  urgent: z.enum(["true", "false"]),
});

export async function createSlot(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireVenue();
  const values = valuesFrom(formData, ["date", "time", "set_length_min", "pay", "genre", "notes", "urgent"]);

  const parsed = slotSchema.safeParse({ ...Object.fromEntries(formData), gear: formData.getAll("gear") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };
  const d = parsed.data;
  const urgent = d.urgent === "true";

  if (urgent && d.date !== todayLocal()) {
    return { error: "A tonight post has to be for today.", values };
  }
  const startsAt = localToUtcIso(d.date, d.time);
  if (Date.parse(startsAt) <= Date.now()) {
    return { error: urgent ? "That start time has already passed tonight." : "That start time is in the past. Pick a later date or time.", values };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("gig_slots").insert({
    venue_id: profile.id,
    starts_at: startsAt,
    set_length_min: d.set_length_min,
    pay_cents: d.pay * 100,
    genre: d.genre === ANY_GENRE ? null : d.genre,
    gear_provided: d.gear,
    notes: d.notes || null,
    is_urgent: urgent,
  });
  if (error) return { error: "We could not post that gig. Please try again in a moment.", values };

  redirect(`/v/calendar?day=${d.date}`);
}

// ---------------------------------------------------------------------------
// Cancel an open slot (nobody is booked yet, so nobody is let down)
// ---------------------------------------------------------------------------
export async function cancelSlot(slotId: string): Promise<void> {
  const profile = await requireVenue();
  if (!idSchema.safeParse(slotId).success) redirect("/v/calendar");

  const supabase = await createClient();
  // RLS also enforces "own slot" and "still open"; the filters make the intent explicit.
  await supabase.from("gig_slots").delete().eq("id", slotId).eq("venue_id", profile.id).eq("status", "open");
  redirect("/v/calendar");
}

// ---------------------------------------------------------------------------
// Requests: accept, decline
// ---------------------------------------------------------------------------
function acceptErrorCode(message: string): string {
  if (/no longer open/i.test(message)) return "closed";
  if (/already answered/i.test(message)) return "answered";
  if (/no longer exists/i.test(message)) return "gone";
  if (/own gigs/i.test(message)) return "notyours";
  return "other";
}

export async function acceptApplication(applicationId: string): Promise<void> {
  await requireVenue();
  if (!idSchema.safeParse(applicationId).success) redirect("/v/requests");

  const supabase = await createClient();
  // One database function does all of it atomically: accept this applicant,
  // decline the others, mark the slot booked, create the booking.
  const { data: bookingId, error } = await supabase.rpc("accept_application", { p_application: applicationId });
  if (error || !bookingId) redirect(`/v/requests?error=${acceptErrorCode(error?.message ?? "")}`);

  const { data: booking } = await supabase.from("bookings").select("slot_id").eq("id", bookingId).maybeSingle();
  redirect(booking ? `/v/calendar/${booking.slot_id}?accepted=1` : "/v/calendar");
}

export async function declineApplication(applicationId: string): Promise<void> {
  await requireVenue();
  if (!idSchema.safeParse(applicationId).success) redirect("/v/requests");

  const supabase = await createClient();
  await supabase.from("applications").update({ status: "declined" }).eq("id", applicationId).eq("status", "pending");
  redirect("/v/requests");
}

// ---------------------------------------------------------------------------
// After the show
// ---------------------------------------------------------------------------
export async function markGigHappened(bookingId: string, slotId: string): Promise<void> {
  await requireVenue();
  if (!idSchema.safeParse(bookingId).success || !idSchema.safeParse(slotId).success) redirect("/v/calendar");

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_gig_complete", { p_booking: bookingId });
  redirect(`/v/calendar/${slotId}${error ? "?error=complete" : ""}`);
}

// ---------------------------------------------------------------------------
// Venue profile
// ---------------------------------------------------------------------------
const profileSchema = z.object({
  display_name: z.string().trim().min(1, "Enter your venue name.").max(80, "Keep the name under 80 characters."),
  venue_type: z.enum(VENUE_TYPES, { message: "Choose a venue type." }),
  neighborhood: z.enum(NEIGHBORHOODS, { message: "Choose your neighborhood." }),
  capacity: z.coerce.number({ message: "Enter a number." }).int("Use a whole number.").min(1, "Capacity must be at least 1.").max(5000, "That capacity looks too high."),
  stage_notes: z.string().trim().max(300, "Keep stage notes under 300 characters.").optional(),
  address: z.string().trim().min(5, "Enter your street address.").max(200),
});

export async function updateVenueProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireVenue();
  const values = valuesFrom(formData, ["display_name", "venue_type", "neighborhood", "capacity", "stage_notes", "address"]);

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };
  const d = parsed.data;

  const supabase = await createClient();
  const a = await supabase.from("profiles").update({ display_name: d.display_name, neighborhood: d.neighborhood }).eq("id", profile.id);
  const b = await supabase
    .from("venue_profiles")
    .update({ venue_type: d.venue_type, capacity: d.capacity, has_pa: formData.get("has_pa") === "on", stage_notes: d.stage_notes || null, address: d.address })
    .eq("profile_id", profile.id);
  if (a.error || b.error) return { error: "We could not save your changes. Please try again.", values };
  return { message: "Saved.", values };
}
