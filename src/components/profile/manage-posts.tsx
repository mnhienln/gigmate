import { deletePost } from "@/lib/profile/media-actions";
import { PHOTOS, publicUrl } from "@/lib/storage";
import type { ProfilePost } from "@/lib/types";
import { SubmitButton } from "@/components/ui/submit-button";

/* The list of a profile's photo and video posts with a two-step Delete. Used on both edit pages. */
export function ManagePosts({ posts }: { posts: ProfilePost[] }) {
  if (posts.length === 0) return <p className="text-base text-ink-muted">No posts yet.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {posts.map((p) => (
        <li key={p.id} className="flex items-center gap-3 rounded-2xl border-2 border-line p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={publicUrl(PHOTOS, p.media_type === "video" ? (p.poster_path ?? p.media_path) : p.media_path)} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base">{p.body || (p.media_type === "video" ? "Video" : "Photo")}</p>
            <p className="font-mono text-[11px] uppercase text-ink-muted">{p.media_type}</p>
          </div>
          <details className="shrink-0">
            <summary className="flex min-h-11 cursor-pointer items-center px-2 font-mono text-[12px] font-bold uppercase tracking-wide text-brick">Delete</summary>
            <form action={deletePost.bind(null, p.id)} className="mt-2 w-40">
              <SubmitButton variant="outline" pendingText="Deleting..." label={`Yes, delete this ${p.media_type}`}>Yes, delete</SubmitButton>
            </form>
          </details>
        </li>
      ))}
    </ul>
  );
}
