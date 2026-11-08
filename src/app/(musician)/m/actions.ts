"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentProfile, homeFor, type CurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GENRES, NEIGHBORHOODS } from "@/lib/options";
import { linkLabel } from "@/lib/media";
import { getMySubscription } from "@/lib/musician/subscription";
import { valuesFrom, type FormState } from "@/lib/form-state";

/* Every action starts here: look up who is calling, refuse anyone who is not a finished musician. */
async function requireMusician(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "musician" || !profile.onboarded_at) redirect(homeFor(profile.role));
  return profile;
}

const idSchema = z.uuid();

/* Only allow sending people back to our own musician pages, never to a link
   someone smuggled into the form (an "open redirect"). */
function safeReturnTo(value: string): string {
  return value.startsWith("/m/") && !value.startsWith("//") ? value : "/m/discover";
}

function withParam(path: string, key: string, value: string): string {
  const url = new URL(path, "http://local");
  url.searchParams.set(key, value);
  return url.pathname + url.search;
}

// ---------------------------------------------------------------------------
// One-tap apply
// ---------------------------------------------------------------------------
export async function applyToSlot(slotId: string, returnTo: string): Promise<void> {
  const profile = await requireMusician();
  const back = safeReturnTo(returnTo);
  if (!idSchema.safeParse(slotId).success) redirect(withParam(back, "apply", "other"));

  // Applying needs an active plan (a free trial counts). Browsing stays free. The database enforces this
  // too (see 0005_payments.sql); checking here lets us give a clear message instead of a generic refusal.
  const mine = await getMySubscription(profile.id);
  if (!mine.active) redirect(withParam(back, "apply", "subscribe"));

  const supabase = await createClient();
  const { error } = await supabase.from("applications").insert({ slot_id: slotId, musician_id: profile.id });

  if (error) {
    // 23505 = already applied (unique pair); 42501 = the database rules said no
    // (the slot filled up, was cancelled or has already started).
    const code = error.code === "23505" ? "dupe" : error.code === "42501" ? "closed" : "other";
    redirect(withParam(back, "apply", code));
  }
  redirect(withParam(back, "apply", "ok"));
}

export async function withdrawApplication(applicationId: string): Promise<void> {
  const profile = await requireMusician();
  if (!idSchema.safeParse(applicationId).success) redirect("/m/bookings");

  const supabase = await createClient();
  // The database only allows withdrawing a pending application; the filter says so too.
  await supabase
    .from("applications")
    .update({ status: "withdrawn" })
    .eq("id", applicationId)
    .eq("musician_id", profile.id)
    .eq("status", "pending");
  redirect("/m/bookings?tab=applied&withdrawn=1");
}

// ---------------------------------------------------------------------------
// Profile (press kit)
// ---------------------------------------------------------------------------
const dollars = z.coerce
  .number({ message: "Enter a dollar amount." })
  .int("Use whole dollars.")
  .min(0, "A rate cannot be negative.")
  .max(100000, "That rate looks too high.");

const optionalLink = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(z.url({ protocol: /^https?$/, message: "Paste a full link that starts with https://" }).optional());

const profileSchema = z
  .object({
    display_name: z.string().trim().min(1, "Enter your name or stage name.").max(80, "Keep the name under 80 characters."),
    neighborhood: z.enum(NEIGHBORHOODS, { message: "Choose your neighborhood." }),
    genres: z.array(z.enum(GENRES)).min(1, "Pick at least one genre.").max(5, "Pick up to 5 genres."),
    rate_min: dollars,
    rate_max: dollars,
    bio: z.string().trim().max(300, "Keep your bio under 300 characters.").optional(),
    link1: optionalLink,
    link2: optionalLink,
    link3: optionalLink,
    link4: optionalLink,
    link5: optionalLink,
  })
  .refine((v) => v.rate_max >= v.rate_min, { message: "Your top rate should be at least your lowest rate." });

export async function updateMusicianProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireMusician();
  const values = valuesFrom(formData, ["display_name", "neighborhood", "rate_min", "rate_max", "bio", "link1", "link2", "link3", "link4", "link5"]);

  const parsed = profileSchema.safeParse({ ...Object.fromEntries(formData), genres: formData.getAll("genres") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };
  const d = parsed.data;

  const links = [...new Set([d.link1, d.link2, d.link3, d.link4, d.link5].filter((u): u is string => Boolean(u)))].map((url) => ({ label: linkLabel(url), url }));

  const supabase = await createClient();
  const a = await supabase.from("profiles").update({ display_name: d.display_name, neighborhood: d.neighborhood }).eq("id", profile.id);
  const b = await supabase
    .from("musician_profiles")
    .update({
      genres: d.genres,
      rate_min_cents: d.rate_min * 100,
      rate_max_cents: d.rate_max * 100,
      bio: d.bio || null,
      media_links: links,
      available_tonight: formData.get("available_tonight") === "on",
    })
    .eq("profile_id", profile.id);
  if (a.error || b.error) return { error: "We could not save your changes. Please try again.", values };
  return { message: "Saved. Venues see these changes right away.", values };
}
