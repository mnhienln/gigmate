import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile, homeFor } from "@/lib/auth";
import { PageSkeleton } from "@/components/ui/page-skeleton";

/* "/home" is a traffic cop: it sends each signed-in user to the right place.
   Everything that logs in or finishes onboarding redirects here. */
async function Router(): Promise<never> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.onboarded_at) redirect("/onboarding/1");
  redirect(homeFor(profile.role));
}

export default function HomePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Router />
    </Suspense>
  );
}
