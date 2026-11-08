import { ExternalLink, Play } from "lucide-react";
import { Avatar } from "@/components/profile/avatar";
import { timeAgo } from "@/lib/dates";
import { linkLabel } from "@/lib/media";
import { PHOTOS, VIDEOS, publicUrl } from "@/lib/storage";
import type { FeedPost } from "@/lib/types";
import { Vinyl } from "./vinyl";

/* A scene post. Three kinds of content can appear:
   - an uploaded photo or video (shown big, like Instagram),
   - a link clip (the vinyl block that opens Spotify, YouTube and so on),
   - plain words (announcements). */
export function PostCard({ post }: { post: FeedPost }) {
  const isClip = post.kind === "clip" && post.media_url;
  return (
    <article className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <Avatar name={post.author.name} path={post.author.avatar_path} size={48} />
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

      {post.media && (
        <div className="overflow-hidden rounded-2xl bg-black">
          {post.media.type === "video" ? (
            <video
              src={publicUrl(VIDEOS, post.media.path)}
              poster={post.media.poster_path ? publicUrl(PHOTOS, post.media.poster_path) : undefined}
              controls
              playsInline
              preload="none"
              className="max-h-[70dvh] w-full"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={publicUrl(PHOTOS, post.media.path)} alt={post.body || `Photo from ${post.author.name}`} loading="lazy" decoding="async" className="max-h-[70dvh] w-full object-contain" />
          )}
        </div>
      )}

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

      {post.body && <p className="whitespace-pre-line break-words text-base leading-relaxed">{post.body}</p>}

      {post.media_url && !isClip && (
        <a href={post.media_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 font-mono text-[13px] uppercase tracking-wide text-brick underline underline-offset-4">
          {linkLabel(post.media_url)} <ExternalLink size={14} aria-hidden />
        </a>
      )}
      <hr className="border-line" />
    </article>
  );
}
