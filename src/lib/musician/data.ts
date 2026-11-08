import "server-only";
import { createClient } from "@/lib/supabase/server";
import { whenRange, type When } from "@/lib/dates";
import { initialsOf } from "@/lib/media";
import { ANY_GENRE } from "@/lib/options";
import type { ApplicationStatus, FeedPost, MyApplication, MyBooking, MyProfile, OpenSlot, VenueSummary } from "@/lib/types";

/*
  Read queries for the musician app. They run as the signed-in musician.
  Slots, venues and posts are readable by every signed-in user (that is the
  point of a marketplace), while applications and bookings are narrowed to
  "mine" both by RLS and by the explicit musician_id filters below.
*/

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

type RawVenue = {
  id: string;
  display_name: string;
  neighborhood: string | null;
  venue_profiles: { venue_type: string | null; has_pa: boolean; address: string | null } | { venue_type: string | null; has_pa: boolean; address: string | null }[] | null;
};

const VENUE_FIELDS = "id, display_name, neighborhood, venue_profiles(venue_type, has_pa, address)";
const VENUE_EMBED = `venue:profiles!gig_slots_venue_id_fkey(${VENUE_FIELDS})`;

function toVenue(raw: RawVenue | RawVenue[] | null): VenueSummary {
  const v = one(raw);
  const vp = one(v?.venue_profiles);
  return {
    id: v?.id ?? "",
    name: v?.display_name ?? "A venue",
    neighborhood: v?.neighborhood ?? null,
    venue_type: vp?.venue_type ?? null,
    has_pa: vp?.has_pa ?? false,
    address: vp?.address ?? null,
  };
}

export type DiscoverFilters = { when: When; genre?: string; minPayDollars?: number };

type RawSlot = {
  id: string;
  starts_at: string;
  set_length_min: number;
  pay_cents: number;
  genre: string | null;
  gear_provided: string[] | null;
  notes: string | null;
  is_urgent: boolean;
  boosted_until: string | null;
  venue: RawVenue | RawVenue[] | null;
};

const SLOT_FIELDS = `id, starts_at, set_length_min, pay_cents, genre, gear_provided, notes, is_urgent, boosted_until, ${VENUE_EMBED}`;

async function attachMyStatus(musicianId: string, rows: RawSlot[]): Promise<OpenSlot[]> {
  const supabase = await createClient();
  const mine = new Map<string, ApplicationStatus>();
  if (rows.length) {
    const { data } = await supabase
      .from("applications")
      .select("slot_id, status")
      .eq("musician_id", musicianId)
      .in("slot_id", rows.map((r) => r.id));
    for (const a of (data ?? []) as { slot_id: string; status: ApplicationStatus }[]) mine.set(a.slot_id, a.status);
  }
  return rows.map((r) => ({
    id: r.id,
    starts_at: r.starts_at,
    set_length_min: r.set_length_min,
    pay_cents: r.pay_cents,
    genre: r.genre,
    gear_provided: r.gear_provided ?? [],
    notes: r.notes,
    is_urgent: r.is_urgent,
    boosted_until: r.boosted_until,
    venue: toVenue(r.venue),
    my_status: mine.get(r.id) ?? null,
  }));
}

/** Open, not-yet-started gigs. Urgent ones first, then soonest. */
export async function getOpenSlots(musicianId: string, filters: DiscoverFilters, limit = 60): Promise<OpenSlot[]> {
  const supabase = await createClient();
  const range = whenRange(filters.when);

  let query = supabase.from("gig_slots").select(SLOT_FIELDS).eq("status", "open").gt("starts_at", range.from);
  if (range.to) query = query.lt("starts_at", range.to);
  // A slot with no genre means "any genre", which suits every musician.
  // `genre` comes from our fixed list (validated by the caller), so it is safe in the filter string.
  if (filters.genre && filters.genre !== ANY_GENRE) query = query.or(`genre.eq.${filters.genre},genre.is.null`);
  if (filters.minPayDollars) query = query.gte("pay_cents", filters.minPayDollars * 100);

  const { data, error } = await query.order("is_urgent", { ascending: false }).order("starts_at").limit(limit);
  if (error) throw new Error("Could not load gigs.");
  return attachMyStatus(musicianId, data as unknown as RawSlot[]);
}

/** The one gig to feature at the top of the feed. */
export async function getFeaturedSlot(musicianId: string): Promise<OpenSlot | null> {
  const slots = await getOpenSlots(musicianId, { when: "any" }, 1);
  return slots[0] ?? null;
}

export async function getPendingCount(musicianId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("musician_id", musicianId)
    .eq("status", "pending");
  return count ?? 0;
}

