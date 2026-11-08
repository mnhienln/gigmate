import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { isDateString, todayLocal } from "@/lib/dates";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { SlotForm } from "@/components/venue/slot-form";

export const metadata = { title: "Post a gig | GiGmate" };

async function Content({ searchParams }: { searchParams: PageProps<"/v/calendar/new">["searchParams"] }) {
  await requireRole("venue");
  const sp = await searchParams;
  const today = todayLocal();
  const wanted = typeof sp.date === "string" && isDateString(sp.date) ? sp.date : today;
  const date = wanted < today ? today : wanted;

  return (
    <div className="flex flex-col gap-5 px-5 pt-5">
      <Link href="/v/calendar" className="-ml-2 flex min-h-11 w-fit items-center gap-1 px-2 font-mono text-[12px] font-bold uppercase tracking-wide">
        <ChevronLeft size={18} aria-hidden /> Calendar
      </Link>
      <h1 className="font-display text-[34px] uppercase leading-none">Post a gig</h1>
      <SlotForm urgent={false} date={date} today={today} />
    </div>
  );
}

export default function NewGigPage(props: PageProps<"/v/calendar/new">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}
