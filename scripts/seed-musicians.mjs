// Adds 15 fictional musicians and a history of completed gigs with reviews, so profiles, ratings,
// "gigs played" counts and the feed all look alive.
//
//   NODE_USE_ENV_PROXY=1 npm run seed:musicians        (inside the Claude cloud container)
//
// Run `npm run seed` (the venues) FIRST. Safe to re-run: it refreshes the same fictional acts, replaces their
// posts and history, and never touches the two demo login accounts (Mara Quinn, Front Room Bar).
//
// EVERYTHING HERE IS INVENTED: act names, bios, reviews and the pictures (drawn by a headless browser, no photos
// of real people). Music links point to the front page of each streaming site on purpose, because these acts do
// not exist. If a name happens to match a real act, rename it. Needs NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY and DEMO_PASSWORD, and Playwright (preinstalled in the cloud container).

import { createClient } from "@supabase/supabase-js";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { addDays, localToUtcIso, todayLocal } from "../src/lib/dates.ts";
import { PALETTES, POST_STYLES, artAvatar, hash, rng } from "./lib/art.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_PASSWORD;
if (!url || !key || !password) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or DEMO_PASSWORD.");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const req = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = req("playwright"));
} catch {
  ({ chromium } = req(execSync("npm root -g").toString().trim() + "/playwright"));
}

// ---------------------------------------------------------------------------------------------
// The acts
// ---------------------------------------------------------------------------------------------
const SPOTIFY = "https://open.spotify.com/", YOUTUBE = "https://www.youtube.com/", SOUNDCLOUD = "https://soundcloud.com/", BANDCAMP = "https://bandcamp.com/";

