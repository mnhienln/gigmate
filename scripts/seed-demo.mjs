// Fills the app with fictional Dayton-area bars that need musicians, so every screen looks alive.
//
//   NODE_USE_ENV_PROXY=1 npm run seed        (inside the Claude cloud container)
//   npm run seed                             (anywhere else)
//
// SAFE TO RE-RUN. It refreshes the same fictional venues and replaces their FUTURE open gigs and their posts,
// always placing gigs in the NEXT THREE WEEKS from today. Run it again the day before the demo.
// It never touches the two demo login accounts (Mara Quinn and Front Room Bar).
//
// EVERYTHING HERE IS INVENTED: venue names, addresses, pay and notes. If a name happens to match a
// real business, tell the team and rename it. Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// and DEMO_PASSWORD (the invented venues share the demo password).

import { createClient } from "@supabase/supabase-js";
import { addDays, localToUtcIso, todayLocal } from "../src/lib/dates.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_PASSWORD;
if (!url || !key || !password) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or DEMO_PASSWORD.");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const PA = "PA system", MICS = "Mics", DRUMS = "Drum kit", AMPS = "Backline amps", KEYS = "Piano or keys", ENGINEER = "Sound engineer";

const VENUES = [
  { slug: "velvet-pigeon", name: "The Velvet Pigeon", type: "Bar", hood: "Oregon District", cap: 90, pa: true, addr: "219 E Fifth St, Dayton, OH 45402", notes: "Low corner stage in front of a velvet curtain. House engineer on Friday and Saturday nights." },
  { slug: "hollow-oak", name: "Hollow Oak Taproom", type: "Brewery", hood: "South Park", cap: 140, pa: true, addr: "1408 Wayne Ave, Dayton, OH 45410", notes: "Open taproom floor with the stage beside the fermenters. Load in through the side door." },
  { slug: "neon-heron", name: "Neon Heron", type: "Bar", hood: "Downtown", cap: 120, pa: true, addr: "36 N Main St, Dayton, OH 45402", notes: "Dark room with a light rig and a fog machine. Late crowd, loud and fun." },
  { slug: "lantern-loom", name: "Lantern & Loom Coffeehouse", type: "Coffee shop", hood: "Belmont", cap: 55, pa: false, addr: "2210 Troy St, Dayton, OH 45404", notes: "Cozy room, no PA. Acoustic acts only. Stage is a rug and a stool." },
  { slug: "brass-compass", name: "Brass Compass Brewing", type: "Brewery", hood: "Fairgrounds", cap: 180, pa: true, addr: "900 Shroyer Rd, Dayton, OH 45419", notes: "Covered outdoor stage plus an indoor room. Full backline on site." },
  { slug: "thistle-throne", name: "Thistle & Throne Pub", type: "Bar", hood: "Oakwood", cap: 75, pa: false, addr: "2308 Far Hills Ave, Dayton, OH 45419", notes: "Small pub with a fireplace. Duos and trios do best. Bring your own PA or play it unplugged." },
  { slug: "saltbox-social", name: "Saltbox Social", type: "Restaurant", hood: "Kettering", cap: 100, pa: true, addr: "3150 Wilmington Pike, Kettering, OH 45429", notes: "Dinner restaurant with a piano and a small stage. Keep volume friendly." },
  { slug: "tipsy-atlas", name: "The Tipsy Atlas", type: "Bar", hood: "Downtown", cap: 110, pa: true, addr: "124 S Jefferson St, Dayton, OH 45402", notes: "Map-covered walls, trivia on Mondays, live music most other nights." },
  { slug: "cinder-alley", name: "Cinder Alley Bar", type: "Bar", hood: "Oregon District", cap: 60, pa: true, addr: "18 Cinder Alley, Dayton, OH 45402", notes: "Tiny and loud. Packed on Saturdays. Great for punk, indie and anything raw." },
  { slug: "mothlight", name: "Mothlight Lounge", type: "Music hall", hood: "Downtown", cap: 320, pa: true, addr: "310 E Third St, Dayton, OH 45402", notes: "Ticketed room with full production. Soundcheck at 5 PM on show days." },
  { slug: "quarry-cantina", name: "Quarry Street Cantina", type: "Restaurant", hood: "Beavercreek", cap: 130, pa: true, addr: "4455 Quarry St, Beavercreek, OH 45431", notes: "Patio and indoor stage. Families early, adults late." },
  { slug: "foxglove", name: "Foxglove Tavern", type: "Bar", hood: "Miamisburg", cap: 85, pa: true, addr: "27 S Main St, Miamisburg, OH 45342", notes: "Neighborhood tavern with a loyal weeknight crowd. Blues Thursdays." },
  { slug: "bluebird-back", name: "Bluebird Backroom", type: "Bar", hood: "South Park", cap: 70, pa: true, addr: "1011 Brown St, Dayton, OH 45409", notes: "Back room behind the bar with its own stage and a small dance floor." },
  { slug: "gilded-hen", name: "The Gilded Hen", type: "Restaurant", hood: "Oakwood", cap: 95, pa: false, addr: "1815 Far Hills Ave, Dayton, OH 45419", notes: "Brunch and dinner spot with a piano. Soft, listening-friendly sets." },
];

