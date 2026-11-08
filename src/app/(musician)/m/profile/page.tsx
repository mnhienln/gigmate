import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getProfileView } from "@/lib/profile/data";
import { LogoutButton } from "@/components/auth/logout-button";
import { ProfileBody } from "@/components/profile/profile-body";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileTabs, parseTab } from "@/components/profile/profile-tabs";
import { FormMessage } from "@/components/ui/form-message";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const metadata = { title: "Profile | GigMate" };

/* Read-only by default, like Instagram: nothing here can be changed by accident.
   Editing lives behind the "Edit profile" button. */
async function Content({ searchParams }: { searchParams: PageProps<"/m/profile">["searchParams"] }) {
  const profile = await requireRole("musician");
  const sp = await searchParams;
  const view = await getProfileView(profile.id);
  if (!view) notFound();
  const tab = parseTab(sp.tab);

  return (
    <div className="flex flex-col gap-5">
      <ProfileHeader view={view}>
        <Link
          href="/m/profile/edit"
          className="flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-ink px-6 font-display text-lg uppercase tracking-wide"
        >
          <Pencil size={18} aria-hidden /> Edit profile
        </Link>
      </ProfileHeader>

      {sp.posted === "1" && (
        <div className="px-5">
          <FormMessage message="Posted. It is on your profile and in the feed." />
        </div>
      )}

      <div>
        <ProfileTabs basePath="/m/profile" tab={tab} view={view} />
        <div className="mt-4">
          <ProfileBody view={view} tab={tab} isOwner />
        </div>
      </div>

      <LogoutButton />
    </div>
  );
}

export default function ProfilePage(props: PageProps<"/m/profile">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}
