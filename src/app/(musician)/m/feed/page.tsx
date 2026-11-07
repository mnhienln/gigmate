import { Suspense } from "react";
import { connection } from "next/server";
import { AppHeader } from "@/components/musician/app-header";
import { FeedSkeleton } from "@/components/musician/feed-skeleton";
import { GigTicket } from "@/components/musician/gig-ticket";
import { PostCard } from "@/components/musician/post-card";
import {
  demoFeaturedGig,
  demoHeader,
  demoPost,
  weekOfLabel,
} from "@/lib/demo-data";

export const metadata = { title: "Feed | GigMate" };

/*
  Cache Components rule: anything that depends on the request (the current
  date today, the signed-in user and database rows soon) must not be baked
  into the static shell. `await connection()` opts this component into
  request-time rendering, and the <Suspense> boundary below lets the rest of
  the page (and the skeleton) paint immediately.
  Tradeoff: one extra render step per visit, in exchange for always-fresh,
  per-user content with an instant first paint.
*/
async function FeedContent() {
  await connection();

  return (
    <>
      <AppHeader
        city={demoHeader.city}
        weekOf={weekOfLabel()}
        requests={demoHeader.requests}
      />
      <div className="mt-5 flex flex-col gap-6 px-5">
        <GigTicket gig={demoFeaturedGig} />
        <PostCard post={demoPost} />
      </div>
    </>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <FeedContent />
    </Suspense>
  );
}
