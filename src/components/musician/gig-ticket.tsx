import type { ReactNode } from "react";

export type GigTicketData = {
  id: string;
  eyebrow: string;
  title: string;
  lines: string[];
  weekday: string;
  day: number;
  month: string;
};

/*
  The "ticket" card. The two cream circles are the punched notches where the
  stub tears off. They are plain positioned divs painted the page background
  color, which is simpler and more accessible than a CSS mask.
  Tradeoff: if the page background ever becomes an image, the notches would
  show. Today it is a flat color, so this is fine.

  The card does not know about applying. It takes an `action` slot, so the
  same ticket serves the feed (featured gig) and Discover (every gig).
*/
const STUB_WIDTH = 84; // px
const NOTCH = 20; // px

export function GigTicket({ gig, action, compact = false }: { gig: GigTicketData; action?: ReactNode; compact?: boolean }) {
  return (
    <article aria-label={gig.title} className="relative flex rounded-2xl">
      <div className="min-w-0 flex-1 rounded-l-2xl bg-panel p-5 text-panel-ink">
        <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-gold">{gig.eyebrow}</p>
        <h2 className={`mt-2 font-display uppercase leading-[0.95] ${compact ? "text-[32px]" : "text-[44px]"}`}>{gig.title}</h2>
        <p className="mt-4 font-mono text-[13px] uppercase leading-6 tracking-wide">
          {gig.lines.map((line, i) => (
            <span key={i} className="block break-words">
              {line}
            </span>
          ))}
        </p>
        {action && <div className="mt-5">{action}</div>}
      </div>

      <div
        className="flex shrink-0 flex-col items-center justify-center rounded-r-2xl bg-accent text-accent-ink"
        style={{ width: STUB_WIDTH }}
      >
        <span className="font-mono text-[13px] uppercase tracking-widest">{gig.weekday}</span>
        <span className="font-logo text-[52px] font-black italic leading-none">{gig.day}</span>
        <span className="font-mono text-[13px] uppercase tracking-widest">{gig.month}</span>
      </div>

      {/* Punched notches on the perforation line */}
      {(["-top-2.5", "-bottom-2.5"] as const).map((pos) => (
        <span
          key={pos}
          aria-hidden
          className={`absolute ${pos} rounded-full bg-bg`}
          style={{ width: NOTCH, height: NOTCH, right: STUB_WIDTH - NOTCH / 2 }}
        />
      ))}
    </article>
  );
}
