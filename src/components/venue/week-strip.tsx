import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, dayNumber, dayOf, formatDay, formatWeekday, todayLocal } from "@/lib/dates";
import type { WeekSlot } from "@/lib/types";

/*
  "Week view" built for a 375px screen: seven day chips you can tap, each with
  dots showing what is on that night, and the selected day's gigs listed below.
  A true seven-column grid would make each column about 45px wide, too small
  to read or tap. Tradeoff: you see one day at a time, but the dots still give
  the whole week at a glance.
*/
export function WeekStrip({
  weekStart,
  selected,
  slots,
}: {
  weekStart: string;
  selected: string;
  slots: WeekSlot[];
}) {
  const today = todayLocal();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const byDay = new Map<string, WeekSlot[]>();
  for (const s of slots) {
    const k = dayOf(s.starts_at);
    byDay.set(k, [...(byDay.get(k) ?? []), s]);
  }

  return (
    <section aria-label="Week" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Link
          href={`/v/calendar?day=${addDays(weekStart, -7)}`}
          aria-label="Previous week"
          className="flex size-11 items-center justify-center rounded-full border-2 border-line bg-panel"
        >
          <ChevronLeft size={22} aria-hidden />
        </Link>
        <p className="font-mono text-[12px] font-bold uppercase tracking-wide">
          {formatDay(weekStart)} to {formatDay(addDays(weekStart, 6))}
        </p>
        <Link
          href={`/v/calendar?day=${addDays(weekStart, 7)}`}
          aria-label="Next week"
          className="flex size-11 items-center justify-center rounded-full border-2 border-line bg-panel"
        >
          <ChevronRight size={22} aria-hidden />
        </Link>
      </div>

      <ol className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const here = byDay.get(d) ?? [];
          const isSel = d === selected;
          return (
            <li key={d}>
              <Link
                href={`/v/calendar?day=${d}`}
                aria-current={isSel ? "date" : undefined}
                aria-label={`${formatDay(d)}, ${here.length} gig${here.length === 1 ? "" : "s"}${d === today ? ", today" : ""}`}
                className={`flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border-2 py-1 ${
                  isSel ? "border-accent bg-accent text-accent-ink" : d === today ? "border-gold bg-panel" : "border-line bg-panel"
                }`}
              >
                <span className="font-mono text-[11px] font-bold uppercase">{formatWeekday(d, "narrow")}</span>
                <span className="font-display text-xl leading-none">{dayNumber(d)}</span>
                <span aria-hidden className="flex h-2 items-center gap-[3px]">
                  {here.slice(0, 3).map((s) => (
                    <span
                      key={s.id}
                      className={`size-2 rounded-full ${s.status === "open" ? (isSel ? "bg-gold-ink" : "bg-gold") : isSel ? "bg-accent-ink" : "bg-accent"}`}
                    />
                  ))}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      <p className="flex gap-4 font-mono text-[11px] uppercase tracking-wide text-ink-muted">
        <span className="flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-full bg-gold" /> Open</span>
        <span className="flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-full bg-accent" /> Booked</span>
      </p>
    </section>
  );
}
