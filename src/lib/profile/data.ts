import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Product, ProfilePost, ProfileView } from "@/lib/types";

/*
  Everything shown on an Instagram-style musician profile, in one place.
  Any signed-in user can read it (that is how venues see a band before booking),
  so there is no ownership filter here. Only the musician can change it, and
  that is enforced by the database rules and by the actions in media-actions.ts.
  Returns null if the id is not a musician.
*/
export async function getProfileView(profileId: string): Promise<ProfileView | null> {
  const supabase = await createClient();

  const [p, m, posts, products, stats, rating] = await Promise.all([
    supabase.from("profiles").select("id, role, display_name, neighborhood, avatar_url").eq("id", profileId).maybeSingle(),
    supabase
      .from("musician_profiles")
      .select("genres, rate_min_cents, rate_max_cents, bio, media_links, available_tonight, verified_sound")
      .eq("profile_id", profileId)
      .maybeSingle(),
    supabase
      .from("posts")
      .select("id, media_type, media_path, poster_path, body, created_at")
      .eq("author_id", profileId)
      .not("media_path", "is", null)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("products")
      .select("id, title, price_cents, description, photo_path, buy_url")
      .eq("owner_id", profileId)
      .order("created_at", { ascending: false })
      .limit(24),
    supabase.from("musician_stats").select("gigs_played").eq("musician_id", profileId).maybeSingle(),
    supabase.from("review_summaries").select("review_count, avg_rating").eq("reviewee_id", profileId).maybeSingle(),
  ]);

  if (!p.data || p.data.role !== "musician" || !m.data) return null;
  if (posts.error || products.error) throw new Error("Could not load this profile.");

  return {
    id: p.data.id as string,
    display_name: p.data.display_name as string,
    neighborhood: p.data.neighborhood as string | null,
    avatar_path: p.data.avatar_url as string | null,
    verified_sound: m.data.verified_sound as boolean,
    bio: m.data.bio as string | null,
    genres: (m.data.genres as string[]) ?? [],
    rate_min_cents: m.data.rate_min_cents as number | null,
    rate_max_cents: m.data.rate_max_cents as number | null,
    available_tonight: m.data.available_tonight as boolean,
    links: ((m.data.media_links as { label: string; url: string }[]) ?? []).filter((l) => l?.url),
    gigs_played: (stats.data?.gigs_played as number | undefined) ?? 0,
    rating: rating.data ? { avg: Number(rating.data.avg_rating), count: rating.data.review_count as number } : null,
    posts: posts.data as unknown as ProfilePost[],
    products: products.data as unknown as Product[],
  };
}
