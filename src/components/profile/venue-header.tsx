import type { ReactNode } from "react";
import type { VenueView } from "@/lib/types";
import { Avatar } from "./avatar";

function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <dd className="font-display text-2xl leading-none">{value}</dd>
      <dt className="mt-1 font-mono text-[11px] uppercase tracking-wide text-ink-muted">{label}</dt>
    </div>
  );
}

/* The top of a venue's Instagram-style profile: photo, three headline numbers, then name, facts and
   reliability. `children` is the action area (Edit profile for the owner, nothing for visitors). */
export function VenueHeader({ view, children }: { view: VenueView; children?: ReactNode }) {
  const facts = [view.venue_type, view.neighborhood, view.capacity ? `${view.capacity} capacity` : null].filter(Boolean).join(" · ");
  return (
    <header className="flex flex-col gap-4 px-5 pt-5">
      <div className="flex items-center gap-5">
        <Avatar name={view.display_name} path={view.avatar_path} size={88} />
        <dl className="grid flex-1 grid-cols-3 gap-2 text-center">
          <Stat value={view.posts.length} label="Posts" />
          <Stat value={view.gigs_hosted} label="Gigs" />
          <Stat
            value={view.rating ? <span aria-label={`${view.rating.avg.toFixed(1)} out of 5 from ${view.rating.count} reviews`}>★{view.rating.avg.toFixed(1)}</span> : "New"}
            label="Rating"
          />
        </dl>
      </div>

      <div>
        <h1 className="break-words font-display text-[30px] uppercase leading-none">{view.display_name}</h1>
        {facts && <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-ink-muted">{facts}</p>}
        {view.address && <p className="mt-1 text-base text-ink-muted">{view.address}</p>}
      </div>

      <p className="flex flex-wrap gap-2">
        <span className="rounded-full border-2 border-ink px-3 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide">{view.has_pa ? "PA on site" : "No PA"}</span>
        <span className="rounded-full border-2 border-ink px-3 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide">
          Cancelled last minute: {view.late_cancellations}
        </span>
      </p>

      {view.stage_notes && <p className="whitespace-pre-line break-words text-base leading-relaxed">{view.stage_notes}</p>}

      {children}
    </header>
  );
}
