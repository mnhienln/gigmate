import Link from "next/link";
import type { ProfileView, VenueView } from "@/lib/types";

export type TabItem = { id: string; label: string; count: number };

/* Musician: Posts | Music. Venue: Photos | Videos | Shop. The musician profile has NO shop. */
export type MusicianTab = "posts" | "music";
export type VenueTab = "photos" | "videos" | "shop";

export const parseMusicianTab = (v: unknown): MusicianTab => (v === "music" ? "music" : "posts");
export const parseVenueTab = (v: unknown): VenueTab => (v === "videos" || v === "shop" ? v : "photos");

export const musicianTabs = (view: ProfileView): TabItem[] => [
  { id: "posts", label: "Posts", count: view.posts.length },
  { id: "music", label: "Music", count: view.links.length },
];

export const venueTabs = (view: VenueView): TabItem[] => [
  { id: "photos", label: "Photos", count: view.posts.filter((p) => p.media_type === "image").length },
  { id: "videos", label: "Videos", count: view.posts.filter((p) => p.media_type === "video").length },
  { id: "shop", label: "Shop", count: view.products.length },
];

/* The tabs are links (?tab=videos), so each view is a real address: no JavaScript needed,
   the back button works, and someone can be sent straight to a tab. */
export function ProfileTabs({ basePath, tab, items }: { basePath: string; tab: string; items: TabItem[] }) {
  return (
    <nav aria-label="Profile sections" className={`mt-5 grid border-y-2 border-ink ${items.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
      {items.map((t) => (
        <Link
          key={t.id}
          href={`${basePath}?tab=${t.id}`}
          aria-current={t.id === tab ? "page" : undefined}
          className={`flex min-h-14 flex-col items-center justify-center font-mono text-[12px] font-bold uppercase tracking-wide ${t.id === tab ? "bg-panel text-panel-ink" : ""}`}
        >
          {t.label}
          <span className="text-[11px] font-normal opacity-80">{t.count}</span>
        </Link>
      ))}
    </nav>
  );
}