// slug, name, neighborhood, genres, [rate min, rate max], bio, available tonight, verified sound, links
const ACTS = [
  { slug: "juniper", name: "Juniper & the Late Bloomers", hood: "Oregon District", genres: ["Folk", "Indie"], rate: [150, 300], tonight: false, verified: true, links: [SPOTIFY, YOUTUBE],
    bio: "Two voices, one banjo and a kick drum made from a suitcase. Porch songs for people who stay for the last call.",
  },
  { slug: "cass", name: "Cass Holloway", hood: "Belmont", genres: ["Indie", "Folk"], rate: [100, 220], tonight: true, verified: false, links: [SPOTIFY, SOUNDCLOUD, YOUTUBE],
    bio: "Singer-songwriter with a loop pedal and a lot of kitchen-table songs. Quiet rooms are my favorite rooms.",
  },
  { slug: "rustbelt", name: "Rustbelt Static", hood: "South Park", genres: ["Rock"], rate: [250, 500], tonight: false, verified: true, links: [YOUTUBE, BANDCAMP],
    bio: "Four people, three amps and one very loud bass. Garage rock with a Midwest accent. We bring our own drum riser.",
  },
  { slug: "marigold", name: "The Marigold Hour", hood: "Oakwood", genres: ["Jazz", "Soul and R&B"], rate: [200, 450], tonight: true, verified: true, links: [SPOTIFY],
    bio: "Piano, upright bass and brushes. Standards, a few surprises, and a repertoire that fits dinner service or a late set.",
  },
  { slug: "paperplane", name: "DJ Paperplane", hood: "Downtown", genres: ["Electronic", "Hip hop"], rate: [200, 400], tonight: false, verified: false, links: [SOUNDCLOUD],
    bio: "Live-mixed house and breaks with a drum machine and a sampler. I read the room and keep the floor moving.",
  },
  { slug: "lena", name: "Lena Okafor", hood: "Kettering", genres: ["Soul and R&B", "Pop"], rate: [180, 380], tonight: true, verified: true, links: [SPOTIFY, YOUTUBE],
    bio: "Big voice, small footprint. I perform with a keyboard and a backing track, or with a full band when the room can take it.",
  },
  { slug: "copperhead", name: "Copperhead Junction", hood: "Miamisburg", genres: ["Country", "Folk"], rate: [200, 420], tonight: false, verified: false, links: [YOUTUBE],
    bio: "Fiddle, steel guitar and harmonies you can feel in your chest. Honky-tonk for Fridays, ballads for Sundays.",
  },
  { slug: "movaldez", name: "Mo Valdez & the Hot Sauce", hood: "Downtown", genres: ["Blues", "Soul and R&B"], rate: [220, 450], tonight: false, verified: true, links: [SPOTIFY, YOUTUBE, SOUNDCLOUD],
    bio: "Slide guitar, a Hammond organ and a drummer who never rushes. Real blues, played loud and friendly.",
  },
  { slug: "velvetquarry", name: "Velvet Quarry", hood: "Oregon District", genres: ["Indie", "Rock"], rate: [180, 350], tonight: true, verified: false, links: [SPOTIFY, BANDCAMP],
    bio: "Dream-pop guitars over a tight rhythm section. We write about small towns and long drives.",
  },
  { slug: "nova", name: "Nova Kline", hood: "Beavercreek", genres: ["Pop", "Covers"], rate: [150, 300], tonight: true, verified: false, links: [YOUTUBE, SPOTIFY],
    bio: "Pop covers and originals with a loop station. Great for patios, birthdays and room-filling singalongs.",
  },
  { slug: "bigdave", name: "Big Dave's Basement", hood: "Fairgrounds", genres: ["Covers", "Rock", "Country"], rate: [250, 450], tonight: false, verified: false, links: [YOUTUBE],
    bio: "Five guys who learned every song your uncle loves. Three hours of covers, zero requests refused.",
  },
  { slug: "tessellate", name: "Tessellate", hood: "South Park", genres: ["Hip hop", "Electronic"], rate: [200, 400], tonight: false, verified: true, links: [SOUNDCLOUD, YOUTUBE],
    bio: "An MC, a producer and a live drummer. Dayton hip hop with jazz chords and boom-bap drums.",
  },
  { slug: "wren", name: "Wren Lowell", hood: "Oakwood", genres: ["Folk"], rate: [100, 200], tonight: true, verified: false, links: [SPOTIFY, SOUNDCLOUD],
    bio: "Fingerpicked guitar and honest lyrics. Coffeehouse sets, listening rooms and small stages are my home.",
  },
  { slug: "pocketwatches", name: "The Pocketwatches", hood: "Downtown", genres: ["Jazz", "Soul and R&B", "Covers"], rate: [220, 420], tonight: false, verified: true, links: [SPOTIFY, YOUTUBE],
    bio: "A six-piece with horns that sounds like a record from 1964. Perfect for weddings, brunch and late-night rooms.",
  },
  { slug: "hollis", name: "Hollis Grove", hood: "Kettering", genres: ["Country", "Folk", "Blues"], rate: [120, 260], tonight: true, verified: false, links: [YOUTUBE],
    bio: "Dobro, a stomp box and a baritone voice. Gravel-road country with a little blues underneath.",
  },
];

const CAPTIONS = [
  "Rehearsal ran long and nobody minded.", "New songs, same loud amps.", "Thank you for packing the room last weekend.", "Setlist for Friday is locked.",
  "Soundcheck at golden hour.", "Practicing the harmonies again.", "Loaded in at 5 and still smiling.", "Merch table is stocked for the weekend.",
  "Writing in the van between towns.", "Open slots next month. Venues, say hello.", "New strings, new songs.", "Quiet before the first note.",
  "We do requests if you ask nicely.", "Back in the studio this week.", "Best crowd we have played to all year.",
];
const VENUE_REVIEWS = [
  "Great room, friendly staff, and the sound engineer actually listened. Would play again.",
  "Load-in was easy and we got paid on time. The crowd was warm.",
  "The stage is small but the energy is huge. Tips were solid.",
  "Clear communication from the first message to the last song.",
  "Good PA, fair pay and a bar tab for the band. Recommend.",
  "Smaller crowd than we hoped on a weeknight, but the staff made it fun.",
  "Packed house and a really supportive owner. Loved it.",
];
const MUSICIAN_REVIEWS = [
  "Showed up early, sounded great and the room stayed full all night.",
  "Professional, friendly and easy to work with. Booking them again.",
  "Great energy and a crowd that sang along. Tips were strong.",
  "Fantastic set. A little loud for our dinner crowd but they adjusted quickly.",
  "On time and prepared. Handled a broken string like a pro.",
  "Good musicians, though they ran a bit over their time slot.",
  "Packed the place. Our regulars asked when they are coming back.",
];

