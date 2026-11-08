import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDays, localToUtcIso } from "@/lib/dates";
import type { MusicianSummary, PendingRequest, SlotStatus, WeekSlot } from "@/lib/types";

/*
  Read queries for the venue app. They run as the signed-in venue, so Row
  Level Security is active. We still filter by venue_id ourselves because
  the slots table is readable by every signed-in user (musicians browse it),
  so RLS alone would not narrow it to "my slots".
*/

/* PostgREST returns a single object for one-to-one links and an array for
   one-to-many. This hides that difference. */
function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

type RawSlot = {
  id: string;
  starts_at: string;
  set_length_min: number;
  pay_cents: number;
  genre: string | null;
  status: SlotStatus;
  is_urgent: boolean;
  boosted_until: string | null;
  applications: { id: string; status: string }[] | null;
  bookings:
    | { id: string; completed_at: string | null; musician: { display_name: string } | { display_name: string }[] | null }
    | { id: string; completed_at: string | null; musician: { display_name: string } | { display_name: string }[] | null }[]
    | null;
};

const SLOT_SELECT =
  "id, starts_at, set_length_min, pay_cents, genre, status, is_urgent, boosted_until, applications(id, status), bookings(id, completed_at, musician:profiles!bookings_musician_id_fkey(display_name))";

function toWeekSlot(raw: RawSlot): WeekSlot {
  const booking = one(raw.bookings);
  return {
    id: raw.id,
    starts_at: raw.starts_at,
    set_length_min: raw.set_length_min,
    pay_cents: raw.pay_cents,
    genre: raw.genre,
    status: raw.status,
    is_urgent: raw.is_urgent,
    boosted_until: raw.boosted_until,
    pending_count: (raw.applications ?? []).filter((a) => a.status === "pending").length,
    booking: booking
      ? { id: booking.id, completed_at: booking.completed_at, musician_name: one(booking.musician)?.display_name ?? "Musician" }
      : null,
  };
}

/** All of this venue's slots in the Monday-to-Sunday week starting at weekStart (YYYY-MM-DD). */
export async function getWeekSlots(venueId: string, weekStart: string): Promise<WeekSlot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gig_slots")
    .select(SLOT_SELECT)
    .eq("venue_id", venueId)
    .gte("starts_at", localToUtcIso(weekStart, "00:00"))
    .lt("starts_at", localToUtcIso(addDays(weekStart, 7), "00:00"))
    .neq("status", "cancelled")
    .order("starts_at");
  if (error) throw new Error("Could not load your calendar.");
  return (data as unknown as RawSlot[]).map(toWeekSlot);
}

export async function getSlot(venueId: string, slotId: string): Promise<(WeekSlot & { gear_provided: string[]; notes: string | null }) | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gig_slots")
    .select(SLOT_SELECT + ", gear_provided, notes")
    .eq("id", slotId)
    .eq("venue_id", venueId)
    .maybeSingle();
  if (error) throw new Error("Could not load that gig.");
  if (!data) return null;
  const raw = data as unknown as RawSlot & { gear_provided: string[]; notes: string | null };
  return { ...toWeekSlot(raw), gear_provided: raw.gear_provided ?? [], notes: raw.notes };
}

type RawMusician = {
  id: string;
  display_name: string;
  neighborhood: string | null;
  musician_profiles:
    | Omit<MusicianSummary, "id" | "display_name" | "neighborhood" | "avg_rating" | "review_count">
    | Omit<MusicianSummary, "id" | "display_name" | "neighborhood" | "avg_rating" | "review_count">[]
    | null;
};

const MUSICIAN_SELECT =
  "id, display_name, neighborhood, musician_profiles(genres, rate_min_cents, rate_max_cents, bio, media_links, available_tonight, verified_sound)";

