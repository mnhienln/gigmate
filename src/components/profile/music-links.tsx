import { ExternalLink } from "lucide-react";
import { linkLabel } from "@/lib/media";

/* One big button per streaming page. They open in a new tab: Spotify, YouTube and
   SoundCloud do not let us play their music inside our app without their own embed
   code, and a button is what a venue manager actually needs: tap, listen, decide. */
export function MusicLinks({ links, emptyHint }: { links: { label: string; url: string }[]; emptyHint: string }) {
  if (links.length === 0) {
    return <p className="mx-5 rounded-2xl border-2 border-dashed border-line p-5 text-base text-ink-muted">{emptyHint}</p>;
  }
  return (
    <ul className="flex flex-col gap-3 px-5">
      {links.map((l) => {
        const name = linkLabel(l.url);
        return (
          <li key={l.url}>
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-16 items-center justify-between rounded-2xl bg-panel px-5 py-3 text-panel-ink active:scale-[0.99]"
            >
              <span>
                <span className="block font-mono text-[11px] uppercase tracking-[0.2em] opacity-80">Listen on</span>
                <span className="block font-display text-2xl uppercase leading-none">{name}</span>
              </span>
              <ExternalLink size={22} aria-hidden />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
