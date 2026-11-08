import { createBrowserClient } from "@supabase/ssr";

/*
  Supabase client for the BROWSER. It uses only the publishable key plus the
  signed-in user's own session, so every upload is checked against the storage
  rules (you can only write inside your own folder). Used for uploading photos
  and videos straight from the phone to storage, so big files never pass through
  our server (Vercel limits request bodies to about 4.5 MB).
  The NEXT_PUBLIC_ names must be written out in full here so Next can inline them.
*/
export function createBrowserSupabase() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
