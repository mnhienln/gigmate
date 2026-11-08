"use client";

import { useActionState } from "react";
import { updateVenueProfile } from "@/app/(venue)/v/actions";
import { Field, Select, TextArea, Toggle } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { NEIGHBORHOODS, VENUE_TYPES } from "@/lib/options";

export type VenueProfileValues = {
  display_name: string;
  neighborhood: string | null;
  venue_type: string | null;
  capacity: number | null;
  has_pa: boolean;
  stage_notes: string | null;
  address: string | null;
};

export function VenueProfileForm({ initial }: { initial: VenueProfileValues }) {
  const [state, action] = useActionState(updateVenueProfile, {});
  const v = state.values ?? {};
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormMessage error={state.error} message={state.message} />
      <Field label="Venue name" name="display_name" required maxLength={80} defaultValue={v.display_name ?? initial.display_name} />
      <Select label="Venue type" name="venue_type" options={VENUE_TYPES} defaultValue={v.venue_type ?? initial.venue_type ?? undefined} />
      <Select label="Neighborhood" name="neighborhood" options={NEIGHBORHOODS} defaultValue={v.neighborhood ?? initial.neighborhood ?? undefined} />
      <Field label="Street address" name="address" required defaultValue={v.address ?? initial.address ?? ""} />
      <Field label="Capacity" name="capacity" type="number" inputMode="numeric" min={1} required defaultValue={v.capacity ?? initial.capacity ?? ""} />
      <Toggle label="We have a PA system" name="has_pa" defaultChecked={initial.has_pa} />
      <TextArea label="Stage notes" name="stage_notes" maxLength={300} defaultValue={v.stage_notes ?? initial.stage_notes ?? ""} hint="Stage size, power, load-in." />
      <SubmitButton pendingText="Saving...">Save changes</SubmitButton>
    </form>
  );
}