// Completed gigs: [act slug, venue slug, days ago, pay in dollars]
const HISTORY = [
  ["juniper", "velvet-pigeon", 6, 220], ["juniper", "hollow-oak", 19, 180], ["juniper", "lantern-loom", 33, 120], ["juniper", "saltbox-social", 47, 170],
  ["cass", "lantern-loom", 9, 90], ["cass", "thistle-throne", 28, 130],
  ["rustbelt", "cinder-alley", 8, 150], ["rustbelt", "brass-compass", 21, 300], ["rustbelt", "tipsy-atlas", 40, 240],
  ["marigold", "gilded-hen", 5, 220], ["marigold", "saltbox-social", 17, 200], ["marigold", "velvet-pigeon", 31, 240], ["marigold", "gilded-hen", 52, 220],
  ["paperplane", "neon-heron", 12, 300],
  ["lena", "velvet-pigeon", 14, 260], ["lena", "bluebird-back", 29, 150], ["lena", "mothlight", 45, 400],
  ["copperhead", "foxglove", 11, 160], ["copperhead", "quarry-cantina", 35, 190],
  ["movaldez", "foxglove", 7, 180], ["movaldez", "brass-compass", 24, 330], ["movaldez", "tipsy-atlas", 38, 200],
  ["velvetquarry", "cinder-alley", 15, 130], ["velvetquarry", "mothlight", 42, 420],
  ["bigdave", "hollow-oak", 10, 270], ["bigdave", "thistle-throne", 26, 160],
  ["tessellate", "neon-heron", 18, 330], ["tessellate", "bluebird-back", 36, 150],
  ["pocketwatches", "gilded-hen", 13, 240], ["pocketwatches", "saltbox-social", 30, 200], ["pocketwatches", "mothlight", 55, 380],
];
// How the venue rated each act (so averages differ): the act's slug maps to a base rating, tweaked per gig.
const BASE = { juniper: 4.9, cass: 4.6, rustbelt: 4.3, marigold: 4.9, paperplane: 4.2, lena: 4.8, copperhead: 4.4, movaldez: 4.7, velvetquarry: 4.5, bigdave: 4.1, tessellate: 4.6, pocketwatches: 4.8 };

// ---------------------------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------------------------
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
async function render(html, size = 1000) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(html);
  return page.screenshot({ type: "jpeg", quality: 82, clip: { x: 0, y: 0, width: size, height: size } });
}
async function upload(path, buf) {
  const { error } = await admin.storage.from("photos").upload(path, buf, { contentType: "image/jpeg", upsert: true, cacheControl: "31536000" });
  if (error) throw error;
}

console.log("Looking up the fictional venues");
const allUsers = (await admin.auth.admin.listUsers({ page: 1, perPage: 200 })).data.users;
const venueId = (slug) => allUsers.find((u) => u.email === `venue.${slug}@gigmate.test`)?.id;
if (!venueId("velvet-pigeon")) { console.error("Run `npm run seed` first (it creates the fictional venues)."); process.exit(1); }

