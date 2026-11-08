// Shared choices for onboarding and later for filters.

export const GENRES = [
  "Folk",
  "Rock",
  "Indie",
  "Jazz",
  "Blues",
  "Country",
  "Soul and R&B",
  "Hip hop",
  "Pop",
  "Electronic",
  "Covers",
  "Open to anything",
] as const;

export const NEIGHBORHOODS = [
  "Oregon District",
  "Downtown",
  "South Park",
  "Belmont",
  "Fairgrounds",
  "Kettering",
  "Oakwood",
  "Beavercreek",
  "Miamisburg",
  "Somewhere else",
] as const;

export const VENUE_TYPES = [
  "Bar",
  "Brewery",
  "Restaurant",
  "Coffee shop",
  "Music hall",
  "Other",
] as const;

export const GEAR = [
  "PA system",
  "Mics",
  "Drum kit",
  "Backline amps",
  "Piano or keys",
  "Sound engineer",
] as const;

export const SET_LENGTHS = [30, 45, 60, 90, 120, 180] as const;
export const ANY_GENRE = "Any genre";
