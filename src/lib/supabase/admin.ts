import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { need } from "@/lib/env";

/*
  Supabase client with the SECRET key. It BYPASSES Row Level Security, so it
  may only be used in trusted server code: the Stripe webhook, the seed
  script, and similar. `import "server-only"` makes the build fail if anyone
  imports this file from a client component, which keeps the key out of
  the browser bundle.
*/
export function createAdminClient() {
  return createSupabaseClient(
    need(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    need(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
