import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { inputClass } from "@/components/ui/field";
import { WHEN_OPTIONS, type When } from "@/lib/dates";
import { ANY_GENRE, GENRES } from "@/lib/options";

export const PAY_OPTIONS = [0, 100, 150, 200, 300] as const;

/*
  Filters are a plain GET form: choosing options and tapping "Show gigs" puts
  them in the URL (?when=week&genre=Folk&pay=150). That means the filtered view
  can be bookmarked or shared, the back button works, and no client JavaScript
  is needed. Tradeoff: results update on a button tap, not as you type.
*/
export function DiscoverFilters({ when, genre, pay }: { when: When; genre: string; pay: number }) {
  const active = (when !== "any" ? 1 : 0) + (genre !== ANY_GENRE ? 1 : 0) + (pay > 0 ? 1 : 0);
  return (
    <details open={active > 0} className="rounded-2xl border-2 border-ink">
      <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-4 font-mono text-[12px] font-bold uppercase tracking-wide">
        <SlidersHorizontal size={18} aria-hidden />
        Filters{active > 0 ? ` (${active} on)` : ""}
      </summary>
      <form action="/m/discover" method="get" className="flex flex-col gap-4 px-4 pb-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[12px] font-bold uppercase tracking-wide">When</span>
          <select name="when" defaultValue={when} className={inputClass}>
            {WHEN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[12px] font-bold uppercase tracking-wide">Genre</span>
          <select name="genre" defaultValue={genre} className={inputClass}>
            {[ANY_GENRE, ...GENRES].map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[12px] font-bold uppercase tracking-wide">Minimum pay</span>
          <select name="pay" defaultValue={String(pay)} className={inputClass}>
            {PAY_OPTIONS.map((p) => (
              <option key={p} value={p}>{p === 0 ? "Any pay" : `$${p} or more`}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button type="submit" className="flex min-h-12 items-center justify-center rounded-full bg-gold px-6 font-display text-lg uppercase tracking-wide text-gold-ink">
            Show gigs
          </button>
          <Link href="/m/discover" className="flex min-h-12 items-center justify-center rounded-full border-2 border-ink px-6 font-display text-lg uppercase tracking-wide">
            Clear
          </Link>
        </div>
      </form>
    </details>
  );
}
