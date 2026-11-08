import { Suspense } from "react";
import { requireRole, type Role } from "@/lib/auth";
import { PageSkeleton } from "@/components/ui/page-skeleton";

/*
  Wraps an app shell's pages. It checks, on the server, that the visitor is
  signed in, has the right role and finished onboarding. Wrong role or
  unfinished onboarding redirects before any page content is sent.

  Why a component and not code at the top of the layout: with Cache Components,
  reading the session in a layout would hold the whole page back. Behind
  <Suspense>, the nav bar and skeleton paint instantly while the check runs.
*/
async function Check({ role, children }: { role: Role; children: React.ReactNode }) {
  await requireRole(role);
  return <>{children}</>;
}

export function RoleGate({ role, children }: { role: Role; children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Check role={role}>{children}</Check>
    </Suspense>
  );
}
