import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { getVenueProfile } from "@/lib/venue/data";
import { LogoutButton } from "@/components/auth/logout-button";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { VenueProfileForm } from "@/components/venue/profile-form";

export const metadata = { title: "Venue profile | GigMate" };

async function Content() {
  const profile = await requireRole("venue");
  const venue = await getVenueProfile(profile.id);

  return (
    <div className="flex flex-col gap-6 pt-5">
      <header className="px-5">
        <p className="font-mono text-[12px] uppercase tracking-wide text-ink-muted">Your venue</p>
        <h1 className="font-display text-[34px] uppercase leading-none">{venue.display_name}</h1>
        <p className="mt-2 text-base text-ink-muted">
          {[venue.venue_type, venue.neighborhood, venue.capacity ? `${venue.capacity} capacity` : null].filter(Boolean).join(" · ")}
        </p>
      </header>

      <section aria-label="Reviews" className="mx-5 rounded-2xl border-2 border-line bg-panel p-4">
        <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-muted">Reviews from musicians</p>
        {venue.rating ? (
          <p className="mt-1 font-display text-3xl leading-none">
            ★ {venue.rating.avg.toFixed(1)} <span className="font-sans text-base text-ink-muted">({venue.rating.count})</span>
          </p>
        ) : (
          <p className="mt-1 text-base text-ink-muted">No reviews yet. After your first gig, both you and the act can leave one.</p>
        )}
      </section>

      <section aria-label="Edit venue details" className="px-5">
        <h2 className="mb-3 font-display text-2xl uppercase leading-none">Details</h2>
        <VenueProfileForm
          initial={{
            display_name: venue.display_name,
            neighborhood: venue.neighborhood,
            venue_type: venue.venue_type,
            capacity: venue.capacity,
            has_pa: venue.has_pa,
            stage_notes: venue.stage_notes,
            address: venue.address,
          }}
        />
      </section>

      <LogoutButton />
    </div>
  );
}

export default function VenueProfilePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content />
    </Suspense>
  );
}
