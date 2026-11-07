import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { parseWhen } from "@/lib/dates";
import { ANY_GENRE, GENRES } from "@/lib/options";
import { getOpenSlots } from "@/lib/musician/data";
import { APPLY_MESSAGES } from "@/lib/musician/messages";
import { DiscoverFilters, PAY_OPTIONS } from "@/components/musician/discover-filters";
import { SlotTicket } from "@/components/musician/slot-ticket";
import { FormMessage } from "@/components/ui/form-message";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const metadata = { title: "Discover | GigMate" };

async function Content({ searchParams }: { searchParams: PageProps<"/m/discover">["searchParams"] }) {
  const profile = await requireRole("musician");
  const sp = await searchParams;

  // Read filters from the URL, accepting only values we offer. Anything else falls back to "no filter".
  const when = parseWhen(sp.when);
  const genre = typeof sp.genre === "string" && (GENRES as readonly string[]).includes(sp.genre) ? sp.genre : ANY_GENRE;
  const payNum = Number(typeof sp.pay === "string" ? sp.pay : 0);
  const pay = (PAY_OPTIONS as readonly number[]).includes(payNum) ? payNum : 0;

  const slots = await getOpenSlots(profile.id, { when, genre, minPayDollars: pay || undefined });

  const qs = new URLSearchParams();
  if (when !== "any") qs.set("when", when);
  if (genre !== ANY_GENRE) qs.set("genre", genre);
  if (pay) qs.set("pay", String(pay));
  const returnTo = "/m/discover" + (qs.size ? `?${qs}` : "");

  const result = typeof sp.apply === "string" ? APPLY_MESSAGES[sp.apply] : undefined;
  const filtered = when !== "any" || genre !== ANY_GENRE || pay > 0;

  return (
    <div className="flex flex-col gap-5 px-5 pt-5">
      <header>
        <h1 className="font-display text-[40px] uppercase leading-none">Discover</h1>
        <p className="mt-2 text-base text-ink-muted">
          {slots.length === 0 ? "No open gigs match." : `${slots.length} open gig${slots.length === 1 ? "" : "s"}${filtered ? " match" : ""}. Tap Apply and the venue sees your press kit.`}
        </p>
      </header>

      <DiscoverFilters when={when} genre={genre} pay={pay} />
      {result && <FormMessage error={result.error} message={result.message} />}

      {slots.length === 0 ? (
        <section className="rounded-2xl border-2 border-dashed border-ink p-5">
          <h2 className="font-display text-3xl uppercase leading-none">{filtered ? "Nothing fits those filters" : "No open gigs yet"}</h2>
          <p className="mt-2 text-base text-ink-muted">
            {filtered ? "Try a wider date range, another genre, or a lower minimum pay." : "Venues post new slots all the time. Turn on Available tonight in your press kit and they can find you."}
          </p>
          <Link href={filtered ? "/m/discover" : "/m/profile"} className="mt-4 inline-flex min-h-12 items-center rounded-full bg-gold px-6 font-display text-lg uppercase tracking-wide text-gold-ink">
            {filtered ? "Clear filters" : "Open my press kit"}
          </Link>
        </section>
      ) : (
        <div className="flex flex-col gap-6">
          {slots.map((s) => (
            <SlotTicket key={s.id} slot={s} returnTo={returnTo} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DiscoverPage(props: PageProps<"/m/discover">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}
