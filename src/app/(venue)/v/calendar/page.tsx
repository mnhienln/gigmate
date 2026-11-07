import { Suspense } from "react";
import Link from "next/link";
import { Plus, Zap } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { dayOf, formatDay, isDateString, todayLocal, weekStartOf } from "@/lib/dates";
import { getWeekSlots } from "@/lib/venue/data";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { SlotCard } from "@/components/venue/slot-card";
import { WeekStrip } from "@/components/venue/week-strip";

export const metadata = { title: "Calendar | GigMate" };

async function CalendarContent({ searchParams }: { searchParams: PageProps<"/v/calendar">["searchParams"] }) {
  const profile = await requireRole("venue");
  const sp = await searchParams;
  const today = todayLocal();
  const selected = typeof sp.day === "string" && isDateString(sp.day) ? sp.day : today;
  const weekStart = weekStartOf(selected);

  const slots = await getWeekSlots(profile.id, weekStart);
  const todays = slots.filter((s) => dayOf(s.starts_at) === selected);
  const openCount = slots.filter((s) => s.status === "open").length;
  const bookedCount = slots.filter((s) => s.status === "booked" || s.status === "completed").length;
  const waiting = slots.reduce((n, s) => n + s.pending_count, 0);

  return (
    <div className="flex flex-col gap-5 px-5 pt-5">
      <header>
        <p className="font-mono text-[12px] uppercase tracking-wide text-ink-muted">{profile.display_name}</p>
        <h1 className="font-display text-[34px] uppercase leading-none">Your calendar</h1>
        <p className="mt-2 text-base text-ink-muted">
          {openCount} open, {bookedCount} booked this week
          {waiting > 0 && (
            <>
              {" "}
              ·{" "}
              <Link href="/v/requests" className="font-bold text-gold underline underline-offset-4">
                {waiting} waiting for you
              </Link>
            </>
          )}
        </p>
      </header>

      <Link
        href={`/v/calendar/new?date=${selected}`}
        className="flex min-h-14 items-center justify-center gap-2 rounded-full bg-gold px-8 font-display text-xl uppercase tracking-wide text-gold-ink active:scale-[0.98]"
      >
        <Plus size={22} strokeWidth={2.5} aria-hidden />
        Post a gig
      </Link>

      <Link
        href="/v/calendar/tonight"
        className="flex min-h-14 items-center gap-3 rounded-2xl border-2 border-brick bg-brick/10 px-4 py-3 text-brick active:scale-[0.99]"
      >
        <Zap size={24} aria-hidden className="shrink-0" />
        <span>
          <span className="block font-display text-lg uppercase leading-tight tracking-wide">Need an act tonight?</span>
          <span className="block text-sm">Post an urgent slot. Musicians who are free get it first.</span>
        </span>
      </Link>

      <WeekStrip weekStart={weekStart} selected={selected} slots={slots} />

      <section aria-label={formatDay(selected)} className="flex flex-col gap-3">
        <h2 className="font-display text-2xl uppercase leading-none">{formatDay(selected)}</h2>
        {todays.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-line p-5 text-base text-ink-muted">
            Nothing posted for this day. An empty night is lost income, so post a gig and musicians nearby will see it.
          </p>
        ) : (
          todays.map((s) => <SlotCard key={s.id} slot={s} />)
        )}
      </section>
    </div>
  );
}

export default function CalendarPage(props: PageProps<"/v/calendar">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CalendarContent searchParams={props.searchParams} />
    </Suspense>
  );
}
