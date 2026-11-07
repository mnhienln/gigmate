"use client";

import { useActionState } from "react";
import { demoLogIn } from "@/app/(auth)/actions";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

/* One form, two submit buttons. Whichever button is tapped sends its own
   name/value pair (role=musician or role=venue) with the form. */
export function DemoButtons() {
  const [state, action] = useActionState(demoLogIn, {});
  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-ink p-4">
      <p className="font-mono text-[12px] font-bold uppercase tracking-wide">Demo mode</p>
      <FormMessage error={state.error} />
      <SubmitButton variant="outline" name="role" value="musician" pendingText="Opening...">
        Demo as musician
      </SubmitButton>
      <SubmitButton variant="outline" name="role" value="venue" pendingText="Opening...">
        Demo as venue
      </SubmitButton>
    </form>
  );
}
