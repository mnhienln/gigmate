import type { ReactNode } from "react";
import { dayNumber, dayOf, formatMonthShort, formatTimeRange, formatWeekday } from "@/lib/dates";
import { formatUsd } from "@/lib/money";
import type { VenueSummary } from "@/lib/types";

/* A compact row for gigs in the Bookings tabs: a date stub, the key facts, a status badge, and one action. */
export function GigRow({
  startsAt,
  setLength,
  payCents,
  venue,
  genre,
  badge,
  badgeTone = "neutral",
  note,
  showAddress = false,
  action,
}: {
  startsAt: string;
  setLength: number;
  payCents: number;
  venue: VenueSummary;
  genre: string | null;
  badge: string;
  badgeTone?: "good" | "neutral" | "muted";
  note?: string;
  showAddress?: boolean;
  action?: ReactNode;
}) {
  const date = dayOf(startsAt);
  const tone =
    badgeTone === "good" ? "bg-gold text-gold-ink border-gold" : badgeTone === "muted" ? "border-line text-ink-muted" : "border-ink text-ink";
  return (
    <article className="flex flex-col gap-3 rounded-2xl border-2 border-ink p-4">
      <div className="flex gap-4">
        <div aria-hidden className="flex w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-accent py-2 text-accent-ink">
          <span className="font-mono text-[11px] uppercase tracking-widest">{formatWeekday(date)}</span>
          <span className="font-logo text-[34px] font-black italic leading-none">{dayNumber(date)}</span>
          <span className="font-mono text-[11px] uppercase tracking-widest">{formatMonthShort(date)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 break-words font-display text-2xl uppercase leading-none">{venue.name}</h3>
            <span className={`inline-flex min-h-6 shrink-0 items-center rounded-full border-2 px-2.5 font-mono text-[10px] font-bold uppercase tracking-wide ${tone}`}>
              {badge}
            </span>
          </div>
          <p className="mt-1.5 font-mono text-[12px] uppercase leading-5 tracking-wide text-ink-muted">
            {formatTimeRange(startsAt, setLength)}
            <br />
            {formatUsd(payCents)} · {setLength} min · {genre ?? "Any genre"}
          </p>
          {showAddress && venue.address && <p className="mt-1.5 text-sm">{venue.address}</p>}
        </div>
      </div>
      {note && <p className="text-sm text-ink-muted">{note}</p>}
      {action}
    </article>
  );
}
