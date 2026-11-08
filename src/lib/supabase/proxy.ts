import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublicEnv } from "@/lib/env";

/*
  Runs on every request (via src/proxy.ts). Two jobs:
  1. Refresh the login cookie before it expires, so users stay signed in.
  2. Report who is signed in, so the proxy can do cheap redirects.

  getClaims() checks the token's signature locally against the project's
  public keys, so it does not make a database call on each request.
  Tradeoff: a user who was banned stays "valid" until their token expires
  (about an hour). Fine for this app; revisit if we add moderation.
*/
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = supabasePublicEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const userId = (data?.claims?.sub as string | undefined) ?? null;

  return { response: () => response, userId };
}
