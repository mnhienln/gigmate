"use client";

import { useActionState } from "react";
import { saveOnboardingStep } from "@/app/onboarding/actions";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

/* Generic wrapper for one onboarding screen. The fields come in as children
   (rendered on the server); this part only owns the pending/error state. */
export function StepForm({
  step,
  last,
  children,
}: {
  step: number;
  last: boolean;
  children: React.ReactNode;
}) {
  const [state, action] = useActionState(saveOnboardingStep, {});
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="step" value={step} />
      <FormMessage error={state.error} />
      {children}
      <SubmitButton pendingText="Saving...">{last ? "Finish" : "Next"}</SubmitButton>
    </form>
  );
}
