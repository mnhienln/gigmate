import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, Zap } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { todayLocal } from "@/lib/dates";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { SlotForm } from "@/components/venue/slot-form";

export const metadata = { title: "Need an act tonight | GigMate" };

async function Content() {
  await requireRole("venue");
  const today = todayLocal();
  return (
    <div className="flex flex-col gap-5 px-5 pt-5">
      <Link href="/v/calendar" className="-ml-2 flex min-h-11 w-fit items-center gap-1 px-2 font-mono text-[12px] font-bold uppercase tracking-wide">
        <ChevronLeft size={18} aria-hidden /> Calendar
      </Link>
      <div>
        <p className="flex items-center gap-2 font-mono text-[12px] font-bold uppercase tracking-wide text-brick">
          <Zap size={16} aria-hidden /> Urgent
        </p>
        <h1 className="font-display text-[34px] uppercase leading-none">Need an act tonight</h1>
        <p className="mt-2 text-base text-ink-muted">Four quick questions. Musicians who are available tonight see it first.</p>
      </div>
      <SlotForm urgent date={today} today={today} />
    </div>
  );
}

export default function TonightPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content />
    </Suspense>
  );
}
