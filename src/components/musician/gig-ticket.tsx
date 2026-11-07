import Link from "next/link";

export type GigTicketData = {
  id: string;
  title: string;
  venue: string;
  time: string;
  pay: string;
  genre: string;
  weekday: string;
  day: number;
  month: string;
};

/*
  The "ticket" card. The two cream circles are the punched notches where the
  stub tears off. They are plain positioned divs painted the page background
  color, which is simpler and more accessible than a CSS mask.
  Tradeoff: if the page background ever becomes an image, the notches would
  show. Today it is a flat color, so this is fine.
*/
const STUB_WIDTH = 84; // px
const NOTCH = 20; // px

export function GigTicket({ gig }: { gig: GigTicketData }) {
  return (
    <article
      aria-label={`${gig.title} at ${gig.venue}`}
      className="relative flex rounded-2xl"
    >
      <div className="flex-1 rounded-l-2xl bg-panel p-5 text-panel-ink">
        <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-gold">
          Now booking
        </p>
        <h2 className="mt-2 font-display text-[44px] uppercase leading-[0.95]">
          {gig.title}
        </h2>
        <p className="mt-4 font-mono text-[13px] uppercase leading-6 tracking-wide">
          {gig.venue}
          <br />
          {gig.time} / {gig.pay}
          <br />
          {gig.genre}
        </p>
        <Link
          href="/m/discover"
          className="mt-5 inline-flex min-h-14 items-center rounded-full bg-gold px-8 font-display text-xl uppercase tracking-wide text-gold-ink active:scale-95"
        >
          Apply
        </Link>
      </div>

      <div
        className="flex flex-col items-center justify-center rounded-r-2xl bg-accent text-accent-ink"
        style={{ width: STUB_WIDTH }}
      >
        <span className="font-mono text-[13px] uppercase tracking-widest">
          {gig.weekday}
        </span>
        <span className="font-logo text-[52px] font-black italic leading-none">
          {gig.day}
        </span>
        <span className="font-mono text-[13px] uppercase tracking-widest">
          {gig.month}
        </span>
      </div>

      {/* Punched notches on the perforation line */}
      {(["-top-2.5", "-bottom-2.5"] as const).map((pos) => (
        <span
          key={pos}
          aria-hidden
          className={`absolute ${pos} rounded-full bg-bg`}
          style={{
            width: NOTCH,
            height: NOTCH,
            right: STUB_WIDTH - NOTCH / 2,
          }}
        />
      ))}
    </article>
  );
}
