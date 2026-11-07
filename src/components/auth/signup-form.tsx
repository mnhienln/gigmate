"use client";

import { useActionState } from "react";
import { signUp } from "@/app/(auth)/actions";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

const ROLES = [
  { value: "musician", title: "I am a musician", hint: "Find gigs and build a press kit" },
  { value: "venue", title: "I run a venue", hint: "Post slots and fill empty nights" },
] as const;

export function SignupForm() {
  const [state, action] = useActionState(signUp, {});
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormMessage error={state.error} message={state.message} />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-mono text-[12px] font-bold uppercase tracking-wide">I am joining as</legend>
        {ROLES.map((r) => (
          <label key={r.value} className="cursor-pointer">
            <input type="radio" name="role" value={r.value} required defaultChecked={state.values?.role === r.value} className="peer sr-only" />
            <span className="flex min-h-16 flex-col justify-center rounded-2xl border-2 border-ink px-4 py-2 peer-checked:bg-panel peer-checked:text-panel-ink peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
              <span className="font-display text-xl uppercase tracking-wide">{r.title}</span>
              <span className="text-sm opacity-80">{r.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <Field label="Your name or venue name" name="display_name" autoComplete="name" required maxLength={80} defaultValue={state.values?.display_name} />
      <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state.values?.email} />
      <Field label="Password" name="password" type="password" autoComplete="new-password" required minLength={8} hint="At least 8 characters." />
      <SubmitButton pendingText="Creating account...">Create account</SubmitButton>
    </form>
  );
}
