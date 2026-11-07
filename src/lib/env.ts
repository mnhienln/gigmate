/*
  Read an environment variable or fail with a message a human can act on.
  Next.js inlines NEXT_PUBLIC_* values at build time, so those must be written
  as literal `process.env.NEXT_PUBLIC_X` accesses at the call site. This helper
  is only for checking they exist.
*/
export function need(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill it in (see README).`,
    );
  }
  return value;
}

export function supabasePublicEnv() {
  return {
    url: need(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: need(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ),
  };
}

export function hasSupabasePublicEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
