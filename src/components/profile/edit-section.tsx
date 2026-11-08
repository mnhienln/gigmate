import type { ReactNode } from "react";

/* One titled block on an Edit profile page. Shared by the musician and venue edit pages. */
export function EditSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3 border-t-2 border-ink px-5 pt-5">
      <div>
        <h2 className="font-display text-2xl uppercase leading-none">{title}</h2>
        {hint && <p className="mt-1 text-sm text-ink-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
