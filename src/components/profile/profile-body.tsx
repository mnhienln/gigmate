import { dayOf, formatDay } from "@/lib/dates";
import { PHOTOS, VIDEOS, publicUrl } from "@/lib/storage";
import type { ProfileView } from "@/lib/types";
import { MusicLinks } from "./music-links";
import { PostGrid, type GridPost } from "./post-grid";
import type { ProfileTab } from "./profile-tabs";
import { ShopGrid } from "./shop-grid";

/** The content under the tabs. Shared by the musician's own profile and the venue's view of it. */
export function ProfileBody({ view, tab, isOwner }: { view: ProfileView; tab: ProfileTab; isOwner: boolean }) {
  if (tab === "music") {
    return (
      <MusicLinks
        links={view.links}
        emptyHint={isOwner ? "No music links yet. Tap Edit profile and paste your Spotify, YouTube or SoundCloud page." : `${view.display_name} has not added music links yet.`}
      />
    );
  }
  if (tab === "shop") {
    return (
      <ShopGrid
        products={view.products}
        emptyHint={isOwner ? "Your shop is empty. Tap Edit profile to add merch with a photo, price and buy link." : `${view.display_name} has no merch yet.`}
      />
    );
  }
  const posts: GridPost[] = view.posts.map((p) => ({
    id: p.id,
    type: p.media_type,
    src: publicUrl(p.media_type === "video" ? VIDEOS : PHOTOS, p.media_path),
    poster: p.poster_path ? publicUrl(PHOTOS, p.poster_path) : null,
    caption: p.body,
    date: formatDay(dayOf(p.created_at)),
  }));
  if (posts.length === 0) {
    return (
      <p className="mx-5 rounded-2xl border-2 border-dashed border-line p-5 text-base text-ink-muted">
        {isOwner ? "No posts yet. Tap the + button below to share your first photo or video." : `${view.display_name} has not posted yet.`}
      </p>
    );
  }
  return <PostGrid posts={posts} />;
}
