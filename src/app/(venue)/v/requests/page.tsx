import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { dayOf, formatDay, formatTime } from "@/lib/dates";
import { formatUsd } from "@/lib/money";
import { getPendingRequests } from "@/lib/venue/data";
import type { PendingRequest } from "@/lib/types";
import { ComingSoon } from "@/components/ui/coming-soon";
import { FormMessage } from "@/components/ui/form-message";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { RequestCard } from "@/components/venue/request-card";

export const metadata = { title: "Requests | GiGmate" };

const ERRORS: Record<string, string> = {
  closed: "That gig was already booked, so we could not accept another act.",
  answered: "You already answered that application.",
  gone: "That application is no longer there. The musician may have withdrawn.",
  notyours: "You can only answer applications for your own gigs.",
  pick: "Tick Compare on exactly two musicians first, then tap the compare button.",
  other: "We could not accept that act. Please try again.",
};

async function Content({ searchParams }: { searchParams: PageProps<"/v/requests">["searchParams"] }) {
  const profile = await requireRole("venue");
  const sp = await searchParams;
  const requests = await getPendingRequests(profile.id);

  const groups = new Map<string, PendingRequest[]>();
  for (const r of requests) groups.set(r.slot.id, [...(groups.get(r.slot.id) ?? []), r]);

  const errorText = typeof sp.error === "string" ? (ERRORS[sp.error] ?? ERRORS.other) : undefined;

  return (
    <div className="flex flex-col gap-6 px-5 pt-5">
      <header>
        <h1 className="font-display text-[34px] uppercase leading-none">Requests</h1>
        <p className="mt-2 text-base text-ink-muted">
          {requests.length === 0 ? "Nothing waiting for you." : `${requests.length} musician${requests.length === 1 ? "" : "s"} waiting on a yes or no.`}
        </p>
      </header>

      <FormMessage error={errorText} />

      {requests.length === 0 && (
        <div className="-mx-5">
          <ComingSoon
            title="No requests yet"
            body="When musicians apply to your slots, they show up here so you can compare them and book one."
            nextHref="/v/calendar"
            nextLabel="Go to calendar"
          />
        </div>
      )}

      {[...groups.entries()].map(([slotId, list]) => {
        const slot = list[0].slot;
        const formId = `compare-${slotId}`;
        const canCompare = list.length >= 2;
        return (
          <section key={slotId} aria-labelledby={`h-${slotId}`} className="flex flex-col gap-3">
            <div className="flex items-end justify-between gap-3 border-b-2 border-ink pb-2">
              <div>
                <h2 id={`h-${slotId}`} className="font-display text-2xl uppercase leading-none">
                  {formatDay(dayOf(slot.starts_at))}, {formatTime(slot.starts_at)}
                </h2>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-ink-muted">
                  {slot.genre ?? "Any genre"} · {formatUsd(slot.pay_cents)} · {list.length} applied
                </p>
              </div>
            </div>

            {list.map((r) => (
              <RequestCard key={r.id} applicationId={r.id} musician={r.musician} compareFormId={canCompare ? formId : undefined} />
            ))}

            {canCompare && (
              <form id={formId} action="/v/requests/compare" method="get">
                <button
                  type="submit"
                  className="flex min-h-12 w-full items-center justify-center rounded-full border-2 border-ink px-6 font-display text-lg uppercase tracking-wide"
                >
                  Compare 2 side by side
                </button>
                <p className="mt-2 text-sm text-ink-muted">Tick Compare on two musicians first.</p>
              </form>
            )}
          </section>
        );
      })}
    </div>
  );
}

export default function RequestsPage(props: PageProps<"/v/requests">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}
