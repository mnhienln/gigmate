import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { formatRateRange } from "@/lib/money";
import { getRequestsByIds } from "@/lib/venue/data";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { AcceptDeclineButtons, ClipLink, Rating } from "@/components/venue/request-card";

export const metadata = { title: "Compare | GiGmate" };

async function Content({ searchParams }: { searchParams: PageProps<"/v/requests/compare">["searchParams"] }) {
  const profile = await requireRole("venue");
  const sp = await searchParams;

  // ?c=<id>&c=<id>: exactly two valid, distinct ids, otherwise go back and pick again.
  const raw = sp.c === undefined ? [] : Array.isArray(sp.c) ? sp.c : [sp.c];
  const ids = [...new Set(raw)].filter((v) => z.uuid().safeParse(v).success);
  if (ids.length !== 2) redirect("/v/requests?error=pick");

  const [a, b] = await getRequestsByIds(profile.id, ids).then((rows) => [rows[0], rows[1]]);
  if (!a || !b) redirect("/v/requests");

  const rows: { label: string; render: (m: typeof a.musician) => React.ReactNode }[] = [
    { label: "Rating", render: (m) => <Rating musician={m} /> },
    { label: "Rate", render: (m) => <span className="font-bold">{formatRateRange(m.rate_min_cents, m.rate_max_cents)}</span> },
    { label: "Genres", render: (m) => m.genres.join(", ") || "Not set" },
    { label: "Area", render: (m) => m.neighborhood ?? "Not set" },
    { label: "Free tonight", render: (m) => (m.available_tonight ? "Yes" : "No") },
    { label: "Clip", render: (m) => <ClipLink musician={m} /> },
    { label: "About", render: (m) => <span className="text-sm">{m.bio ?? "No bio yet"}</span> },
  ];

  return (
    <div className="flex flex-col gap-5 px-5 pt-5">
      <Link href="/v/requests" className="-ml-2 flex min-h-11 w-fit items-center gap-1 px-2 font-mono text-[12px] font-bold uppercase tracking-wide">
        <ChevronLeft size={18} aria-hidden /> Requests
      </Link>
      <h1 className="font-display text-[34px] uppercase leading-none">Compare</h1>

      <div className="grid grid-cols-2 gap-3">
        {[a, b].map((r) => (
          <h2 key={r.id} className="font-display text-2xl uppercase leading-none">
            <Link href={`/v/musicians/${r.musician.id}`} className="inline-flex min-h-11 items-center underline decoration-2 underline-offset-4">{r.musician.display_name}</Link>
          </h2>
        ))}
        {rows.map((row) => (
          <div key={row.label} className="col-span-2 grid grid-cols-2 gap-3 border-t-2 border-line pt-3">
            <p className="col-span-2 font-mono text-[11px] font-bold uppercase tracking-wide text-ink-muted">{row.label}</p>
            <div className="min-w-0 break-words text-base">{row.render(a.musician)}</div>
            <div className="min-w-0 break-words text-base">{row.render(b.musician)}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 border-t-2 border-ink pt-4">
        {[a, b].map((r) => (
          <div key={r.id} className="flex flex-col gap-3">
            <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-muted">{r.musician.display_name}</p>
            <AcceptDeclineButtons applicationId={r.id} name={r.musician.display_name} stacked />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ComparePage(props: PageProps<"/v/requests/compare">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}
