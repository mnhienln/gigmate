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
  /** An uploaded photo or video (stored in Supabase Storage), if any. */
  media: { type: "image" | "video"; path: string; poster_path: string | null } | null;
  created_at: string;
  author: { id: string; name: string; role: "musician" | "venue"; initials: string; verified_sound: boolean; avatar_path: string | null };
};

// ---------------------------------------------------------------------------
// Instagram-style profiles
// ---------------------------------------------------------------------------
export type ProfilePost = {
  id: string;
  media_type: "image" | "video";
  media_path: string;
  poster_path: string | null;
  body: string;
  created_at: string;
};

export type Product = {
  id: string;
  title: string;
  price_cents: number;
  description: string | null;
  photo_path: string | null;
  buy_url: string | null;
};

export type ProfileView = {
  id: string;
  display_name: string;
  neighborhood: string | null;
  avatar_path: string | null;
  verified_sound: boolean;
  bio: string | null;
  genres: string[];
  rate_min_cents: number | null;
  rate_max_cents: number | null;
  available_tonight: boolean;
  links: { label: string; url: string }[];
  gigs_played: number;
  rating: { avg: number; count: number } | null;
  posts: ProfilePost[];
  products: Product[];
};
