import { dayOf, formatDay } from "@/lib/dates";
import { PHOTOS, VIDEOS, publicUrl } from "@/lib/storage";
import type { ProfilePost, ProfileView } from "@/lib/types";
import { MusicLinks } from "./music-links";
import { PostGrid, type GridPost } from "./post-grid";
import type { MusicianTab } from "./profile-tabs";

export function toGridPosts(posts: ProfilePost[]): GridPost[] {
  return posts.map((p) => ({
    id: p.id,
    type: p.media_type,
    src: publicUrl(p.media_type === "video" ? VIDEOS : PHOTOS, p.media_path),
    poster: p.poster_path ? publicUrl(PHOTOS, p.poster_path) : null,
    caption: p.body,
    date: formatDay(dayOf(p.created_at)),
  }));
}

/** The content under a MUSICIAN's tabs (Posts or Music). Shared by their own profile and the venue's view of it. */
export function ProfileBody({ view, tab, isOwner }: { view: ProfileView; tab: MusicianTab; isOwner: boolean }) {
  if (tab === "music") {
    return (
      <MusicLinks
        links={view.links}
        emptyHint={isOwner ? "No music links yet. Tap Edit profile and paste your Spotify, YouTube or SoundCloud page." : `${view.display_name} has not added music links yet.`}
      />
    );
  }
  if (view.posts.length === 0) {
    return (
      <p className="mx-5 rounded-2xl border-2 border-dashed border-line p-5 text-base text-ink-muted">
        {isOwner ? "No posts yet. Tap the + button below to share your first photo or video." : `${view.display_name} has not posted yet.`}
      </p>
    );
  }
  return <PostGrid posts={toGridPosts(view.posts)} />;
}
