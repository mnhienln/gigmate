/*
  Temporary sample data so the screens can be designed before the database
  exists. Phase 6 replaces this with real seeded rows from Supabase.
  All names are fictional.
*/

export const demoHeader = {
  city: "Dayton, OH",
  requests: 2,
};

export const demoFeaturedGig = {
  id: "demo-1",
  title: "Acoustic act wanted",
  venue: "Front Room Bar",
  time: "8 to 10 PM",
  pay: "$150 + tips",
  genre: "Folk, solo or duo",
  weekday: "FRI",
  day: 20,
  month: "NOV",
};

export const demoPost = {
  id: "post-1",
  author: "Mara Quinn",
  initials: "MQ",
  role: "Singer-songwriter",
  ago: "2h",
  verified: true,
  title: "New song first take",
  kind: "Original",
  length: "0:45",
  caption:
    "First time playing it out loud. Looking for a cozy room to debut it in December.",
  likes: 128,
  comments: 14,
};

/** Monday of the current week, formatted like "Nov 16". */
export function weekOfLabel(now = new Date()): string {
  const d = new Date(now);
  const diff = (d.getDay() + 6) % 7; // days since Monday
  d.setDate(d.getDate() - diff);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