console.log("Acts");
const actIds = new Map();
for (const [i, a] of ACTS.entries()) {
  const email = `band.${a.slug}@gigmate.test`;
  let id = allUsers.find((u) => u.email === email)?.id;
  const meta = { role: "musician", display_name: a.name };
  if (!id) {
    const c = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: meta });
    if (c.error) throw c.error;
    id = c.data.user.id;
  } else {
    await admin.auth.admin.updateUserById(id, { password, user_metadata: meta });
  }
  actIds.set(a.slug, id);

  // Pictures: one profile photo and three posts
  const r = rng(hash(a.slug));
  const pal = PALETTES[i % PALETTES.length];
  await upload(`${id}/seed-avatar.jpg`, await render(artAvatar(r, pal, 1000, a.name)));
  const captions = [...CAPTIONS].sort(() => r() - 0.5).slice(0, 3);
  const postRows = [];
  for (let k = 0; k < 3; k++) {
    const style = POST_STYLES[(hash(a.slug) + k * 2) % POST_STYLES.length];
    await upload(`${id}/seed-post-${k}.jpg`, await render(style(rng(hash(a.slug) + k * 101), PALETTES[(i + k) % PALETTES.length], 1000)));
    postRows.push({ author_id: id, kind: "announcement", body: captions[k], media_path: `${id}/seed-post-${k}.jpg`, media_type: "image", created_at: new Date(Date.now() - (k * 3 + 1 + (i % 4)) * 86400 * 1000 - i * 3600 * 1000).toISOString() });
  }

  const p1 = await admin.from("profiles").update({ neighborhood: a.hood, avatar_url: `${id}/seed-avatar.jpg`, onboarded_at: new Date().toISOString() }).eq("id", id);
  if (p1.error) throw p1.error;
  const p2 = await admin.from("musician_profiles").update({
    genres: a.genres, rate_min_cents: a.rate[0] * 100, rate_max_cents: a.rate[1] * 100, bio: a.bio,
    available_tonight: a.tonight, verified_sound: a.verified, media_links: a.links.map((u) => ({ label: u.includes("spotify") ? "Spotify" : u.includes("youtube") ? "YouTube" : u.includes("soundcloud") ? "SoundCloud" : "Bandcamp", url: u })),
  }).eq("profile_id", id);
  if (p2.error) throw p2.error;

  await admin.from("posts").delete().eq("author_id", id);
  // Shop pictures from before the shop moved to venues (migration 0006). Harmless if they are already gone.
  await admin.storage.from("photos").remove([0, 1, 2, 3].map((k) => `${id}/seed-product-${k}.jpg`));
  const i1 = await admin.from("posts").insert(postRows);
  if (i1.error) throw i1.error;
  console.log(`  ready: ${a.name} (${a.genres.join(", ")}) with 3 posts`);
}
await browser.close();

console.log("History of completed gigs and reviews");
const del = await admin.from("gig_slots").delete().eq("notes", "seed-history");
if (del.error) throw del.error;
let reviews = 0;
for (const [n, [actSlug, venueSlug, daysAgo, dollars]] of HISTORY.entries()) {
  const musicianId = actIds.get(actSlug), vId = venueId(venueSlug);
  const startsAt = localToUtcIso(addDays(todayLocal(), -daysAgo), n % 2 ? "20:00" : "21:00");
  const slot = await admin.from("gig_slots").insert({ venue_id: vId, starts_at: startsAt, set_length_min: 120, pay_cents: dollars * 100, genre: null, status: "completed", is_urgent: false, notes: "seed-history" }).select("id").single();
  if (slot.error) throw slot.error;
  const completedAt = new Date(new Date(startsAt).getTime() + 3 * 3600 * 1000).toISOString();
  const bk = await admin.from("bookings").insert({ slot_id: slot.data.id, musician_id: musicianId, venue_id: vId, agreed_pay_cents: dollars * 100, completed_at: completedAt }).select("id").single();
  if (bk.error) throw bk.error;
  const base = BASE[actSlug] ?? 4.5;
  const actRating = Math.max(3, Math.min(5, Math.round(base + ((n * 7) % 5 - 2) * 0.22)));
  const venueRating = [5, 5, 4, 5, 4, 5, 3, 5][n % 8];
  const rows = [
    { booking_id: bk.data.id, reviewer_id: vId, reviewee_id: musicianId, rating: actRating, body: MUSICIAN_REVIEWS[(n + (5 - actRating)) % MUSICIAN_REVIEWS.length], created_at: new Date(new Date(completedAt).getTime() + 20 * 3600 * 1000).toISOString() },
    { booking_id: bk.data.id, reviewer_id: musicianId, reviewee_id: vId, rating: venueRating, body: VENUE_REVIEWS[(n + (5 - venueRating)) % VENUE_REVIEWS.length], created_at: new Date(new Date(completedAt).getTime() + 30 * 3600 * 1000).toISOString() },
  ];
  const rv = await admin.from("reviews").insert(rows);
  if (rv.error) throw rv.error;
  reviews += rows.length;
}
console.log(`Done: ${ACTS.length} fictional musicians, ${HISTORY.length} completed gigs, ${reviews} reviews.`);
