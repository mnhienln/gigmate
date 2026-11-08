"use client";

import { useActionState } from "react";
import { updateMusicianProfile } from "@/app/(musician)/m/actions";
import { ChipGroup, Field, Select, TextArea, Toggle } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { GENRES, NEIGHBORHOODS } from "@/lib/options";
import type { MyProfile } from "@/lib/types";

export function MusicianProfileForm({ initial }: { initial: MyProfile }) {
  const [state, action] = useActionState(updateMusicianProfile, {});
  const v = state.values ?? {};
  const links = initial.media_links.map((l) => l.url);
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormMessage error={state.error} message={state.message} />
      <Field label="Name or stage name" name="display_name" required maxLength={80} defaultValue={v.display_name ?? initial.display_name} />
      <Select label="Neighborhood" name="neighborhood" options={NEIGHBORHOODS} defaultValue={v.neighborhood ?? initial.neighborhood ?? undefined} />
      <ChipGroup legend="Genres (pick up to 5)" name="genres" options={GENRES} defaults={initial.genres} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Lowest rate ($)" name="rate_min" type="number" inputMode="numeric" min={0} required defaultValue={v.rate_min ?? (initial.rate_min_cents != null ? initial.rate_min_cents / 100 : "")} />
        <Field label="Top rate ($)" name="rate_max" type="number" inputMode="numeric" min={0} required defaultValue={v.rate_max ?? (initial.rate_max_cents != null ? initial.rate_max_cents / 100 : "")} />
      </div>
      <TextArea label="Bio" name="bio" maxLength={300} defaultValue={v.bio ?? initial.bio ?? ""} hint="Up to 300 characters." />
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 font-mono text-[12px] font-bold uppercase tracking-wide">Music links (up to 5)</legend>
        <p className="text-sm text-ink-muted">Paste your Spotify, YouTube or SoundCloud page. They appear as buttons on your profile.</p>
        {[1, 2, 3, 4, 5].map((n) => (
          <Field
            key={n}
            label={`Link ${n}`}
            name={`link${n}`}
            type="url"
            inputMode="url"
            placeholder="https://"
            defaultValue={v[`link${n}`] ?? links[n - 1] ?? ""}
          />
        ))}
      </fieldset>
      <Toggle label="I am available to play tonight" name="available_tonight" defaultChecked={initial.available_tonight} />
      <SubmitButton pendingText="Saving...">Save press kit</SubmitButton>
    </form>
  );
}
