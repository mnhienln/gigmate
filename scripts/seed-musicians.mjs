// Adds 15 fictional musicians and a history of completed gigs with reviews, so profiles, ratings,
// "gigs played" counts, the shop and the feed all look alive.
//
//   NODE_USE_ENV_PROXY=1 npm run seed:musicians        (inside the Claude cloud container)
//
// Run `npm run seed` (the venues) FIRST. Safe to re-run: it refreshes the same fictional acts, replaces their
// posts, products and history, and never touches the two demo login accounts (Mara Quinn, Front Room Bar).
//
// EVERYTHING HERE IS INVENTED: act names, bios, reviews and the pictures (drawn by a headless browser, no photos
// of real people). Music links point to the front page of each streaming site on purpose, because these acts do
// not exist. If a name happens to match a real act, rename it. Needs NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY and DEMO_PASSWORD, and Playwright (preinstalled in the cloud container).

import { createClient } from "@supabase/supabase-js";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { addDays, localToUtcIso, todayLocal } from "../src/lib/dates.ts";

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

// slug, name, neighborhood, genres, [rate min, rate max], bio, available tonight, verified sound, links, products [title, dollars, kind, description, buy link]
const ACTS = [
  { slug: "juniper", name: "Juniper & the Late Bloomers", hood: "Oregon District", genres: ["Folk", "Indie"], rate: [150, 300], tonight: false, verified: true, links: [SPOTIFY, YOUTUBE],
    bio: "Two voices, one banjo and a kick drum made from a suitcase. Porch songs for people who stay for the last call.",
    products: [["Porch Songs EP, vinyl", 22, "vinyl", "Limited pressing, hand numbered.", BANDCAMP], ["Late Bloomer tee", 25, "tee", "Soft cotton, sizes S to XL."]] },
  { slug: "cass", name: "Cass Holloway", hood: "Belmont", genres: ["Indie", "Folk"], rate: [100, 220], tonight: true, verified: false, links: [SPOTIFY, SOUNDCLOUD, YOUTUBE],
    bio: "Singer-songwriter with a loop pedal and a lot of kitchen-table songs. Quiet rooms are my favorite rooms.",
    products: [["Kitchen Table sticker pack", 5, "sticker", "Five vinyl stickers."]] },
  { slug: "rustbelt", name: "Rustbelt Static", hood: "South Park", genres: ["Rock"], rate: [250, 500], tonight: false, verified: true, links: [YOUTUBE, BANDCAMP],
    bio: "Four people, three amps and one very loud bass. Garage rock with a Midwest accent. We bring our own drum riser.",
    products: [["Static tee", 28, "tee", "Black tee, white print."], ["Loud Enough sticker", 3, "sticker", "Weatherproof."]] },
  { slug: "marigold", name: "The Marigold Hour", hood: "Oakwood", genres: ["Jazz", "Soul and R&B"], rate: [200, 450], tonight: true, verified: true, links: [SPOTIFY],
    bio: "Piano, upright bass and brushes. Standards, a few surprises, and a repertoire that fits dinner service or a late set.",
    products: [["Golden Hour tote", 18, "tote", "Heavy canvas tote."]] },
  { slug: "paperplane", name: "DJ Paperplane", hood: "Downtown", genres: ["Electronic", "Hip hop"], rate: [200, 400], tonight: false, verified: false, links: [SOUNDCLOUD],
    bio: "Live-mixed house and breaks with a drum machine and a sampler. I read the room and keep the floor moving.",
    products: [] },
  { slug: "lena", name: "Lena Okafor", hood: "Kettering", genres: ["Soul and R&B", "Pop"], rate: [180, 380], tonight: true, verified: true, links: [SPOTIFY, YOUTUBE],
    bio: "Big voice, small footprint. I perform with a keyboard and a backing track, or with a full band when the room can take it.",
    products: [["Lena live album, vinyl", 24, "vinyl", "Recorded in one night.", BANDCAMP]] },
  { slug: "copperhead", name: "Copperhead Junction", hood: "Miamisburg", genres: ["Country", "Folk"], rate: [200, 420], tonight: false, verified: false, links: [YOUTUBE],
    bio: "Fiddle, steel guitar and harmonies you can feel in your chest. Honky-tonk for Fridays, ballads for Sundays.",
    products: [["Junction tee", 26, "tee", "Faded red, sizes S to 2XL."]] },
  { slug: "movaldez", name: "Mo Valdez & the Hot Sauce", hood: "Downtown", genres: ["Blues", "Soul and R&B"], rate: [220, 450], tonight: false, verified: true, links: [SPOTIFY, YOUTUBE, SOUNDCLOUD],
    bio: "Slide guitar, a Hammond organ and a drummer who never rushes. Real blues, played loud and friendly.",
    products: [["Hot Sauce sticker", 3, "sticker", "Peel and stick."], ["Slide Guitar tee", 27, "tee", "Black, red print."]] },
  { slug: "velvetquarry", name: "Velvet Quarry", hood: "Oregon District", genres: ["Indie", "Rock"], rate: [180, 350], tonight: true, verified: false, links: [SPOTIFY, BANDCAMP],
    bio: "Dream-pop guitars over a tight rhythm section. We write about small towns and long drives.",
    products: [["Long Drive vinyl", 23, "vinyl", "Clear vinyl, 200 made.", BANDCAMP]] },
  { slug: "nova", name: "Nova Kline", hood: "Beavercreek", genres: ["Pop", "Covers"], rate: [150, 300], tonight: true, verified: false, links: [YOUTUBE, SPOTIFY],
    bio: "Pop covers and originals with a loop station. Great for patios, birthdays and room-filling singalongs.",
    products: [] },
  { slug: "bigdave", name: "Big Dave's Basement", hood: "Fairgrounds", genres: ["Covers", "Rock", "Country"], rate: [250, 450], tonight: false, verified: false, links: [YOUTUBE],
    bio: "Five guys who learned every song your uncle loves. Three hours of covers, zero requests refused.",
    products: [["Basement tee", 24, "tee", "Gray tee, sizes M to 3XL."], ["Basement koozie", 6, "sticker", "Keeps it cold."]] },
  { slug: "tessellate", name: "Tessellate", hood: "South Park", genres: ["Hip hop", "Electronic"], rate: [200, 400], tonight: false, verified: true, links: [SOUNDCLOUD, YOUTUBE],
    bio: "An MC, a producer and a live drummer. Dayton hip hop with jazz chords and boom-bap drums.",
    products: [["Tessellate tee", 25, "tee", "Geometric print."]] },
  { slug: "wren", name: "Wren Lowell", hood: "Oakwood", genres: ["Folk"], rate: [100, 200], tonight: true, verified: false, links: [SPOTIFY, SOUNDCLOUD],
    bio: "Fingerpicked guitar and honest lyrics. Coffeehouse sets, listening rooms and small stages are my home.",
    products: [["Wren songbook", 12, "tote", "Chords and lyrics, 24 pages."]] },
  { slug: "pocketwatches", name: "The Pocketwatches", hood: "Downtown", genres: ["Jazz", "Soul and R&B", "Covers"], rate: [220, 420], tonight: false, verified: true, links: [SPOTIFY, YOUTUBE],
    bio: "A six-piece with horns that sounds like a record from 1964. Perfect for weddings, brunch and late-night rooms.",
    products: [["Pocketwatch pin", 8, "sticker", "Enamel pin.", BANDCAMP]] },
  { slug: "hollis", name: "Hollis Grove", hood: "Kettering", genres: ["Country", "Folk", "Blues"], rate: [120, 260], tonight: true, verified: false, links: [YOUTUBE],
    bio: "Dobro, a stomp box and a baritone voice. Gravel-road country with a little blues underneath.",
    products: [] },
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
// Picture drawing (SVG rendered by a headless browser). Poster palette, no photos of anyone.
// ---------------------------------------------------------------------------------------------
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash = (s) => Math.abs([...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7)); // always positive, so it is safe as a list index
const PALETTES = [
  ["#f6e5bc", "#e4a52a", "#b8461a", "#8f2d1c", "#3b2314"], ["#3b2314", "#e4a52a", "#f6e5bc", "#b8461a", "#8f2d1c"],
  ["#12263a", "#f2c14e", "#e4572e", "#17bebb", "#f6e5bc"], ["#2b1a10", "#d4a373", "#faedcd", "#e63946", "#a8dadc"],
  ["#1d3557", "#a8dadc", "#f1faee", "#e63946", "#457b9d"], ["#22223b", "#c9ada7", "#f2e9e4", "#9a8c98", "#e4a52a"],
];
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

function svgWrap(size, body, bg) {
  return `<html><body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${bg}"/>${body}</svg></body></html>`;
}
function artSunburst(r, p, S) {
  const cx = S * (0.35 + r() * 0.3), cy = S * (0.4 + r() * 0.25), rays = 14 + Math.floor(r() * 10);
  let b = "";
  for (let i = 0; i < rays; i++) {
    const a1 = (i / rays) * Math.PI * 2, a2 = ((i + 0.5) / rays) * Math.PI * 2, L = S * 1.6;
    b += `<polygon points="${cx},${cy} ${cx + Math.cos(a1) * L},${cy + Math.sin(a1) * L} ${cx + Math.cos(a2) * L},${cy + Math.sin(a2) * L}" fill="${p[1 + (i % 2)]}" opacity="0.85"/>`;
  }
  b += `<circle cx="${cx}" cy="${cy}" r="${S * 0.17}" fill="${p[3]}"/><circle cx="${cx}" cy="${cy}" r="${S * 0.09}" fill="${p[0]}"/>`;
  return svgWrap(S, b, p[4]);
}
function artStage(r, p, S) {
  let b = `<rect y="${S * 0.72}" width="${S}" height="${S * 0.28}" fill="${p[3]}"/>`;
  for (let i = 0; i < 3; i++) {
    const x = S * (0.2 + i * 0.3 + (r() - 0.5) * 0.08);
    b += `<polygon points="${x - 14},0 ${x + 14},0 ${x + S * 0.2},${S * 0.78} ${x - S * 0.2},${S * 0.78}" fill="${p[1]}" opacity="${0.28 + r() * 0.2}"/>`;
  }
  for (let i = 0; i < 4; i++) {
    const x = S * (0.18 + i * 0.2 + (r() - 0.5) * 0.05), h = S * (0.16 + r() * 0.1);
    b += `<circle cx="${x}" cy="${S * 0.72 - h - 22}" r="22" fill="${p[0]}"/><rect x="${x - 26}" y="${S * 0.72 - h}" width="52" height="${h}" rx="18" fill="${p[0]}"/>`;
  }
  b += `<ellipse cx="${S / 2}" cy="${S * 0.8}" rx="${S * 0.4}" ry="${S * 0.05}" fill="${p[2]}" opacity="0.6"/>`;
  return svgWrap(S, b, p[4]);
}
function artVinyl(r, p, S) {
  const cx = S * (0.4 + r() * 0.2), cy = S * (0.4 + r() * 0.2), R = S * 0.42;
  let b = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${p[4]}" stroke="${p[0]}" stroke-width="6"/>`;
  for (let i = 1; i <= 9; i++) b += `<circle cx="${cx}" cy="${cy}" r="${R - i * 18}" fill="none" stroke="${p[0]}" stroke-width="2" opacity="0.35"/>`;
  b += `<circle cx="${cx}" cy="${cy}" r="${R * 0.3}" fill="${p[2]}"/><circle cx="${cx}" cy="${cy}" r="10" fill="${p[0]}"/>`;
  b += `<rect x="${S * 0.62}" y="${S * 0.7}" width="${S * 0.3}" height="${S * 0.18}" fill="${p[1]}" transform="rotate(-8 ${S * 0.77} ${S * 0.79})"/>`;
  return svgWrap(S, b, p[0]);
}
function artWaves(r, p, S) {
  let b = "";
  for (let i = 0; i < 9; i++) {
    const y = S * (0.1 + i * 0.1), amp = 20 + r() * 50, ph = r() * 6;
    let d = `M0 ${y}`;
    for (let x = 0; x <= S; x += 20) d += ` L${x} ${y + Math.sin(x / 90 + ph) * amp}`;
    d += ` L${S} ${S} L0 ${S} Z`;
    b += `<path d="${d}" fill="${p[(i + 1) % 5]}" opacity="${0.55 + (i % 3) * 0.15}"/>`;
  }
  return svgWrap(S, b, p[4]);
}
function artGrid(r, p, S) {
  const n = 5, c = S / n;
  let b = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const col = pick(r, p), t = r();
    b += t < 0.5 ? `<rect x="${x * c + 6}" y="${y * c + 6}" width="${c - 12}" height="${c - 12}" rx="${r() * 30}" fill="${col}"/>` : `<circle cx="${x * c + c / 2}" cy="${y * c + c / 2}" r="${c / 2 - 8}" fill="${col}"/>`;
  }
  return svgWrap(S, b, p[4]);
}
const POST_STYLES = [artSunburst, artStage, artVinyl, artWaves, artGrid];

