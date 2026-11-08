import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getMyProfile } from "@/lib/musician/data";
import { getProfileView } from "@/lib/profile/data";
import { LogoutButton } from "@/components/auth/logout-button";
import { MusicianProfileForm } from "@/components/musician/profile-form";
import { AvatarUploader } from "@/components/profile/avatar-uploader";
import { EditSection } from "@/components/profile/edit-section";
import { ManagePosts } from "@/components/profile/manage-posts";
import { FormMessage } from "@/components/ui/form-message";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const metadata = { title: "Edit profile | GiGmate" };

async function Content({ searchParams }: { searchParams: PageProps<"/m/profile/edit">["searchParams"] }) {
  const profile = await requireRole("musician");
  const sp = await searchParams;
  const [me, view] = await Promise.all([getMyProfile(profile.id), getProfileView(profile.id)]);
  if (!view) notFound();

  return (
    <div className="flex flex-col gap-6 pt-5">
      <div className="px-5">
        <Link href="/m/profile" className="-ml-2 flex min-h-11 w-fit items-center gap-1 px-2 font-mono text-[12px] font-bold uppercase tracking-wide">
          <ChevronLeft size={18} aria-hidden /> Back to profile
        </Link>
        <h1 className="mt-1 font-display text-[36px] uppercase leading-none">Edit profile</h1>
        {sp.removed && <div className="mt-3"><FormMessage message="Post deleted." /></div>}
      </div>

      <EditSection title="Profile photo">
        <AvatarUploader userId={profile.id} name={view.display_name} path={view.avatar_path} />
      </EditSection>

      <EditSection title="Details" hint="Venues see these on your profile and in their requests.">
        <MusicianProfileForm initial={me} />
      </EditSection>

      <EditSection title="Posts" hint="Photos and videos show on your profile and in the feed.">
        <Link href="/m/post" className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-gold px-6 font-display text-lg uppercase tracking-wide text-gold-ink">
          <Plus size={20} strokeWidth={2.5} aria-hidden /> New post
        </Link>
        <ManagePosts posts={view.posts} />
      </EditSection>

      <LogoutButton />
    </div>
  );
}

export default function EditProfilePage(props: PageProps<"/m/profile/edit">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}
