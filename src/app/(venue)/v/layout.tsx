import { BottomNav, type NavItem } from "@/components/ui/bottom-nav";

const items: NavItem[] = [
  { href: "/v/calendar", label: "Calendar", icon: "calendar" },
  { href: "/v/requests", label: "Requests", icon: "inbox" },
  { href: "/v/find-acts", label: "Find acts", icon: "search" },
  { href: "/v/profile", label: "Venue", icon: "store" },
];

export default function VenueLayout({ children }: LayoutProps<"/v">) {
  return (
    <div data-theme="daylight" className="min-h-dvh bg-bg text-ink">
      <main className="mx-auto w-full max-w-[520px] pb-[calc(96px+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <BottomNav items={items} label="Venue navigation" />
    </div>
  );
}
