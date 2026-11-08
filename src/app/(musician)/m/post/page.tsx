import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PostComposer } from "@/components/profile/post-composer";

export const metadata = { title: "New post | GigMate" };

async function Content() {
  const profile = await requireRole("musician");
  return (
    <div className="flex flex-col gap-5 px-5 pt-5">
      <Link href="/m/profile" className="-ml-2 flex min-h-11 w-fit items-center gap-1 px-2 font-mono text-[12px] font-bold uppercase tracking-wide">
        <ChevronLeft size={18} aria-hidden /> Profile
      </Link>
      <div>
        <h1 className="font-display text-[36px] uppercase leading-none">New post</h1>
        <p className="mt-2 text-base text-ink-muted">Share a photo or a short video. It shows on your profile and in the scene feed that every musician and venue sees.</p>
      </div>
      <PostComposer userId={profile.id} />
    </div>
  );
}

export default function NewPostPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content />
    </Suspense>
  );
}
