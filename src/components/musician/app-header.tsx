import Link from "next/link";
import { Bell, MessageSquare } from "lucide-react";
import { Stripes } from "@/components/ui/stripes";

export function AppHeader({
  city,
  weekOf,
  requests,
}: {
  city: string;
  weekOf: string;
  requests: number;
}) {
  return (
    <header className="px-5 pt-5">
      <div className="flex items-center justify-between">
        <Link
          href="/m/feed"
          className="flex min-h-11 items-center font-logo text-[40px] font-black italic leading-none tracking-tight text-brick"
        >
          GigMate
        </Link>
        <div className="flex items-center">
          <Link
            href="/m/alerts"
            aria-label="Alerts"
            className="flex size-11 items-center justify-center"
          >
            <Bell size={26} strokeWidth={1.75} aria-hidden />
          </Link>
          <Link
            href="/m/messages"
            aria-label="Messages"
            className="flex size-11 items-center justify-center"
          >
            <MessageSquare size={26} strokeWidth={1.75} aria-hidden />
          </Link>
        </div>
      </div>

      <div className="mt-3">
        <Stripes />
      </div>

      <p className="mt-3 flex justify-between font-mono text-[12px] uppercase tracking-wide text-ink-muted">
        <span>{city}</span>
        <span>Week of {weekOf}</span>
        <span>
          {requests} request{requests === 1 ? "" : "s"}
        </span>
      </p>
    </header>
  );
}
