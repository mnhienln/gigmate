"use client";

import { useActionState } from "react";
import { logIn } from "@/app/(auth)/actions";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function LoginForm() {
  const [state, action] = useActionState(logIn, {});
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormMessage error={state.error} message={state.message} />
      <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state.values?.email} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      <SubmitButton pendingText="Logging in...">Log in</SubmitButton>
    </form>
  );
}
