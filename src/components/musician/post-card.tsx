import Link from "next/link";
import { Heart, MessageSquare, Play } from "lucide-react";
import { Vinyl } from "./vinyl";

export type PostCardData = {
  id: string;
  author: string;
  initials: string;
  role: string;
  ago: string;
  verified: boolean;
  title: string;
  kind: string;
  length: string;
  caption: string;
  likes: number;
  comments: number;
};

export function PostCard({ post }: { post: PostCardData }) {
  return (
    <article className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gold font-logo text-lg font-black italic text-gold-ink"
        >
          {post.initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold leading-tight">
            {post.author}
          </p>
          <p className="font-mono text-[10px] uppercase text-ink-muted">
            {post.role} · {post.ago}
          </p>
        </div>
        {post.verified && (
          <span className="-rotate-3 border-[1.5px] border-brick px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-brick">
            Verified sound
          </span>
        )}
      </header>

      <div className="flex items-center gap-5 rounded-2xl bg-brick p-5 text-brick-ink">
        <Vinyl size={148} />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
          <h3 className="font-display text-[28px] uppercase leading-none">
            {post.title}
          </h3>
          <p className="font-mono text-[11px] uppercase tracking-wide text-brick-ink">
            {post.kind} · {post.length}
          </p>
          <button
            type="button"
            aria-label={`Play ${post.title}`}
            className="flex size-14 items-center justify-center rounded-full bg-gold text-gold-ink active:scale-95"
          >
            <Play size={24} fill="currentColor" aria-hidden />
          </button>
        </div>
      </div>

      <p className="text-base leading-relaxed">{post.caption}</p>

      <footer className="flex items-center border-t border-line pt-1">
        <button
          type="button"
          className="flex min-h-11 items-center gap-2 pr-4 font-mono text-[13px]"
          aria-label={`Like, ${post.likes} likes`}
        >
          <Heart size={24} strokeWidth={1.75} aria-hidden />
          {post.likes}
        </button>
        <button
          type="button"
          className="flex min-h-11 items-center gap-2 pr-4 font-mono text-[13px]"
          aria-label={`Comments, ${post.comments}`}
        >
          <MessageSquare size={24} strokeWidth={1.75} aria-hidden />
          {post.comments}
        </button>
        <Link
          href="/m/profile"
          className="ml-auto flex min-h-11 items-center font-mono text-[13px] uppercase tracking-wide text-brick"
        >
          View profile
        </Link>
      </footer>
    </article>
  );
}
