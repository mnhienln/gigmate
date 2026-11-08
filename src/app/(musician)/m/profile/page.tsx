import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getProfileView } from "@/lib/profile/data";
import { getMySubscription } from "@/lib/musician/subscription";
import { PLANS } from "@/lib/pricing";
import { dayOf, formatDay } from "@/lib/dates";
import { LogoutButton } from "@/components/auth/logout-button";
import { ProfileBody } from "@/components/profile/profile-body";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileTabs, parseTab } from "@/components/profile/profile-tabs";
import { FormMessage } from "@/components/ui/form-message";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const metadata = { title: "Profile | GigMate" };

/* Read-only by default, like Instagram: nothing here can be changed by accident.
   Editing lives behind the "Edit profile" button. */
async function Content({ searchParams }: { searchParams: PageProps<"/m/profile">["searchParams"] }) {
  const profile = await requireRole("musician");
  const sp = await searchParams;
  const [view, plan] = await Promise.all([getProfileView(profile.id), getMySubscription(profile.id)]);
  if (!view) notFound();
  const tab = parseTab(sp.tab);

  return (
    <div className="flex flex-col gap-5">
      <ProfileHeader view={view}>
        <Link
          href="/m/profile/edit"
          className="flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-ink px-6 font-display text-lg uppercase tracking-wide"
        >
          <Pencil size={18} aria-hidden /> Edit profile
        </Link>
        <Link href="/m/subscribe" className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-panel px-4 py-2 text-panel-ink">
          <span>
            <span className="block font-mono text-[11px] uppercase tracking-[0.2em] text-gold">{plan.active ? (plan.inTrial ? "Free trial" : "Your plan") : "No plan yet"}</span>
            <span className="block text-base font-bold">
              {plan.active
                ? `${PLANS.find((p) => p.id === plan.plan)?.label ?? "Active"}${plan.renewsAt ? ` · until ${formatDay(dayOf(plan.renewsAt))}` : ""}`
                : "Subscribe to apply for gigs"}
            </span>
          </span>
          <span aria-hidden className="font-display text-xl">&rsaquo;</span>
        </Link>
      </ProfileHeader>

      {sp.posted === "1" && (
        <div className="px-5">
          <FormMessage message="Posted. It is on your profile and in the feed." />
        </div>
      )}

      <div>
        <ProfileTabs basePath="/m/profile" tab={tab} view={view} />
        <div className="mt-4">
          <ProfileBody view={view} tab={tab} isOwner />
        </div>
      </div>

      <LogoutButton />
    </div>
  );
}

export default function ProfilePage(props: PageProps<"/m/profile">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}