async function withRatings(rows: RawMusician[]): Promise<MusicianSummary[]> {
  const supabase = await createClient();
  const ids = [...new Set(rows.map((r) => r.id))];
  const ratings = new Map<string, { avg: number; count: number }>();
  if (ids.length) {
    const { data } = await supabase.from("review_summaries").select("reviewee_id, review_count, avg_rating").in("reviewee_id", ids);
    for (const r of (data ?? []) as { reviewee_id: string; review_count: number; avg_rating: string | number }[]) {
      ratings.set(r.reviewee_id, { avg: Number(r.avg_rating), count: r.review_count });
    }
  }
  return rows.map((r) => {
    const mp = one(r.musician_profiles);
    const rating = ratings.get(r.id);
    return {
      id: r.id,
      display_name: r.display_name,
      neighborhood: r.neighborhood,
      genres: mp?.genres ?? [],
      rate_min_cents: mp?.rate_min_cents ?? null,
      rate_max_cents: mp?.rate_max_cents ?? null,
      bio: mp?.bio ?? null,
      media_links: (mp?.media_links as MusicianSummary["media_links"]) ?? [],
      available_tonight: mp?.available_tonight ?? false,
      verified_sound: mp?.verified_sound ?? false,
      avg_rating: rating?.avg ?? null,
      review_count: rating?.count ?? 0,
    };
  });
}

type RawRequest = {
  id: string;
  created_at: string;
  slot: PendingRequest["slot"] | PendingRequest["slot"][];
  musician: RawMusician | RawMusician[];
};

const REQUEST_SELECT = `id, created_at, slot:gig_slots!inner(id, starts_at, pay_cents, genre, set_length_min, venue_id), musician:profiles!applications_musician_id_fkey(${MUSICIAN_SELECT})`;

async function shapeRequests(raws: RawRequest[]): Promise<PendingRequest[]> {
  const musicians = raws.map((r) => one(r.musician)).filter((m): m is RawMusician => Boolean(m));
  const summaries = new Map((await withRatings(musicians)).map((m) => [m.id, m]));
  const out: PendingRequest[] = [];
  for (const r of raws) {
    const m = one(r.musician);
    const slot = one(r.slot);
    const summary = m ? summaries.get(m.id) : undefined;
    if (slot && summary) out.push({ id: r.id, created_at: r.created_at, slot, musician: summary });
  }
  return out;
}

/** Pending applications on this venue's slots, soonest gig first. */
export async function getPendingRequests(venueId: string): Promise<PendingRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select(REQUEST_SELECT)
    .eq("status", "pending")
    .eq("slot.venue_id", venueId)
    .order("created_at");
  if (error) throw new Error("Could not load your requests.");
  const rows = await shapeRequests(data as unknown as RawRequest[]);
  return rows.sort((a, b) => a.slot.starts_at.localeCompare(b.slot.starts_at) || a.created_at.localeCompare(b.created_at));
}

/** Specific pending applications by id, for the side-by-side compare view. */
export async function getRequestsByIds(venueId: string, ids: string[]): Promise<PendingRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select(REQUEST_SELECT)
    .in("id", ids)
    .eq("status", "pending")
    .eq("slot.venue_id", venueId);
  if (error) throw new Error("Could not load those requests.");
  const rows = await shapeRequests(data as unknown as RawRequest[]);
  return ids.map((id) => rows.find((r) => r.id === id)).filter((r): r is PendingRequest => Boolean(r));
}

export async function getVenueProfile(venueId: string) {
  const supabase = await createClient();
  const [p, v, r, rel] = await Promise.all([
    supabase.from("profiles").select("display_name, neighborhood").eq("id", venueId).single(),
    supabase.from("venue_profiles").select("venue_type, capacity, has_pa, stage_notes, address").eq("profile_id", venueId).single(),
    supabase.from("review_summaries").select("review_count, avg_rating").eq("reviewee_id", venueId).maybeSingle(),
    supabase.from("venue_reliability").select("late_cancellations, gigs_hosted").eq("venue_id", venueId).maybeSingle(),
  ]);
  if (p.error || v.error) throw new Error("Could not load your venue profile.");
  return {
    display_name: p.data.display_name as string,
    neighborhood: p.data.neighborhood as string | null,
    venue_type: v.data.venue_type as string | null,
    capacity: v.data.capacity as number | null,
    has_pa: v.data.has_pa as boolean,
    stage_notes: v.data.stage_notes as string | null,
    address: v.data.address as string | null,
    late_cancellations: (rel.data?.late_cancellations as number | undefined) ?? 0,
    gigs_hosted: (rel.data?.gigs_hosted as number | undefined) ?? 0,
    rating: r.data ? { avg: Number(r.data.avg_rating), count: r.data.review_count as number } : null,
  };
}
