import { ExternalLink, Play } from "lucide-react";
import { timeAgo } from "@/lib/dates";
import { linkLabel } from "@/lib/media";
import type { FeedPost } from "@/lib/types";
import { Vinyl } from "./vinyl";

/* A scene post. Announcements are text. Clips get the vinyl block, which opens
   the link in a new tab (we do not host audio, so there is nothing to stream). */
export function PostCard({ post }: { post: FeedPost }) {
  const isClip = post.kind === "clip" && post.media_url;
  return (
    <article className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gold font-logo text-lg font-black italic text-gold-ink"
        >
          {post.author.initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold leading-tight">{post.author.name}</p>
          <p className="font-mono text-[10px] uppercase text-ink-muted">
            {post.author.role === "venue" ? "Venue" : "Musician"} · {timeAgo(post.created_at)}
          </p>
        </div>
        {post.author.verified_sound && (
          <span className="-rotate-3 border-[1.5px] border-brick px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-brick">
            Verified sound
          </span>
        )}
      </header>

      {isClip && (
        <div className="flex items-center gap-5 rounded-2xl bg-brick p-5 text-brick-ink">
          <Vinyl size={120} />
          <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
            <h3 className="font-display text-[26px] uppercase leading-none">New clip</h3>
            <p className="font-mono text-[11px] uppercase tracking-wide text-brick-ink">{linkLabel(post.media_url!)}</p>
            <a
              href={post.media_url!}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Listen to ${post.author.name} on ${linkLabel(post.media_url!)}`}
              className="flex size-14 items-center justify-center rounded-full bg-gold text-gold-ink active:scale-95"
            >
              <Play size={24} fill="currentColor" aria-hidden />
            </a>
          </div>
        </div>
      )}

      <p className="whitespace-pre-line break-words text-base leading-relaxed">{post.body}</p>

      {post.media_url && !isClip && (
        <a href={post.media_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 font-mono text-[13px] uppercase tracking-wide text-brick underline underline-offset-4">
          {linkLabel(post.media_url)} <ExternalLink size={14} aria-hidden />
        </a>
      )}
      <hr className="border-line" />
    </article>
  );
}
