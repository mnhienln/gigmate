import { NextResponse, type NextRequest } from "next/server";
import { hasSupabasePublicEnv } from "@/lib/env";
import { updateSession } from "@/lib/supabase/proxy";

/*
  OPTIMISTIC checks only. This file sends logged-out visitors to /login and
  logged-in visitors away from the login page. It is NOT the security
  boundary: pages re-check the user and their role on the server
  (src/lib/auth.ts), and the database enforces Row Level Security.
  Never rely on this file alone to protect data.
*/
const PROTECTED = ["/m", "/v", "/onboarding", "/home"];
const AUTH_PAGES = ["/", "/login", "/signup"];

const isUnder = (path: string, base: string) =>
  path === base || path.startsWith(base + "/");

export async function proxy(request: NextRequest) {
  if (!hasSupabasePublicEnv()) return NextResponse.next(); // local setup not finished

  const { response, userId } = await updateSession(request);
  const path = request.nextUrl.pathname;

  const redirectTo = (to: string) => {
    const redirect = NextResponse.redirect(new URL(to, request.url));
    // Keep any refreshed session cookies on the redirect response.
    response().cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (!userId && PROTECTED.some((base) => isUnder(path, base))) {
    return redirectTo("/login");
  }
  if (userId && AUTH_PAGES.includes(path)) {
    return redirectTo("/home");
  }
  return response();
}

export const config = {
  // Skip static files and Next internals.
  matcher: [
    "/((?!_next/static|_next/image|api/stripe/webhook|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
