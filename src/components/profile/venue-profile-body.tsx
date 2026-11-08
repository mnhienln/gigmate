import type { VenueView } from "@/lib/types";
import { PostGrid } from "./post-grid";
import { toGridPosts } from "./profile-body";
import { ShopGrid } from "./shop-grid";
import type { VenueTab } from "./profile-tabs";

const Empty = ({ children }: { children: string }) => (
  <p className="mx-5 rounded-2xl border-2 border-dashed border-line p-5 text-base text-ink-muted">{children}</p>
);

/** The content under a VENUE's tabs: Photos, Videos or the merch Shop. */
export function VenueProfileBody({ view, tab, isOwner }: { view: VenueView; tab: VenueTab; isOwner: boolean }) {
  if (tab === "shop") {
    return (
      <ShopGrid
        products={view.products}
        emptyHint={isOwner ? "Your shop is empty. Tap Edit profile to add merch like shirts, glasses or gift cards." : `${view.display_name} has no merch yet.`}
      />
    );
  }
  const kind = tab === "videos" ? "video" : "image";
  const posts = view.posts.filter((p) => p.media_type === kind);
  if (posts.length === 0) {
    const noun = kind === "video" ? "videos" : "photos";
    return <Empty>{isOwner ? `No ${noun} yet. Tap Edit profile, then New post, to share your first one.` : `${view.display_name} has not shared ${noun} yet.`}</Empty>;
  }
  return <PostGrid posts={toGridPosts(posts)} />;
}
