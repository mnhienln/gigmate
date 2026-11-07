import Link from "next/link";
import { formatTime, formatTimeRange } from "@/lib/dates";
import { formatUsd } from "@/lib/money";
import type { WeekSlot } from "@/lib/types";

export function StatusBadge({ slot }: { slot: WeekSlot }) {
  let text = "Open";
  let style = "border-line text-ink-muted";
  if (slot.status === "open" && slot.pending_count > 0) {
    text = `${slot.pending_count} applied`;
    style = "border-gold bg-gold text-gold-ink";
  } else if (slot.status === "booked") {
    text = "Booked";
    style = "border-accent bg-accent text-accent-ink";
  } else if (slot.status === "completed") {
    text = "Done";
    style = "border-line bg-line text-ink";
  }
  return (
    <span className={`inline-flex min-h-7 items-center rounded-full border-2 px-3 font-mono text-[11px] font-bold uppercase tracking-wide ${style}`}>
      {text}
    </span>
  );
}

export function SlotCard({ slot }: { slot: WeekSlot }) {
  return (
    <Link
      href={`/v/calendar/${slot.id}`}
      className="flex min-h-[84px] items-center gap-4 rounded-2xl border-2 border-line bg-panel p-4 text-panel-ink active:scale-[0.99]"
    >
      <div className="w-[76px] shrink-0">
        <p className="font-display text-2xl leading-none">{formatTime(slot.starts_at).replace(" ", " ")}</p>
        <p className="mt-1 font-mono text-[11px] uppercase text-ink-muted">{slot.set_length_min} min</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold">{slot.status === "booked" || slot.status === "completed" ? (slot.booking?.musician_name ?? "Booked") : (slot.genre ?? "Any genre")}</p>
        <p className="font-mono text-[12px] uppercase tracking-wide text-ink-muted">
          {formatUsd(slot.pay_cents)} · ends {formatTimeRange(slot.starts_at, slot.set_length_min).split(" to ")[1]}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {slot.is_urgent && slot.status === "open" && (
          <span className="inline-flex min-h-6 items-center rounded-full bg-brick px-2.5 font-mono text-[10px] font-bold uppercase tracking-wide text-brick-ink">
            Tonight
          </span>
        )}
        <StatusBadge slot={slot} />
      </div>
    </Link>
  );
}
