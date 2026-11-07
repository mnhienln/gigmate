import type { ComponentProps, ReactNode } from "react";

export const inputClass =
  "min-h-12 w-full rounded-xl border-2 border-ink bg-transparent px-4 text-base placeholder:text-ink-muted/70";

/** Label + input + optional hint. Labels are real <label>s so screen readers and taps both work. */
export function Field({
  label,
  hint,
  name,
  ...props
}: { label: string; hint?: string; name: string } & ComponentProps<"input">) {
  const id = `f-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-mono text-[12px] font-bold uppercase tracking-wide">
        {label}
      </label>
      <input id={id} name={name} aria-describedby={hint ? `${id}-hint` : undefined} className={inputClass} {...props} />
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

export function TextArea({
  label,
  hint,
  name,
  ...props
}: { label: string; hint?: string; name: string } & ComponentProps<"textarea">) {
  const id = `f-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-mono text-[12px] font-bold uppercase tracking-wide">
        {label}
      </label>
      <textarea id={id} name={name} rows={4} aria-describedby={hint ? `${id}-hint` : undefined} className={`${inputClass} py-3`} {...props} />
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

export function Select({
  label,
  name,
  options,
  defaultValue,
  placeholder = "Choose one",
}: {
  label: string;
  name: string;
  options: readonly string[];
  defaultValue?: string;
  placeholder?: string;
}) {
  const id = `f-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-mono text-[12px] font-bold uppercase tracking-wide">
        {label}
      </label>
      <select id={id} name={name} required defaultValue={defaultValue ?? ""} className={inputClass}>
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Pill-style checkboxes. The native input stays (hidden but focusable), so keyboard and screen readers work. */
export function ChipGroup({
  legend,
  name,
  options,
  defaults = [],
  type = "checkbox",
}: {
  legend: string;
  name: string;
  options: readonly string[];
  defaults?: string[];
  type?: "checkbox" | "radio";
}): ReactNode {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 font-mono text-[12px] font-bold uppercase tracking-wide">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o} className="cursor-pointer">
            <input
              type={type}
              name={name}
              value={o}
              defaultChecked={defaults.includes(o)}
              className="peer sr-only"
            />
            <span className="flex min-h-11 items-center rounded-full border-2 border-ink px-4 text-sm font-medium peer-checked:bg-ink peer-checked:text-bg peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
              {o}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Toggle({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-6 accent-[var(--accent)]" />
      <span className="text-base">{label}</span>
    </label>
  );
}
