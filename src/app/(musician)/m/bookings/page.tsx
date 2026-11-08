import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { formatUsd } from "@/lib/money";
import { getMyApplications, getMyBookings } from "@/lib/musician/data";
import { withdrawApplication } from "@/app/(musician)/m/actions";
import { GigRow } from "@/components/musician/gig-row";
import { FormMessage } from "@/components/ui/form-message";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "Bookings | GiGmate" };

type Tab = "confirmed" | "applied" | "completed";

function EmptyState({ title, body, href, cta }: { title: string; body: string; href: string; cta: string }) {
  return (
    <section className="rounded-2xl border-2 border-dashed border-ink p-5">
      <h2 className="font-display text-3xl uppercase leading-none">{title}</h2>
      <p className="mt-2 text-base text-ink-muted">{body}</p>
      <Link href={href} className="mt-4 inline-flex min-h-12 items-center rounded-full bg-gold px-6 font-display text-lg uppercase tracking-wide text-gold-ink">
        {cta}
      </Link>
    </section>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/m/bookings">["searchParams"] }) {
  const profile = await requireRole("musician");
  const sp = await searchParams;
  const [apps, bookings] = await Promise.all([getMyApplications(profile.id), getMyBookings(profile.id)]);

  const confirmed = bookings.filter((b) => !b.completed_at && !b.cancelled_at).sort((a, b) => a.slot.starts_at.localeCompare(b.slot.starts_at));
  const cancelled = bookings.filter((b) => b.cancelled_at).sort((a, b) => b.slot.starts_at.localeCompare(a.slot.starts_at));
  const completed = bookings.filter((b) => b.completed_at).sort((a, b) => b.slot.starts_at.localeCompare(a.slot.starts_at));
  const order = { pending: 0, declined: 1, withdrawn: 2, accepted: 3 } as const;
  const applied = [...apps].sort((a, b) => order[a.status] - order[b.status] || a.slot.starts_at.localeCompare(b.slot.starts_at));

  const wanted = sp.tab === "applied" || sp.tab === "confirmed" || sp.tab === "completed" ? (sp.tab as Tab) : undefined;
  const tab: Tab = wanted ?? (confirmed.length > 0 ? "confirmed" : "applied");

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "confirmed", label: "Confirmed", count: confirmed.length },
    { id: "applied", label: "Applied", count: applied.filter((a) => a.status === "pending").length },
    { id: "completed", label: "Played", count: completed.length },
  ];

  return (
    <div className="flex flex-col gap-5 px-5 pt-5">
      <header>
        <h1 className="font-display text-[40px] uppercase leading-none">Bookings</h1>
        <p className="mt-2 text-base text-ink-muted">Your gigs, from first tap to the last song.</p>
      </header>

      {sp.withdrawn === "1" && <FormMessage message="Application withdrawn. The venue will no longer see it." />}

      <nav aria-label="Bookings sections" className="grid grid-cols-3 gap-2">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`/m/bookings?tab=${t.id}`}
            aria-current={t.id === tab ? "page" : undefined}
            className={`flex min-h-14 flex-col items-center justify-center rounded-xl border-2 border-ink px-1 font-mono text-[11px] font-bold uppercase tracking-wide ${t.id === tab ? "bg-panel text-panel-ink" : ""}`}
          >
            {t.label}
            <span className="font-display text-xl leading-none">{t.count}</span>
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-4">
        {tab === "confirmed" &&
          (confirmed.length === 0 ? (
            <EmptyState title="Nothing booked yet" body="When a venue says yes, the gig lands here with the address and the pay." href="/m/discover" cta="Find a gig" />
          ) : (
            confirmed.map((b) => (
              <GigRow
                key={b.id}
                startsAt={b.slot.starts_at}
                setLength={b.slot.set_length_min}
                payCents={b.agreed_pay_cents}
                venue={b.slot.venue}
                genre={b.slot.genre}
                badge="Confirmed"
                badgeTone="good"
                showAddress
                note={`Pay of ${formatUsd(b.agreed_pay_cents)} is settled directly with the venue.`}
              />
            ))
          ))}

        {tab === "confirmed" && cancelled.length > 0 && (
          <section aria-label="Cancelled by the venue" className="flex flex-col gap-4">
            <h2 className="mt-2 font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-ink-muted">Cancelled by the venue</h2>
            {cancelled.map((b) => (
              <GigRow
                key={b.id}
                startsAt={b.slot.starts_at}
                setLength={b.slot.set_length_min}
                payCents={b.agreed_pay_cents}
                venue={b.slot.venue}
                genre={b.slot.genre}
                badge="Cancelled"
                badgeTone="muted"
                note={b.cancelled_late ? "The venue cancelled less than 48 hours before the gig. That is recorded on their profile." : "The venue cancelled this gig in good time. Plenty more in Discover."}
              />
            ))}
          </section>
        )}

        {tab === "applied" &&
          (applied.length === 0 ? (
            <EmptyState title="No applications yet" body="Tap Apply on any gig in Discover. The venue sees your press kit and answers here." href="/m/discover" cta="Find a gig" />
          ) : (
            applied.map((a) => (
              <GigRow
                key={a.id}
                startsAt={a.slot.starts_at}
                setLength={a.slot.set_length_min}
                payCents={a.slot.pay_cents}
                venue={a.slot.venue}
                genre={a.slot.genre}
                badge={a.status === "pending" ? "Waiting" : a.status === "declined" ? "Not chosen" : "Withdrawn"}
                badgeTone={a.status === "pending" ? "neutral" : "muted"}
                note={a.status === "declined" ? "The venue picked another act this time. Plenty more gigs in Discover." : undefined}
                action={
                  a.status === "pending" ? (
                    <details className="rounded-xl border-2 border-line p-3">
                      <summary className="flex min-h-11 cursor-pointer items-center font-mono text-[12px] font-bold uppercase tracking-wide text-brick">Withdraw application</summary>
                      <p className="mb-3 text-sm">The venue will no longer see you for this gig, and you cannot re-apply to it.</p>
                      <form action={withdrawApplication.bind(null, a.id)}>
                        <SubmitButton variant="outline" pendingText="Withdrawing...">Yes, withdraw</SubmitButton>
                      </form>
                    </details>
                  ) : undefined
                }
              />
            ))
          ))}

        {tab === "completed" &&
          (completed.length === 0 ? (
            <EmptyState title="No finished gigs yet" body="After a show, the venue marks it done and you can both leave a review." href="/m/discover" cta="Find your first gig" />
          ) : (
            completed.map((b) => (
              <GigRow
                key={b.id}
                startsAt={b.slot.starts_at}
                setLength={b.slot.set_length_min}
                payCents={b.agreed_pay_cents}
                venue={b.slot.venue}
                genre={b.slot.genre}
                badge="Played"
                badgeTone="muted"
                note="Reviews for this gig open soon."
              />
            ))
          ))}
      </div>
    </div>
  );
}

export default function BookingsPage(props: PageProps<"/m/bookings">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}