// [venue slug, days from today, start time (Dayton), set minutes, pay in dollars, genre or null for any, gear provided, note]
const SLOTS = [
  ["velvet-pigeon", 2, "21:00", 120, 180, "Indie", [PA, MICS, ENGINEER], "Late set for a cocktail crowd. Tip jar runs $80 to $150 on weekends. Two drink tickets for the band."],
  ["velvet-pigeon", 9, "22:00", 90, 220, "Soul and R&B", [PA, MICS, ENGINEER], "Friday late night. $8 door, and the band keeps the first $100 of the door on top of the pay."],
  ["velvet-pigeon", 16, "20:30", 120, 200, "Jazz", [PA, MICS, KEYS], "Listening room, quiet crowd. Standards and originals both welcome."],
  ["hollow-oak", 1, "18:00", 90, 120, "Folk", [PA, MICS], "Sunday taproom set, family friendly. Tips are good, usually $60 to $100. Free pint and a pretzel."],
  ["hollow-oak", 5, "19:30", 120, 160, "Country", [PA, MICS, AMPS], "Thursday crowd that loves a singalong. Pay plus a tab for the band."],
  ["hollow-oak", 12, "20:00", 120, 250, "Rock", [PA, MICS, DRUMS, AMPS], "Anniversary weekend, big crowd expected. Load in at 6 PM."],
  ["neon-heron", 3, "21:30", 120, 300, "Electronic", [PA, MICS, ENGINEER], "DJ or live electronic. Lights and fog machine provided. Doors at 9."],
  ["neon-heron", 10, "22:00", 180, 350, "Hip hop", [PA, MICS, ENGINEER], "Long late-night slot. Open to a full crew. Bar tab for the group."],
  ["neon-heron", 17, "21:00", 90, 150, "Pop", [PA, MICS], "Cover band night, requests welcome. Tips go 100 percent to the band."],
  ["lantern-loom", 2, "10:30", 60, 60, "Folk", [MICS], "Weekend morning acoustic set. Quiet room, no PA. Coffee and a pastry on the house, tips usually $30 to $50."],
  ["lantern-loom", 8, "18:30", 90, 90, "Indie", [MICS], "Evening singer-songwriter slot. Sell your merch at the counter, no cut."],
  ["brass-compass", 4, "19:00", 120, 275, "Rock", [PA, MICS, DRUMS, ENGINEER], "Saturday headliner slot on the covered stage. Full backline provided."],
  ["brass-compass", 11, "20:00", 120, 325, "Blues", [PA, MICS, DRUMS, AMPS, ENGINEER], "Blues night with a loyal regular crowd. Pay plus two meals."],
  ["brass-compass", 18, "19:30", 180, 400, "Country", [PA, MICS, DRUMS, AMPS, ENGINEER], "Long set, two acts trading off. Outdoor stage with cover if it rains."],
  ["thistle-throne", 3, "20:00", 120, 130, "Folk", [MICS], "Pub vibes. Fiddle and guitar duos do well. A pint after your set."],
  ["thistle-throne", 13, "21:00", 90, 150, "Covers", [MICS], "Friday singalong crowd. Bring songs people know. Tip jar usually $70 to $120."],
  ["saltbox-social", 2, "18:30", 120, 150, "Jazz", [PA, MICS, KEYS], "Dinner crowd, keep it low. Dinner for the band is included."],
  ["saltbox-social", 7, "19:00", 120, 170, "Soul and R&B", [PA, MICS, KEYS], "Date-night crowd. Mellow grooves, good tips. Dinner included."],
  ["tipsy-atlas", 1, "20:00", 120, 160, null, [PA, MICS], "Monday after trivia. Any genre that fits a relaxed bar. Pay plus a free round for the band."],
  ["tipsy-atlas", 6, "21:30", 120, 210, "Rock", [PA, MICS, DRUMS], "Saturday rock night. Drum kit on site, bring your own cymbals."],
  ["tipsy-atlas", 14, "21:00", 90, 180, "Indie", [PA, MICS], "Friday opener for a local headliner. Great chance to meet the scene."],
  ["cinder-alley", 4, "21:00", 60, 100, "Indie", [MICS], "Tiny room, packed Saturdays. Short, loud, memorable. Door split after the first $100."],
  ["cinder-alley", 11, "22:00", 90, 120, "Rock", [PA, MICS], "Punk and raw rock welcome. No sound engineer, just a friendly bartender and a loud PA."],
  ["mothlight", 6, "20:00", 90, 450, "Rock", [PA, MICS, DRUMS, AMPS, ENGINEER], "Opening slot for a touring act. Ticketed, full production, soundcheck at 5 PM."],
  ["mothlight", 13, "19:30", 60, 400, "Indie", [PA, MICS, DRUMS, AMPS, ENGINEER], "Support slot, 60 minutes. Merch table provided. Great exposure."],
  ["quarry-cantina", 5, "19:00", 120, 180, "Country", [PA, MICS], "Patio set if the weather holds, indoors if not. Pay plus dinner."],
  ["foxglove", 3, "19:30", 120, 140, "Blues", [PA, MICS, AMPS], "Blues Thursday, loyal regulars. Tips are strong, usually $80 to $140."],
  ["foxglove", 10, "20:30", 90, 130, "Folk", [PA, MICS], "Mellow weeknight set. Pay plus a meal from the kitchen."],
  ["bluebird-back", 5, "20:00", 90, 110, "Soul and R&B", [PA, MICS], "Back room with a small dance floor. A crowd that wants to move."],
  ["bluebird-back", 12, "21:00", 120, 150, "Hip hop", [PA, MICS], "Open to MCs, DJs and live bands. Bar tab and a share of the cover."],
  ["gilded-hen", 2, "11:00", 120, 190, "Jazz", [MICS, KEYS], "Sunday brunch music. Piano on site, soft volume, brunch for the band."],
];

