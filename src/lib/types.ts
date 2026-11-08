// Row shapes returned by our queries. Hand-written for now; if the schema grows,
// generate them with `supabase gen types` instead.

export type SlotStatus = "open" | "booked" | "completed" | "cancelled";

export type ApplicationStatus = "pending" | "accepted" | "declined" | "withdrawn";

export type MusicianSummary = {
  id: string;
  display_name: string;
  neighborhood: string | null;
  genres: string[];
  rate_min_cents: number | null;
  rate_max_cents: number | null;
  bio: string | null;
  media_links: { label: string; url: string }[];
  available_tonight: boolean;
  verified_sound: boolean;
  avg_rating: number | null;
  review_count: number;
};

export type WeekSlot = {
  id: string;
  starts_at: string;
  set_length_min: number;
  pay_cents: number;
  genre: string | null;
  status: SlotStatus;
  is_urgent: boolean;
  boosted_until: string | null;
  pending_count: number;
  booking: { id: string; completed_at: string | null; musician_name: string } | null;
};

export type PendingRequest = {
  id: string;
  created_at: string;
  slot: { id: string; starts_at: string; pay_cents: number; genre: string | null; set_length_min: number };
  musician: MusicianSummary;
};

// ---------------------------------------------------------------------------
// Musician app
// ---------------------------------------------------------------------------
export type VenueSummary = {
  id: string;
  name: string;
  neighborhood: string | null;
  venue_type: string | null;
  has_pa: boolean;
  address: string | null;
};

export type OpenSlot = {
  id: string;
  starts_at: string;
  set_length_min: number;
  pay_cents: number;
  genre: string | null;
  gear_provided: string[];
  notes: string | null;
  is_urgent: boolean;
  boosted_until: string | null;
  venue: VenueSummary;
  /** This musician's application to the slot, if any. */
  my_status: ApplicationStatus | null;
};

export type MyApplication = {
  id: string;
  status: ApplicationStatus;
  created_at: string;
  slot: { id: string; starts_at: string; set_length_min: number; pay_cents: number; genre: string | null; venue: VenueSummary };
};

export type MyBooking = {
  id: string;
  completed_at: string | null;
  cancelled_at: string | null;
  agreed_pay_cents: number;
  slot: { id: string; starts_at: string; set_length_min: number; genre: string | null; venue: VenueSummary };
};

export type MyProfile = {
  id: string;
  display_name: string;
  neighborhood: string | null;
  genres: string[];
  rate_min_cents: number | null;
  rate_max_cents: number | null;
  bio: string | null;
  media_links: { label: string; url: string }[];
  available_tonight: boolean;
  verified_sound: boolean;
  rating: { avg: number; count: number } | null;
};

export type FeedPost = {
  id: string;
  kind: "announcement" | "clip";
  body: string;
  media_url: string | null;
  created_at: string;
  author: { id: string; name: string; role: "musician" | "venue"; initials: string; verified_sound: boolean };
};
