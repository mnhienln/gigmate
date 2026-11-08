"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";

export type GridPost = {
  id: string;
  type: "image" | "video";
  src: string;
  poster: string | null;
  caption: string;
  date: string;
};

/*
  Instagram-style grid: square thumbnails three across. Tap one to open it large in a
  native <dialog>, which the browser handles for us: it traps keyboard focus, closes on
  Escape, and dims the page behind it. Videos only load when opened, so the grid stays
  light on mobile data (the thumbnail is a small picture made when the video was posted).
*/
export function PostGrid({ posts }: { posts: GridPost[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const current = open !== null ? posts[open] : null;

  function show(i: number) {
    setOpen(i);
    dialog.current?.showModal();
  }
  function step(delta: number) {
    setOpen((i) => (i === null ? i : (i + delta + posts.length) % posts.length));
  }

  return (
    <>
      <ul className="grid grid-cols-3 gap-1">
        {posts.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => show(i)}
              aria-label={`Open ${p.type === "video" ? "video" : "photo"}${p.caption ? `: ${p.caption.slice(0, 60)}` : ""}`}
              className="relative block aspect-square w-full overflow-hidden bg-line"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.type === "video" ? (p.poster ?? "") : p.src} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
              {p.type === "video" && (
                <span aria-hidden className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-black/60 text-white">
                  <Play size={14} fill="currentColor" />
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        onClose={() => setOpen(null)}
        aria-label="Post"
        className="m-auto max-h-[92dvh] w-[min(520px,100vw-16px)] overflow-y-auto rounded-2xl bg-panel p-0 text-panel-ink backdrop:bg-black/80"
      >
        {current && (
          <div className="flex flex-col">
            <div className="flex items-center justify-between px-3 py-1">
              <span className="font-mono text-[11px] uppercase tracking-wide opacity-80">{current.date}</span>
              <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className="flex size-11 items-center justify-center">
                <X size={24} aria-hidden />
              </button>
            </div>
            <div className="relative bg-black">
              {current.type === "video" ? (
                <video key={current.id} src={current.src} poster={current.poster ?? undefined} controls playsInline autoPlay className="max-h-[60dvh] w-full" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={current.src} alt={current.caption || "Photo post"} className="max-h-[60dvh] w-full object-contain" />
              )}
            </div>
            {posts.length > 1 && (
              <div className="flex justify-between px-2">
                <button type="button" onClick={() => step(-1)} aria-label="Previous post" className="flex size-11 items-center justify-center"><ChevronLeft size={24} aria-hidden /></button>
                <button type="button" onClick={() => step(1)} aria-label="Next post" className="flex size-11 items-center justify-center"><ChevronRight size={24} aria-hidden /></button>
              </div>
            )}
            {current.caption && <p className="whitespace-pre-line break-words px-4 pb-5 text-base leading-relaxed">{current.caption}</p>}
          </div>
        )}
      </dialog>
    </>
  );
}
