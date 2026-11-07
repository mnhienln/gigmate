"use client";

import { useActionState } from "react";
import { createSlot } from "@/app/(venue)/v/actions";
import { ChipGroup, Field, TextArea, inputClass } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { ANY_GENRE, GEAR, GENRES, SET_LENGTHS } from "@/lib/options";

/*
  One form for both "Post a gig" and "Need an act tonight". The urgent
  version hides the date (it is always today) and flags the slot as urgent,
  so musicians get it highlighted. Fewer fields means a faster post when a
  band cancels at 5 PM.
*/
export function SlotForm({ urgent, date, today }: { urgent: boolean; date: string; today: string }) {
  const [state, action] = useActionState(createSlot, {});
  const v = state.values ?? {};

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="urgent" value={urgent ? "true" : "false"} />
      <FormMessage error={state.error} />

      {urgent ? (
        <input type="hidden" name="date" value={today} />
      ) : (
        <Field label="Date" name="date" type="date" min={today} required defaultValue={v.date ?? date} />
      )}
      <Field label={urgent ? "Start time tonight" : "Start time"} name="time" type="time" required defaultValue={v.time ?? "20:00"} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-set_length_min" className="font-mono text-[12px] font-bold uppercase tracking-wide">Set length</label>
        <select id="f-set_length_min" name="set_length_min" required defaultValue={v.set_length_min ?? "120"} className={inputClass}>
          {SET_LENGTHS.map((m) => (
            <option key={m} value={m}>{m} minutes</option>
          ))}
        </select>
      </div>

      <Field label="Pay ($)" name="pay" type="number" inputMode="numeric" min={0} required defaultValue={v.pay} hint="What you will pay the act for the night." />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-genre" className="font-mono text-[12px] font-bold uppercase tracking-wide">Genre</label>
        <select id="f-genre" name="genre" required defaultValue={v.genre ?? ANY_GENRE} className={inputClass}>
          {[ANY_GENRE, ...GENRES].map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      <ChipGroup legend="Gear you provide" name="gear" options={GEAR} />
      <TextArea label="Notes" name="notes" maxLength={300} defaultValue={v.notes} hint="Optional. Load-in time, vibe, anything to know." />

      <SubmitButton pendingText="Posting...">{urgent ? "Post tonight's gig" : "Post gig"}</SubmitButton>
    </form>
  );
}
