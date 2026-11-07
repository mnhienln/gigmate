"use client";

import { useFormStatus } from "react-dom";

/* useFormStatus reads the parent <form>'s pending state, so the button
   disables itself and shows progress without any extra wiring. */
export function SubmitButton({
  children,
  pendingText = "Working...",
  variant = "primary",
  name,
  value,
  label,
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: "primary" | "outline";
  name?: string;
  value?: string;
  /** Spoken name for screen readers when the visible text is ambiguous, e.g. "Accept Mara Quinn". */
  label?: string;
}) {
  const { pending } = useFormStatus();
  const style =
    variant === "primary"
      ? "bg-gold text-gold-ink"
      : "border-2 border-ink text-ink";
  return (
    <button
      type="submit"
      name={name}
      value={value}
      aria-label={label}
      disabled={pending}
      className={`flex min-h-14 w-full items-center justify-center rounded-full px-8 font-display text-xl uppercase tracking-wide active:scale-[0.98] disabled:opacity-60 ${style}`}
    >
      {pending ? pendingText : children}
    </button>
  );
}
