import { Suspense } from "react";
import { ExternalLink } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { initialsOf } from "@/lib/media";
import { formatRateRange } from "@/lib/money";
import { getMyProfile } from "@/lib/musician/data";
import { LogoutButton } from "@/components/auth/logout-button";
import { MusicianProfileForm } from "@/components/musician/profile-form";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const metadata = { title: "Profile | GigMate" };

async function Content() {
  const profile = await requireRole("musician");
  const me = await getMyProfile(profile.id);

  return (
    <div className="flex flex-col gap-6 pt-5">
      <header className="flex items-center gap-4 px-5">
        <span aria-hidden className="flex size-20 shrink-0 items-center justify-center rounded-full bg-gold font-logo text-3xl font-black italic text-gold-ink">
          {initialsOf(me.display_name)}
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[12px] uppercase tracking-wide text-ink-muted">Your press kit</p>
          <h1 className="break-words font-display text-[34px] uppercase leading-none">{me.display_name}</h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-ink-muted">{me.neighborhood ?? "Add your neighborhood"}</p>
        </div>
      </header>

      {me.verified_sound && (
        <p className="mx-5 w-fit -rotate-2 border-[1.5px] border-brick px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-brick">Verified sound</p>
      )}

      <section aria-label="What venues see" className="mx-5 flex flex-col gap-4 rounded-2xl bg-panel p-5 text-panel-ink">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold">What venues see</p>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="font-mono text-[11px] font-bold uppercase tracking-wide opacity-80">Rate</dt>
            <dd className="font-display text-2xl leading-none">{formatRateRange(me.rate_min_cents, me.rate_max_cents)}</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] font-bold uppercase tracking-wide opacity-80">Rating</dt>
            <dd className="font-display text-2xl leading-none">
              {me.rating ? (
                <>
                  ★ {me.rating.avg.toFixed(1)} <span className="font-sans text-base opacity-80">({me.rating.count})</span>
                </>
              ) : (
                <span className="font-sans text-base">New, no reviews yet</span>
              )}
            </dd>
          </div>
        </dl>
        <p className="flex flex-wrap gap-2">
          {me.genres.length === 0 ? (
            <span className="text-sm opacity-80">No genres yet</span>
          ) : (
            me.genres.map((g) => (
              <span key={g} className="rounded-full border-2 border-panel-ink px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wide">{g}</span>
            ))
          )}
        </p>
        {me.bio && <p className="text-base leading-relaxed">{me.bio}</p>}
        <p className="flex flex-wrap gap-x-5">
          {me.media_links.length === 0 ? (
            <span className="text-sm opacity-80">No listen links yet. Venues love a clip.</span>
          ) : (
            me.media_links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 font-bold text-gold underline underline-offset-4">
                {l.label} <ExternalLink size={14} aria-hidden />
              </a>
            ))
          )}
        </p>
        <p className="font-mono text-[12px] uppercase tracking-wide">{me.available_tonight ? "Available tonight" : "Not available tonight"}</p>
      </section>

      <section aria-label="Edit press kit" className="px-5">
        <h2 className="mb-3 font-display text-2xl uppercase leading-none">Edit press kit</h2>
        <MusicianProfileForm initial={me} />
      </section>

      <LogoutButton />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content />
    </Suspense>
  );
}
