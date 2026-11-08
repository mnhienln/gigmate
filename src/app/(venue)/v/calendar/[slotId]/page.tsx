import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { dayOf, formatDay, formatTime, formatTimeRange } from "@/lib/dates";
import { formatUsd } from "@/lib/money";
import { BOOST, CANCEL, isBoosted, isLateCancellation } from "@/lib/pricing";
import { getSlot } from "@/lib/venue/data";
import { cancelSlot, markGigHappened } from "@/app/(venue)/v/actions";
import { cancelGig, startBoost } from "@/app/(venue)/v/payments-actions";
import { FormMessage } from "@/components/ui/form-message";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { SubmitButton } from "@/components/ui/submit-button";
import { StatusBadge } from "@/components/venue/slot-card";

export const metadata = { title: "Gig | GiGmate" };

async function Content({ params, searchParams }: { params: PageProps<"/v/calendar/[slotId]">["params"]; searchParams: PageProps<"/v/calendar/[slotId]">["searchParams"] }) {
  const profile = await requireRole("venue");
  const { slotId } = await params;
  const sp = await searchParams;

  const slot = await getSlot(profile.id, slotId).catch(() => null);
  if (!slot) notFound();

  const day = dayOf(slot.starts_at);
  const boostedUntil = isBoosted(slot.boosted_until) ? slot.boosted_until : null;
  const late = isLateCancellation(slot.starts_at);

  return (
    <div className="flex flex-col gap-5 px-5 pt-5">
      <Link href={`/v/calendar?day=${day}`} className="-ml-2 flex min-h-11 w-fit items-center gap-1 px-2 font-mono text-[12px] font-bold uppercase tracking-wide">
        <ChevronLeft size={18} aria-hidden /> Calendar
      </Link>

      {sp.boost === "success" && <FormMessage message="Payment received. Your gig will show first in Discover as soon as Stripe confirms, usually within seconds." />}
      {sp.boost === "cancelled" && <FormMessage message="No problem. You were not charged." />}
      {sp.boost === "closed" && <FormMessage error="That gig can no longer be boosted. It is booked, cancelled or already started." />}
      {sp.boost === "error" && <FormMessage error="We could not open the payment page. You were not charged. Please try again." />}
      {sp.cancelled === "free" && <FormMessage message="Gig cancelled at no charge. The musician can see it in their bookings." />}
      {sp.cancelled === "paid" && <FormMessage message="Payment received. We are cancelling the gig now, which takes a few seconds. Refresh to see it." />}
      {sp.cancelled === "no" && <FormMessage message="No problem. Your gig is still booked and you were not charged." />}
      {sp.cancelled === "error" && <FormMessage error="We could not cancel that gig. You were not charged. Please try again." />}
      {sp.accepted === "1" && <FormMessage message="Booked. The musician has been confirmed and the other applicants were declined." />}
      {sp.error === "complete" && <FormMessage error="We could not mark that gig as finished. Please try again." />}

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge slot={slot} />
          {slot.is_urgent && slot.status === "open" && (
            <span className="inline-flex min-h-7 items-center rounded-full bg-brick px-3 font-mono text-[11px] font-bold uppercase tracking-wide text-brick-ink">Tonight</span>
          )}
        </div>
        <h1 className="font-display text-[34px] uppercase leading-none">{slot.genre ?? "Any genre"}</h1>
        <p className="text-lg">{formatDay(day)}</p>
        <p className="font-mono text-[13px] uppercase tracking-wide text-ink-muted">{formatTimeRange(slot.starts_at, slot.set_length_min)}</p>
      </header>

      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border-2 border-line bg-panel p-4">
          <dt className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-muted">Pay</dt>
          <dd className="font-display text-3xl leading-none">{formatUsd(slot.pay_cents)}</dd>
        </div>
        <div className="rounded-2xl border-2 border-line bg-panel p-4">
          <dt className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-muted">Set length</dt>
          <dd className="font-display text-3xl leading-none">{slot.set_length_min} min</dd>
        </div>
      </dl>

      {slot.gear_provided.length > 0 && (
        <p className="text-base"><span className="font-bold">Gear provided:</span> {slot.gear_provided.join(", ")}</p>
      )}
      {slot.notes && <p className="text-base text-ink-muted">{slot.notes}</p>}

      {slot.status === "open" && (
        <section className="flex flex-col gap-3">
          <Link
            href="/v/requests"
            className="flex min-h-14 items-center justify-center rounded-full bg-gold px-8 font-display text-xl uppercase tracking-wide text-gold-ink"
          >
            {slot.pending_count > 0 ? `Review ${slot.pending_count} request${slot.pending_count === 1 ? "" : "s"}` : "See requests"}
          </Link>
          {slot.pending_count === 0 && <p className="text-sm text-ink-muted">No applications yet. Musicians nearby can see this slot and apply in one tap.</p>}
          <section aria-label="Boost this gig" className="flex flex-col gap-3 rounded-2xl border-2 border-gold bg-panel p-4">
            <p className="font-display text-2xl uppercase leading-none">{boostedUntil ? "Boosted" : "Boost this gig"}</p>
            {boostedUntil ? (
              <p className="text-base">Showing first in Discover until <span className="font-bold">{formatDay(dayOf(boostedUntil))}, {formatTime(boostedUntil)}</span>. You can add another {BOOST.hours} hours.</p>
            ) : (
              <p className="text-base">Show this gig at the top of every musician&apos;s Discover for {BOOST.hours} hours, marked Boosted. Good for filling a night fast.</p>
            )}
            <form action={startBoost.bind(null, slot.id)}>
              <SubmitButton variant="outline" pendingText="Opening payment..." label={`Boost this gig for ${formatUsd(BOOST.cents)}`}>
                {boostedUntil ? "Add" : "Boost for"} {formatUsd(BOOST.cents)}
              </SubmitButton>
            </form>
          </section>
          <details className="rounded-2xl border-2 border-line bg-panel p-4">
            <summary className="flex min-h-11 cursor-pointer items-center font-mono text-[12px] font-bold uppercase tracking-wide text-brick">Cancel this slot</summary>
            <p className="mb-3 text-base">This removes the slot and any applications on it. This cannot be undone.</p>
            <form action={cancelSlot.bind(null, slot.id)}>
              <SubmitButton variant="outline" pendingText="Cancelling...">Yes, cancel the slot</SubmitButton>
            </form>
          </details>
        </section>
      )}

      {slot.status === "booked" && slot.booking && (
        <section className="flex flex-col gap-3 rounded-2xl border-2 border-accent bg-panel p-4">
          <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-muted">Booked act</p>
          <p className="font-display text-3xl leading-none">{slot.booking.musician_name}</p>
          <p className="text-sm text-ink-muted">Pay of {formatUsd(slot.pay_cents)} is settled directly between you and the act.</p>
          <form action={markGigHappened.bind(null, slot.booking.id, slot.id)}>
            <SubmitButton pendingText="Saving...">Gig happened</SubmitButton>
          </form>
          <p className="text-sm text-ink-muted">Tap this after the show. It lets you and the act leave reviews.</p>
          <details className="rounded-2xl border-2 border-line p-4">
            <summary className="flex min-h-11 cursor-pointer items-center font-mono text-[12px] font-bold uppercase tracking-wide text-brick">Cancel this gig</summary>
            {late ? (
              <p className="mb-3 text-base">
                This gig starts in under {CANCEL.windowHours} hours, so cancelling costs <span className="font-bold">{formatUsd(CANCEL.feeCents)}</span>. It is also counted on your public profile as a late cancellation.
              </p>
            ) : (
              <p className="mb-3 text-base">Cancelling is free because the gig is {CANCEL.windowHours} hours or more away. {slot.booking.musician_name} will see it in their bookings.</p>
            )}
            <form action={cancelGig.bind(null, slot.booking.id)}>
              <SubmitButton variant="outline" pendingText="Working..." label={late ? `Pay ${formatUsd(CANCEL.feeCents)} and cancel the gig` : "Yes, cancel the gig"}>
                {late ? `Pay ${formatUsd(CANCEL.feeCents)} and cancel` : "Yes, cancel the gig"}
              </SubmitButton>
            </form>
          </details>
        </section>
      )}

      {slot.status === "completed" && slot.booking && (
        <section className="rounded-2xl border-2 border-line bg-panel p-4">
          <p className="font-display text-2xl leading-none">{slot.booking.musician_name} played this night.</p>
          <p className="mt-2 text-sm text-ink-muted">Reviews for this gig open soon.</p>
        </section>
      )}
    </div>
  );
}

export default function SlotPage(props: PageProps<"/v/calendar/[slotId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
