import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "musician" | "venue";

export type CurrentProfile = {
  id: string;
  role: Role;
  display_name: string;
  city: string;
  neighborhood: string | null;
  onboarded_at: string | null;
};

export const homeFor = (role: Role) =>
  role === "musician" ? "/m/feed" : "/v/calendar";

/*
  The single place that answers "who is this and what are they?".
  Wrapped in React's cache() so many components can call it during one
  request and only the first call hits the database.
  Returns null when signed out.
*/
export const getCurrentProfile = cache(
  async (): Promise<CurrentProfile | null> => {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;
    if (!userId) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, display_name, city, neighborhood, onboarded_at")
      .eq("id", userId)
      .maybeSingle();

    return (profile as CurrentProfile | null) ?? null;
  },
);

/** For any page that needs a signed-in user, role not important. */
export async function requireProfile(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}

/**
  Guard for an app shell. Wrong role goes to their own app; unfinished
  onboarding goes to onboarding. This is the real check; proxy.ts is only a
  convenience redirect.
*/
export async function requireRole(role: Role): Promise<CurrentProfile> {
  const profile = await requireProfile();
  if (profile.role !== role) redirect(homeFor(profile.role));
  if (!profile.onboarded_at) redirect("/onboarding/1");
  return profile;
}
