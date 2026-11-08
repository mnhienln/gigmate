import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublicEnv } from "@/lib/env";

/*
  Supabase client for server components and server actions. It acts AS THE
  SIGNED-IN USER (it forwards their session cookie), so Row Level Security
  applies to every query. This is the client to use by default.
*/
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = supabasePublicEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server components cannot set cookies. That is fine: proxy.ts
          // refreshes the session cookie on every request instead.
        }
      },
    },
  });
}
