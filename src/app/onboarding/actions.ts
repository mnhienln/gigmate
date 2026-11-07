"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentProfile, homeFor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GENRES, NEIGHBORHOODS, VENUE_TYPES } from "@/lib/options";
import { valuesFrom, type FormState } from "@/lib/form-state";

const SAVE_ERROR = "We could not save that. Please try again in a moment.";

const dollars = z.coerce
  .number({ message: "Enter a dollar amount." })
  .int("Use whole dollars.")
  .min(0, "A rate cannot be negative.")
  .max(100000, "That rate looks too high.");

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(z.url({ protocol: /^https?$/, message: "Paste a full link that starts with https://" }).optional());

const musician = {
  1: z.object({
    genres: z.array(z.enum(GENRES)).min(1, "Pick at least one genre.").max(5, "Pick up to 5 genres."),
    neighborhood: z.enum(NEIGHBORHOODS, { message: "Choose your neighborhood." }),
  }),
  2: z
    .object({
      rate_min: dollars,
      rate_max: dollars,
      bio: z.string().trim().max(300, "Keep your bio under 300 characters.").optional(),
    })
    .refine((v) => v.rate_max >= v.rate_min, { message: "Your top rate should be at least your lowest rate." }),
  3: z.object({ media_url: optionalUrl }),
};

const venue = {
  1: z.object({
    venue_type: z.enum(VENUE_TYPES, { message: "Choose a venue type." }),
    neighborhood: z.enum(NEIGHBORHOODS, { message: "Choose your neighborhood." }),
  }),
  2: z.object({
    capacity: z.coerce.number({ message: "Enter a number." }).int("Use a whole number.").min(1, "Capacity must be at least 1.").max(5000, "That capacity looks too high."),
    stage_notes: z.string().trim().max(300, "Keep stage notes under 300 characters.").optional(),
  }),
  3: z.object({ address: z.string().trim().min(5, "Enter your street address.").max(200) }),
};

export async function saveOnboardingStep(_prev: FormState, formData: FormData): Promise<FormState> {
  // Never trust the browser for who or what the user is. Look it up.
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.onboarded_at) redirect(homeFor(profile.role));

  const step = Number(formData.get("step"));
  if (![1, 2, 3].includes(step)) redirect("/onboarding/1");
  const s = step as 1 | 2 | 3;

  const raw: Record<string, unknown> = Object.fromEntries(formData);
  raw.genres = formData.getAll("genres");
  const values = valuesFrom(formData, ["rate_min", "rate_max", "bio", "media_url", "capacity", "stage_notes", "address"]);

  const supabase = await createClient();
  const finish = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({ onboarded_at: new Date().toISOString() })
      .eq("id", profile.id);
    if (error) return { error: SAVE_ERROR, values } satisfies FormState;
    redirect(homeFor(profile.role));
  };

  if (profile.role === "musician") {
    const parsed = musician[s].safeParse(raw);
    if (!parsed.success) return { error: parsed.error.issues[0].message, values };

    if (s === 1) {
      const d = parsed.data as z.infer<(typeof musician)[1]>;
      const a = await supabase.from("musician_profiles").update({ genres: d.genres }).eq("profile_id", profile.id);
      const b = await supabase.from("profiles").update({ neighborhood: d.neighborhood }).eq("id", profile.id);
      if (a.error || b.error) return { error: SAVE_ERROR, values };
    } else if (s === 2) {
      const d = parsed.data as z.infer<(typeof musician)[2]>;
      const { error } = await supabase
        .from("musician_profiles")
        .update({ rate_min_cents: d.rate_min * 100, rate_max_cents: d.rate_max * 100, bio: d.bio || null })
        .eq("profile_id", profile.id);
      if (error) return { error: SAVE_ERROR, values };
    } else {
      const d = parsed.data as z.infer<(typeof musician)[3]>;
      const { error } = await supabase
        .from("musician_profiles")
        .update({
          media_links: d.media_url ? [{ label: "Listen", url: d.media_url }] : [],
          available_tonight: formData.get("available_tonight") === "on",
        })
        .eq("profile_id", profile.id);
      if (error) return { error: SAVE_ERROR, values };
      return finish();
    }
  } else {
    const parsed = venue[s].safeParse(raw);
    if (!parsed.success) return { error: parsed.error.issues[0].message, values };

    if (s === 1) {
      const d = parsed.data as z.infer<(typeof venue)[1]>;
      const a = await supabase.from("venue_profiles").update({ venue_type: d.venue_type }).eq("profile_id", profile.id);
      const b = await supabase.from("profiles").update({ neighborhood: d.neighborhood }).eq("id", profile.id);
      if (a.error || b.error) return { error: SAVE_ERROR, values };
    } else if (s === 2) {
      const d = parsed.data as z.infer<(typeof venue)[2]>;
      const { error } = await supabase
        .from("venue_profiles")
        .update({ capacity: d.capacity, has_pa: formData.get("has_pa") === "on", stage_notes: d.stage_notes || null })
        .eq("profile_id", profile.id);
      if (error) return { error: SAVE_ERROR, values };
    } else {
      const d = parsed.data as z.infer<(typeof venue)[3]>;
      const { error } = await supabase.from("venue_profiles").update({ address: d.address }).eq("profile_id", profile.id);
      if (error) return { error: SAVE_ERROR, values };
      return finish();
    }
  }

  redirect(`/onboarding/${s + 1}`);
}
