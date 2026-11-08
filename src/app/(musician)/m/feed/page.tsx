import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { formatMonthDay, todayLocal, weekStartOf } from "@/lib/dates";
import { APPLY_MESSAGES } from "@/lib/musician/messages";
import { getMySubscription } from "@/lib/musician/subscription";
import { getFeaturedSlot, getPendingCount, getRecentPosts } from "@/lib/musician/data";
import { AppHeader } from "@/components/musician/app-header";
import { FeedSkeleton } from "@/components/musician/feed-skeleton";
import { PostCard } from "@/components/musician/post-card";
import { SlotTicket } from "@/components/musician/slot-ticket";
import { FormMessage } from "@/components/ui/form-message";

export const metadata = { title: "Feed | GiGmate" };

/*
  Everything here depends on who is signed in and on live data, so it renders at
  request time inside <Suspense>. The skeleton paints instantly while it loads.
  Tradeoff: one render step per visit, in exchange for fresh, per-user content.
*/
async function FeedContent({ searchParams }: { searchParams: PageProps<"/m/feed">["searchParams"] }) {
  const profile = await requireRole("musician");
  const sp = await searchParams;
  const [featured, pending, posts, plan] = await Promise.all([getFeaturedSlot(profile.id), getPendingCount(profile.id), getRecentPosts(), getMySubscription(profile.id)]);
  const result = typeof sp.apply === "string" ? APPLY_MESSAGES[sp.apply] : undefined;

  return (
    <>
      <AppHeader city={`${profile.city}, OH`} weekOf={formatMonthDay(weekStartOf(todayLocal()))} pending={pending} />
      <div className="mt-5 flex flex-col gap-6 px-5">
        {result && <FormMessage error={result.error} message={result.message} />}

        {featured ? (
          <SlotTicket slot={featured} returnTo="/m/feed" compact={false} canApply={plan.active} />
        ) : (
          <section className="rounded-2xl border-2 border-dashed border-ink p-5">
            <h2 className="font-display text-3xl uppercase leading-none">No open gigs right now</h2>
            <p className="mt-2 text-base text-ink-muted">New slots show up here first. Check back soon, or fill in your press kit so venues find you.</p>
            <Link href="/m/profile" className="mt-4 inline-flex min-h-12 items-center rounded-full bg-gold px-6 font-display text-lg uppercase tracking-wide text-gold-ink">
              Update my press kit
            </Link>
          </section>
        )}

        {featured && (
          <Link href="/m/discover" className="flex min-h-12 items-center justify-center rounded-full border-2 border-ink px-6 font-display text-lg uppercase tracking-wide">
            See all open gigs
          </Link>
        )}

        <section aria-label="From the scene" className="flex flex-col gap-5">
          <h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-ink-muted">From the scene</h2>
          {posts.length === 0 ? (
            <p className="rounded-2xl border-2 border-dashed border-line p-5 text-base text-ink-muted">
              No posts yet. Gig announcements and clips from local musicians and venues will show up here, newest first.
            </p>
          ) : (
            posts.map((p) => <PostCard key={p.id} post={p} />)
          )}
        </section>
      </div>
    </>
  );
}

export default function FeedPage(props: PageProps<"/m/feed">) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <FeedContent searchParams={props.searchParams} />
    </Suspense>
  );
}