const POSTS = [
  ["velvet-pigeon", 5, "Late set slots for the next two weekends are up. Cocktail crowd, a house engineer, and two drink tickets for the band."],
  ["hollow-oak", 9, "The patio is open again. Sunday taproom sets are family friendly and the tips have been great. Apply in the app."],
  ["neon-heron", 14, "Looking for electronic and hip hop acts for our late slots. Lights and a fog machine are on us."],
  ["lantern-loom", 20, "Morning acoustic sets are back on weekends. Coffee and a pastry for every act, no PA needed."],
  ["brass-compass", 27, "Anniversary weekend is coming. We are booking bands for the covered outdoor stage, with a full backline."],
  ["saltbox-social", 33, "Jazz and soul for the dinner crowd. Dinner for the band is always included."],
  ["mothlight", 41, "We are filling a few opening slots for touring shows this month. Full production, ticketed rooms, soundcheck at 5."],
  ["foxglove", 52, "Blues Thursdays need more bands. Strong tips and a friendly regular crowd."],
];

const emailOf = (slug) => `venue.${slug}@gigmate.test`;

async function listAllUsers() {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  return data.users;
}

console.log("Venues");
const existing = await listAllUsers();
const ids = new Map();
for (const v of VENUES) {
  let id = existing.find((u) => u.email === emailOf(v.slug))?.id;
  if (!id) {
    const created = await admin.auth.admin.createUser({
      email: emailOf(v.slug),
      password,
      email_confirm: true,
      user_metadata: { role: "venue", display_name: v.name },
    });
    if (created.error) throw created.error;
    id = created.data.user.id;
  } else {
    await admin.auth.admin.updateUserById(id, { password, user_metadata: { role: "venue", display_name: v.name } });
  }
  ids.set(v.slug, id);

  const p = await admin.from("profiles").update({ display_name: v.name, neighborhood: v.hood, onboarded_at: new Date().toISOString() }).eq("id", id);
  if (p.error) throw p.error;
  const q = await admin
    .from("venue_profiles")
    .update({ venue_type: v.type, capacity: v.cap, has_pa: v.pa, stage_notes: v.notes, address: v.addr })
    .eq("profile_id", id);
  if (q.error) throw q.error;
  console.log(`  ready: ${v.name}`);
}

const venueIds = [...ids.values()];
console.log("Gigs and posts");
// Only refresh FUTURE open gigs. Past gigs, bookings and reviews (from seed-musicians.mjs) stay put.
const del1 = await admin.from("gig_slots").delete().in("venue_id", venueIds).eq("status", "open").gt("starts_at", new Date().toISOString());
if (del1.error) throw del1.error;
// Only the text announcements are replaced. Photos and videos (seed:venues) are kept.
const del2 = await admin.from("posts").delete().in("author_id", venueIds).is("media_path", null);
if (del2.error) throw del2.error;

const today = todayLocal();
const slotRows = SLOTS.map(([slug, days, time, minutes, dollars, genre, gear, notes]) => ({
  venue_id: ids.get(slug),
  starts_at: localToUtcIso(addDays(today, days), time),
  set_length_min: minutes,
  pay_cents: dollars * 100,
  genre,
  gear_provided: gear,
  notes,
  is_urgent: false,
}));
const ins1 = await admin.from("gig_slots").insert(slotRows);
if (ins1.error) throw ins1.error;

const postRows = POSTS.map(([slug, hoursAgo, body]) => ({
  author_id: ids.get(slug),
  kind: "announcement",
  body,
  created_at: new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString(),
}));
const ins2 = await admin.from("posts").insert(postRows);
if (ins2.error) throw ins2.error;

console.log(`Done: ${VENUES.length} fictional venues, ${slotRows.length} open gigs over the next 3 weeks, ${postRows.length} announcements.`);
