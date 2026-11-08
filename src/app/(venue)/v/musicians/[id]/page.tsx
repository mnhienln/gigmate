import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getProfileView } from "@/lib/profile/data";
import { ProfileBody } from "@/components/profile/profile-body";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileTabs, musicianTabs, parseMusicianTab } from "@/components/profile/profile-tabs";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const metadata = { title: "Musician | GiGmate" };

/* A venue's read-only view of a musician: the same photos, videos and music the musician sees,
   with no edit controls. This is what helps a venue pick between two applicants. */
async function Content({ params, searchParams }: { params: PageProps<"/v/musicians/[id]">["params"]; searchParams: PageProps<"/v/musicians/[id]">["searchParams"] }) {
  await requireRole("venue");
  const { id } = await params;
  const sp = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const view = await getProfileView(id);
  if (!view) notFound();
  const tab = parseMusicianTab(sp.tab);

  return (
    <div className="flex flex-col gap-5 pb-4">
      <div className="px-5 pt-5">
        <Link href="/v/requests" className="-ml-2 flex min-h-11 w-fit items-center gap-1 px-2 font-mono text-[12px] font-bold uppercase tracking-wide">
          <ChevronLeft size={18} aria-hidden /> Requests
        </Link>
      </div>
      <ProfileHeader view={view} />
      <div>
        <ProfileTabs basePath={`/v/musicians/${id}`} tab={tab} items={musicianTabs(view)} />
        <div className="mt-4">
          <ProfileBody view={view} tab={tab} isOwner={false} />
        </div>
      </div>
    </div>
  );
}

export default function MusicianPage(props: PageProps<"/v/musicians/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
