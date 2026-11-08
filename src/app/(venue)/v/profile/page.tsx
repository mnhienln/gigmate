import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getVenueProfileView } from "@/lib/profile/data";
import { LogoutButton } from "@/components/auth/logout-button";
import { ProfileTabs, parseVenueTab, venueTabs } from "@/components/profile/profile-tabs";
import { VenueHeader } from "@/components/profile/venue-header";
import { VenueProfileBody } from "@/components/profile/venue-profile-body";
import { FormMessage } from "@/components/ui/form-message";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const metadata = { title: "Venue profile | GiGmate" };

/* Read-only by default, like Instagram: nothing here changes by accident.
   Editing (details, photo, posts, shop) lives behind the "Edit profile" button. */
async function Content({ searchParams }: { searchParams: PageProps<"/v/profile">["searchParams"] }) {
  const profile = await requireRole("venue");
  const sp = await searchParams;
  const view = await getVenueProfileView(profile.id);
  if (!view) notFound();
  const tab = parseVenueTab(sp.tab);

  return (
    <div className="flex flex-col gap-5">
      <VenueHeader view={view}>
        <Link
          href="/v/profile/edit"
          className="flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-ink px-6 font-display text-lg uppercase tracking-wide"
        >
          <Pencil size={18} aria-hidden /> Edit profile
        </Link>
      </VenueHeader>

      {sp.posted === "1" && (
        <div className="px-5">
          <FormMessage message="Posted. It is on your profile." />
        </div>
      )}

      <section aria-label="Reliability" className="mx-5 rounded-2xl border-2 border-line bg-panel p-4">
        <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-muted">Reliability, shown to musicians</p>
        <p className="mt-1 text-base">
          <span className="font-display text-3xl leading-none">{view.late_cancellations}</span> late cancellation{view.late_cancellations === 1 ? "" : "s"}
          <span className="text-ink-muted"> · {view.gigs_hosted} gig{view.gigs_hosted === 1 ? "" : "s"} hosted</span>
        </p>
        <p className="mt-1 text-sm text-ink-muted">Cancelling a confirmed gig less than 48 hours ahead adds one here and costs a fee.</p>
      </section>

      <div>
        <ProfileTabs basePath="/v/profile" tab={tab} items={venueTabs(view)} />
        <div className="mt-4">
          <VenueProfileBody view={view} tab={tab} isOwner />
        </div>
      </div>

      <LogoutButton />
    </div>
  );
}

export default function VenueProfilePage(props: PageProps<"/v/profile">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}