type RawApplication = {
  id: string;
  status: ApplicationStatus;
  created_at: string;
  slot: { id: string; starts_at: string; set_length_min: number; pay_cents: number; genre: string | null; venue: RawVenue | RawVenue[] | null } | { id: string; starts_at: string; set_length_min: number; pay_cents: number; genre: string | null; venue: RawVenue | RawVenue[] | null }[];
};

export async function getMyApplications(musicianId: string): Promise<MyApplication[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select(`id, status, created_at, slot:gig_slots!inner(id, starts_at, set_length_min, pay_cents, genre, ${VENUE_EMBED})`)
    .eq("musician_id", musicianId)
    .in("status", ["pending", "declined", "withdrawn"])
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load your applications.");
  const out: MyApplication[] = [];
  for (const r of data as unknown as RawApplication[]) {
    const s = one(r.slot);
    if (s) out.push({ id: r.id, status: r.status, created_at: r.created_at, slot: { id: s.id, starts_at: s.starts_at, set_length_min: s.set_length_min, pay_cents: s.pay_cents, genre: s.genre, venue: toVenue(s.venue) } });
  }
  return out;
}

type RawBooking = {
  id: string;
  completed_at: string | null;
  cancelled_at: string | null;
  agreed_pay_cents: number;
  slot: { id: string; starts_at: string; set_length_min: number; genre: string | null; venue: RawVenue | RawVenue[] | null } | { id: string; starts_at: string; set_length_min: number; genre: string | null; venue: RawVenue | RawVenue[] | null }[];
};

export async function getMyBookings(musicianId: string): Promise<MyBooking[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(`id, completed_at, cancelled_at, agreed_pay_cents, slot:gig_slots!inner(id, starts_at, set_length_min, genre, ${VENUE_EMBED})`)
    .eq("musician_id", musicianId);
  if (error) throw new Error("Could not load your bookings.");
  const out: MyBooking[] = [];
  for (const r of data as unknown as RawBooking[]) {
    const s = one(r.slot);
    if (s) out.push({ id: r.id, completed_at: r.completed_at, cancelled_at: r.cancelled_at, agreed_pay_cents: r.agreed_pay_cents, slot: { id: s.id, starts_at: s.starts_at, set_length_min: s.set_length_min, genre: s.genre, venue: toVenue(s.venue) } });
  }
  return out;
}

export async function getMyProfile(musicianId: string): Promise<MyProfile> {
  const supabase = await createClient();
  const [p, m, r] = await Promise.all([
    supabase.from("profiles").select("display_name, neighborhood").eq("id", musicianId).single(),
    supabase.from("musician_profiles").select("genres, rate_min_cents, rate_max_cents, bio, media_links, available_tonight, verified_sound").eq("profile_id", musicianId).single(),
    supabase.from("review_summaries").select("review_count, avg_rating").eq("reviewee_id", musicianId).maybeSingle(),
  ]);
  if (p.error || m.error) throw new Error("Could not load your profile.");
  return {
    id: musicianId,
    display_name: p.data.display_name as string,
    neighborhood: p.data.neighborhood as string | null,
    genres: (m.data.genres as string[]) ?? [],
    rate_min_cents: m.data.rate_min_cents as number | null,
    rate_max_cents: m.data.rate_max_cents as number | null,
    bio: m.data.bio as string | null,
    media_links: (m.data.media_links as MyProfile["media_links"]) ?? [],
    available_tonight: m.data.available_tonight as boolean,
    verified_sound: m.data.verified_sound as boolean,
    rating: r.data ? { avg: Number(r.data.avg_rating), count: r.data.review_count as number } : null,
  };
}

type RawPost = {
  id: string;
  kind: "announcement" | "clip";
  body: string;
  media_url: string | null;
  created_at: string;
  author:
    | { id: string; display_name: string; role: "musician" | "venue"; musician_profiles: { verified_sound: boolean } | { verified_sound: boolean }[] | null }
    | { id: string; display_name: string; role: "musician" | "venue"; musician_profiles: { verified_sound: boolean } | { verified_sound: boolean }[] | null }[]
    | null;
};

/** Newest first. */
export async function getRecentPosts(limit = 20): Promise<FeedPost[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("id, kind, body, media_url, created_at, author:profiles!posts_author_id_fkey(id, display_name, role, musician_profiles(verified_sound))")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Could not load the feed.");
  const out: FeedPost[] = [];
  for (const r of data as unknown as RawPost[]) {
    const a = one(r.author);
    if (!a) continue;
    out.push({
      id: r.id,
      kind: r.kind,
      body: r.body,
      media_url: r.media_url,
      created_at: r.created_at,
      author: { id: a.id, name: a.display_name, role: a.role, initials: initialsOf(a.display_name), verified_sound: one(a.musician_profiles)?.verified_sound ?? false },
    });
  }
  return out;
}
