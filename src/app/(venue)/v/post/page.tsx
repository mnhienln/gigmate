import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PostComposer } from "@/components/profile/post-composer";

export const metadata = { title: "New post | GiGmate" };

async function Content() {
  const profile = await requireRole("venue");
  return (
    <div className="flex flex-col gap-5 px-5 pt-5">
      <Link href="/v/profile/edit" className="-ml-2 flex min-h-11 w-fit items-center gap-1 px-2 font-mono text-[12px] font-bold uppercase tracking-wide">
        <ChevronLeft size={18} aria-hidden /> Edit profile
      </Link>
      <div>
        <h1 className="font-display text-[36px] uppercase leading-none">New post</h1>
        <p className="mt-2 text-base text-ink-muted">Share a photo or a short video of your room, your crowd or a past show. It shows on your profile.</p>
      </div>
      <PostComposer userId={profile.id} doneBase="/v/profile" imageTab="photos" videoTab="videos" />
    </div>
  );
}

export default function NewVenuePostPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content />
    </Suspense>
  );
}
