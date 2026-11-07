"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Home,
  Inbox,
  Plus,
  Search,
  Store,
  User,
} from "lucide-react";

/*
  Server components cannot pass functions (like an icon component) to client
  components, only plain serializable data. So layouts pass an icon NAME and
  this file, which is already on the client, looks the component up.
  Tradeoff: new icons must be registered here, but the boundary stays valid.
*/
const ICONS = {
  home: Home,
  search: Search,
  plus: Plus,
  calendar: CalendarDays,
  user: User,
  inbox: Inbox,
  store: Store,
};
export type NavIcon = keyof typeof ICONS;

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  /** Renders as the raised round action button in the middle of the bar. */
  primary?: boolean;
};

/*
  Why a client component: it needs usePathname() to highlight the active tab.
  Everything else in the shell stays a server component, so only this small
  piece ships JavaScript to the phone. Tradeoff: one extra client bundle,
  in exchange for correct "you are here" feedback.
*/
export function BottomNav({
  items,
  label,
}: {
  items: NavItem[];
  label: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-40 bg-nav text-nav-ink"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul
        className="mx-auto grid h-[72px] max-w-[520px] items-center"
        style={{
          gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        }}
      >
        {items.map(({ href, label: text, icon, primary }) => {
          const Icon = ICONS[icon];
          const active = pathname === href || pathname.startsWith(href + "/");

          if (primary) {
            return (
              <li key={href} className="flex justify-center">
                <Link
                  href={href}
                  aria-label={text}
                  className="flex h-12 w-[76px] items-center justify-center rounded-full bg-accent text-accent-ink shadow-md active:scale-95"
                >
                  <Icon size={28} strokeWidth={2.5} aria-hidden />
                </Link>
              </li>
            );
          }

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1 font-mono text-[11px] font-bold uppercase tracking-wide ${
                  active ? "text-gold" : "text-nav-ink"
                }`}
              >
                <Icon size={24} strokeWidth={active ? 2.5 : 1.75} aria-hidden />
                {text}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
