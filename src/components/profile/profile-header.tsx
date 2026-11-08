import type { ReactNode } from "react";
import { formatRateRange } from "@/lib/money";
import type { ProfileView } from "@/lib/types";
import { Avatar } from "./avatar";

function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <dd className="font-display text-2xl leading-none">{value}</dd>
      <dt className="mt-1 font-mono text-[11px] uppercase tracking-wide text-ink-muted">{label}</dt>
    </div>
  );
}

/* The top of an Instagram-style profile: photo, three headline numbers, then the
   name, genres and bio. `children` is the action area (Edit profile, or nothing for venues). */
export function ProfileHeader({ view, children }: { view: ProfileView; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 px-5 pt-5">
      <div className="flex items-center gap-5">
        <Avatar name={view.display_name} path={view.avatar_path} size={88} />
        <dl className="grid flex-1 grid-cols-3 gap-2 text-center">
          <Stat value={view.posts.length} label="Posts" />
          <Stat value={view.gigs_played} label="Gigs" />
          <Stat
            value={view.rating ? <span aria-label={`${view.rating.avg.toFixed(1)} out of 5 from ${view.rating.count} reviews`}>★{view.rating.avg.toFixed(1)}</span> : "New"}
            label="Rating"
          />
        </dl>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="break-words font-display text-[30px] uppercase leading-none">{view.display_name}</h1>
          {view.verified_sound && (
            <span className="-rotate-2 border-[1.5px] border-brick px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-brick">Verified sound</span>
          )}
        </div>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-ink-muted">
          {[view.neighborhood, formatRateRange(view.rate_min_cents, view.rate_max_cents)].filter(Boolean).join(" · ")}
        </p>
      </div>

      {view.genres.length > 0 && (
        <p className="flex flex-wrap gap-2">
          {view.genres.map((g) => (
            <span key={g} className="rounded-full border-2 border-ink px-3 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide">{g}</span>
          ))}
        </p>
      )}

      {view.bio && <p className="whitespace-pre-line break-words text-base leading-relaxed">{view.bio}</p>}

      {view.available_tonight && (
        <p className="w-fit rounded-full bg-gold px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wide text-gold-ink">Available tonight</p>
      )}

      {children}
    </header>
  );
}
