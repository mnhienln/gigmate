import Link from "next/link";
import type { ProfileView } from "@/lib/types";

export type ProfileTab = "posts" | "music" | "shop";

export function parseTab(v: unknown): ProfileTab {
  return v === "music" || v === "shop" ? v : "posts";
}

/* Posts | Music | Shop, as links (?tab=music) so each view is a real address:
   no JavaScript needed, back button works, and a venue can be sent straight to the Shop tab. */
export function ProfileTabs({ basePath, tab, view }: { basePath: string; tab: ProfileTab; view: ProfileView }) {
  const items: { id: ProfileTab; label: string; count: number }[] = [
    { id: "posts", label: "Posts", count: view.posts.length },
    { id: "music", label: "Music", count: view.links.length },
    { id: "shop", label: "Shop", count: view.products.length },
  ];
  return (
    <nav aria-label="Profile sections" className="mt-5 grid grid-cols-3 border-y-2 border-ink">
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