function artAvatar(r, p, S, name) {
  const initials = name.replace(/[^A-Za-z& ]/g, "").split(/\s+/).filter((w) => w && w !== "&" && w.toLowerCase() !== "the").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const b = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p[1]}"/><stop offset="1" stop-color="${p[2]}"/></linearGradient></defs>
    <rect width="${S}" height="${S}" fill="url(#g)"/><circle cx="${S * 0.8}" cy="${S * 0.2}" r="${S * 0.22}" fill="${p[0]}" opacity="0.3"/><circle cx="${S * 0.15}" cy="${S * 0.9}" r="${S * 0.3}" fill="${p[4]}" opacity="0.25"/>
    <text x="50%" y="56%" text-anchor="middle" dominant-baseline="middle" font-family="Georgia, serif" font-style="italic" font-weight="900" font-size="${S * 0.4}" fill="${p[4]}">${initials}</text>`;
  return svgWrap(S, b, p[0]);
}
function artProduct(r, p, S, kind) {
  let b = "";
  const accent = pick(r, [p[1], p[2], p[3]]);
  if (kind === "tee") {
    b = `<path d="M${S * 0.3} ${S * 0.18} L${S * 0.1} ${S * 0.34} L${S * 0.22} ${S * 0.48} L${S * 0.3} ${S * 0.42} L${S * 0.3} ${S * 0.86} L${S * 0.7} ${S * 0.86} L${S * 0.7} ${S * 0.42} L${S * 0.78} ${S * 0.48} L${S * 0.9} ${S * 0.34} L${S * 0.7} ${S * 0.18} Q${S / 2} ${S * 0.3} ${S * 0.3} ${S * 0.18} Z" fill="${accent}" stroke="${p[4]}" stroke-width="5"/><circle cx="${S / 2}" cy="${S * 0.55}" r="${S * 0.1}" fill="${p[0]}"/><circle cx="${S / 2}" cy="${S * 0.55}" r="${S * 0.05}" fill="${p[4]}"/>`;
  } else if (kind === "vinyl") {
    b = `<rect x="${S * 0.18}" y="${S * 0.18}" width="${S * 0.64}" height="${S * 0.64}" fill="${accent}" stroke="${p[4]}" stroke-width="5"/><circle cx="${S * 0.5}" cy="${S * 0.5}" r="${S * 0.24}" fill="${p[4]}"/><circle cx="${S * 0.5}" cy="${S * 0.5}" r="${S * 0.08}" fill="${p[0]}"/>`;
  } else if (kind === "tote") {
    b = `<path d="M${S * 0.36} ${S * 0.3} Q${S * 0.36} ${S * 0.1} ${S / 2} ${S * 0.1} Q${S * 0.64} ${S * 0.1} ${S * 0.64} ${S * 0.3}" fill="none" stroke="${p[4]}" stroke-width="12"/><rect x="${S * 0.22}" y="${S * 0.3}" width="${S * 0.56}" height="${S * 0.56}" rx="8" fill="${accent}" stroke="${p[4]}" stroke-width="5"/><circle cx="${S / 2}" cy="${S * 0.58}" r="${S * 0.1}" fill="${p[0]}"/>`;
  } else {
    b = `<circle cx="${S / 2}" cy="${S / 2}" r="${S * 0.32}" fill="${accent}" stroke="${p[0]}" stroke-width="14"/><polygon points="${S / 2},${S * 0.3} ${S * 0.56},${S * 0.46} ${S * 0.72},${S * 0.46} ${S * 0.59},${S * 0.56} ${S * 0.64},${S * 0.72} ${S / 2},${S * 0.62} ${S * 0.36},${S * 0.72} ${S * 0.41},${S * 0.56} ${S * 0.28},${S * 0.46} ${S * 0.44},${S * 0.46}" fill="${p[0]}"/>`;
  }
  return svgWrap(S, b, p[0] === accent ? p[3] : p[0]);
}

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

  // Pictures: one profile photo, three posts, one per product
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
  const productRows = [];
  for (const [k, [title, dollars, kind, description, buy]] of a.products.entries()) {
    await upload(`${id}/seed-product-${k}.jpg`, await render(artProduct(rng(hash(title)), PALETTES[(i + k + 1) % PALETTES.length], 1000, kind)));
    productRows.push({ owner_id: id, title, price_cents: dollars * 100, description, photo_path: `${id}/seed-product-${k}.jpg`, buy_url: buy ?? null });
  }

  const p1 = await admin.from("profiles").update({ neighborhood: a.hood, avatar_url: `${id}/seed-avatar.jpg`, onboarded_at: new Date().toISOString() }).eq("id", id);
  if (p1.error) throw p1.error;
  const p2 = await admin.from("musician_profiles").update({
    genres: a.genres, rate_min_cents: a.rate[0] * 100, rate_max_cents: a.rate[1] * 100, bio: a.bio,
    available_tonight: a.tonight, verified_sound: a.verified, media_links: a.links.map((u) => ({ label: u.includes("spotify") ? "Spotify" : u.includes("youtube") ? "YouTube" : u.includes("soundcloud") ? "SoundCloud" : "Bandcamp", url: u })),
  }).eq("profile_id", id);
  if (p2.error) throw p2.error;

  await admin.from("posts").delete().eq("author_id", id);
  await admin.from("products").delete().eq("owner_id", id);
  const i1 = await admin.from("posts").insert(postRows);
  if (i1.error) throw i1.error;
  if (productRows.length) {
    const i2 = await admin.from("products").insert(productRows);
    if (i2.error) throw i2.error;
  }
  console.log(`  ready: ${a.name} (${a.genres.join(", ")}) with 3 posts and ${productRows.length} shop items`);
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
