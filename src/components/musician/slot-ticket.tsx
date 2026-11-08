import Link from "next/link";
import { Check } from "lucide-react";
import { applyToSlot } from "@/app/(musician)/m/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { dayNumber, dayOf, formatMonthShort, formatTimeRange, formatWeekday } from "@/lib/dates";
import { formatUsd } from "@/lib/money";
import { isBoosted } from "@/lib/pricing";
import type { OpenSlot } from "@/lib/types";
import { GigTicket } from "./gig-ticket";

/** Turns a real slot into what the ticket card needs to show. */
export function slotToTicket(slot: OpenSlot) {
  const date = dayOf(slot.starts_at);
  const where = [slot.venue.name, slot.venue.neighborhood].filter(Boolean).join(" · ");
  const gear = slot.gear_provided.length ? ` · ${slot.gear_provided.join(", ")}` : "";
  const boosted = isBoosted(slot.boosted_until);
  const { late_cancellations: late, gigs_hosted: hosted } = slot.venue;
  // Reliability: shown only once the venue has any history, so a brand-new venue is not unfairly marked.
  const reliability =
    late === null && hosted === null
      ? null
      : late === 0
        ? `Never cancelled late${hosted ? ` · ${hosted} gig${hosted === 1 ? "" : "s"} hosted` : ""}`
        : `Cancelled late ${late} time${late === 1 ? "" : "s"}${hosted ? ` · ${hosted} gig${hosted === 1 ? "" : "s"} hosted` : ""}`;
  return {
    id: slot.id,
    eyebrow: slot.is_urgent ? "Tonight, urgent" : boosted ? "Boosted" : "Now booking",
    title: slot.genre ? `${slot.genre} act wanted` : "Act wanted",
    lines: [where, `${formatTimeRange(slot.starts_at, slot.set_length_min)} / ${formatUsd(slot.pay_cents)}`, `${slot.set_length_min} min set${gear}`, ...(reliability ? [reliability] : [])],
    weekday: formatWeekday(date).toUpperCase(),
    day: dayNumber(date),
    month: formatMonthShort(date),
  };
}

const pill = "inline-flex min-h-14 items-center gap-2 rounded-full px-8 font-display text-xl uppercase tracking-wide";

/* One-tap apply. The button state follows what the database says about this
   musician and this gig, so a gig can never be applied to twice by accident. */
export function ApplyControl({ slot, returnTo, canApply = true }: { slot: OpenSlot; returnTo: string; canApply?: boolean }) {
  switch (slot.my_status) {
    case null:
      // No plan yet: browsing is free, applying is the paid part. Send them to pick a plan.
      if (!canApply) {
        return (
          <Link href="/m/subscribe" className={`${pill} bg-gold text-gold-ink`}>
            Subscribe to apply
          </Link>
        );
      }
      return (
        <form action={applyToSlot.bind(null, slot.id, returnTo)}>
          <SubmitButton pendingText="Applying..." fullWidth={false} label={`Apply to ${slot.venue.name}`}>
            Apply
          </SubmitButton>
        </form>
      );
    case "pending":
      return (
        <span className={`${pill} border-2 border-panel-ink text-panel-ink`}>
          <Check size={22} strokeWidth={3} aria-hidden /> Applied
        </span>
      );
    case "accepted":
      return (
        <Link href="/m/bookings?tab=confirmed" className={`${pill} bg-gold text-gold-ink`}>
          <Check size={22} strokeWidth={3} aria-hidden /> Confirmed
        </Link>
      );
    case "declined":
      return <span className={`${pill} border-2 border-panel-ink/50 text-panel-ink/70`}>Not chosen</span>;
    case "withdrawn":
      return <span className={`${pill} border-2 border-panel-ink/50 text-panel-ink/70`}>Withdrawn</span>;
  }
}

export function SlotTicket({ slot, returnTo, compact = true, canApply = true }: { slot: OpenSlot; returnTo: string; compact?: boolean; canApply?: boolean }) {
  return <GigTicket gig={slotToTicket(slot)} compact={compact} action={<ApplyControl slot={slot} returnTo={returnTo} canApply={canApply} />} />;
}
