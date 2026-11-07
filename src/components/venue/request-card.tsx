import { ExternalLink } from "lucide-react";
import { acceptApplication, declineApplication } from "@/app/(venue)/v/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatRateRange } from "@/lib/money";
import type { MusicianSummary } from "@/lib/types";

export function Rating({ musician }: { musician: MusicianSummary }) {
  if (musician.avg_rating == null) {
    return <span className="text-ink-muted">New, no reviews yet</span>;
  }
  return (
    <span aria-label={`${musician.avg_rating.toFixed(1)} out of 5 from ${musician.review_count} reviews`}>
      <span aria-hidden>★ </span>
      <span className="font-bold">{musician.avg_rating.toFixed(1)}</span>{" "}
      <span className="text-ink-muted">({musician.review_count})</span>
    </span>
  );
}

export function ClipLink({ musician }: { musician: MusicianSummary }) {
  const clip = musician.media_links[0];
  if (!clip) return <span className="text-ink-muted">No clip yet</span>;
  return (
    <a
      href={clip.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center gap-1.5 font-bold text-gold underline underline-offset-4"
    >
      {clip.label || "Listen"} <ExternalLink size={14} aria-hidden />
    </a>
  );
}

export function AcceptDeclineButtons({ applicationId, name, stacked = false }: { applicationId: string; name: string; stacked?: boolean }) {
  return (
    <div className={stacked ? "flex flex-col gap-3" : "grid grid-cols-2 gap-3"}>
      <form action={acceptApplication.bind(null, applicationId)}>
        <SubmitButton pendingText="Booking..." label={`Accept ${name}`}>Accept</SubmitButton>
      </form>
      <form action={declineApplication.bind(null, applicationId)}>
        <SubmitButton variant="outline" pendingText="Declining..." label={`Decline ${name}`}>Decline</SubmitButton>
      </form>
    </div>
  );
}

export function RequestCard({
  applicationId,
  musician,
  compareFormId,
}: {
  applicationId: string;
  musician: MusicianSummary;
  /** If set, shows a "Compare" checkbox linked to that form. */
  compareFormId?: string;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border-2 border-line bg-panel p-4 text-panel-ink">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-2xl uppercase leading-none">{musician.display_name}</h3>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-ink-muted">
            {[musician.neighborhood, musician.genres.slice(0, 2).join(", ")].filter(Boolean).join(" · ") || "Profile in progress"}
          </p>
        </div>
        {musician.verified_sound && (
          <span className="-rotate-3 shrink-0 border-[1.5px] border-brick px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-brick">Verified sound</span>
        )}
      </header>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-base">
        <div>
          <dt className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-muted">Rating</dt>
          <dd><Rating musician={musician} /></dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-muted">Rate</dt>
          <dd className="font-bold">{formatRateRange(musician.rate_min_cents, musician.rate_max_cents)}</dd>
        </div>
      </dl>

      <div className="flex items-center justify-between">
        <ClipLink musician={musician} />
        {compareFormId && (
          <label className="flex min-h-11 cursor-pointer items-center gap-2 font-mono text-[12px] font-bold uppercase tracking-wide">
            <input type="checkbox" name="c" value={applicationId} form={compareFormId} className="size-6 accent-[var(--accent)]" />
            Compare
          </label>
        )}
      </div>

      <AcceptDeclineButtons applicationId={applicationId} name={musician.display_name} />
    </article>
  );
}
