import { BottomNav, type NavItem } from "@/components/ui/bottom-nav";

/*
  Musician shell. A route group like (musician) costs nothing in the URL, but
  gives this subtree its own layout, theme and nav. The real "/m" segment keeps
  paths unique (venues also have a profile page) and makes the role guard in
  proxy.ts a one-line prefix check.
*/
const items: NavItem[] = [
  { href: "/m/feed", label: "Feed", icon: "home" },
  { href: "/m/discover", label: "Discover", icon: "search" },
  { href: "/m/post", label: "New post", icon: "plus", primary: true },
  { href: "/m/bookings", label: "Bookings", icon: "calendar" },
  { href: "/m/profile", label: "Profile", icon: "user" },
];

export default function MusicianLayout({
  children,
}: LayoutProps<"/m">) {
  return (
    <div
      data-theme="poster"
      className="min-h-dvh bg-bg text-ink"
    >
      <main className="mx-auto w-full max-w-[520px] pb-[calc(96px+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <BottomNav items={items} label="Musician navigation" />
    </div>
  );
}
