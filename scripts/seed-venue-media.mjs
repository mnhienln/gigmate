// Gives the 14 fictional venues an Instagram-style profile: a profile picture, room photos, a few short
// videos and a merch shop.
//
//   NODE_USE_ENV_PROXY=1 npm run seed:venues        (inside the Claude cloud container)
//
// Run `npm run seed` (creates the venues) FIRST, and apply migration 0006 (only venues may add shop items).
// Safe to re-run: it replaces the photos, videos and shop items of the fictional venues only, and never touches
// the demo venue (Front Room Bar), which stays a blank slate for the live demo.
//
// EVERYTHING HERE IS INVENTED. Pictures are drawn by a headless browser (poster-style art, nothing realistic).
// The videos are 3 second abstract color loops made by ffmpeg, so they are obviously demo clips, not footage of
// real places. Shop items have no real store behind them. Needs NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY, Playwright and ffmpeg (both preinstalled in the cloud container).

import { createClient } from "@supabase/supabase-js";
import { createRequire } from "node:module";
import { execFileSync, execSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PALETTES, POST_STYLES, artAvatar, artProduct, hash, rng } from "./lib/art.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
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

const SHOP = "https://example.com/";

// slug -> merch [title, dollars, kind, description, buy link or null]
const MERCH = {
  "velvet-pigeon": [["Pigeon logo tee", 24, "tee", "Black tee with a gold pigeon. Sizes S to 2XL.", SHOP], ["Velvet curtain pint glass", 9, "glass", "Heavy 16 oz pint glass."], ["Gift card, $25", 25, "giftcard", "Good for drinks and food at the bar."]],
  "hollow-oak": [["Taproom tee", 22, "tee", "Soft gray tee with the tank logo."], ["Hollow Oak cap", 20, "cap", "Adjustable canvas cap.", SHOP], ["Pint glass set of two", 16, "glass", "Two branded 16 oz glasses."]],
  "neon-heron": [["Neon Heron tee", 26, "tee", "Glow-in-the-dark print. Sizes M to 3XL.", SHOP], ["Gift card, $50", 50, "giftcard", "Good for any night."]],
  "lantern-loom": [["Lantern & Loom tote", 18, "tote", "Canvas tote, fits a laptop and a pastry."], ["Mug, 12 oz", 14, "glass", "Ceramic mug with the lantern mark."], ["Gift card, $20", 20, "giftcard", "Coffee, tea and baked goods."]],
  "brass-compass": [["Brass Compass tee", 25, "tee", "Compass rose on the back.", SHOP], ["Brewery cap", 22, "cap", "Waxed cotton cap."], ["Crowler gift card, $30", 30, "giftcard", "Fill-ups from the taproom."]],
  "thistle-throne": [["Thistle pub tee", 23, "tee", "Dark green tee with the thistle crest."], ["Pub pint glass", 10, "glass", "Nonic pint glass."]],
  "saltbox-social": [["Saltbox tote", 18, "tote", "Heavy canvas tote."], ["Gift card, $40", 40, "giftcard", "Dinner, brunch or drinks.", SHOP]],
  "tipsy-atlas": [["Tipsy Atlas tee", 24, "tee", "Map print. Sizes S to 2XL."], ["Atlas cap", 20, "cap", "Embroidered globe.", SHOP], ["Trivia night pint glass", 9, "glass", "Marked with the compass rose."]],
  "cinder-alley": [["Cinder Alley tee", 22, "tee", "Black, red flame print."], ["Gift card, $20", 20, "giftcard", "Tiny bar, big pours."]],
  mothlight: [["Mothlight tour tee", 30, "tee", "Dark tee, moth on the back.", SHOP], ["Mothlight cap", 24, "cap", "Black on black."], ["Gift card, $50", 50, "giftcard", "Applies to show tickets and the bar."]],
  "quarry-cantina": [["Quarry Cantina tee", 23, "tee", "Sun-faded orange tee."], ["Margarita glass", 11, "glass", "Salt rim not included."]],
  foxglove: [["Foxglove tee", 22, "tee", "Soft purple tee with the flower."], ["Tavern pint glass", 9, "glass", "Sturdy 16 oz pint."], ["Gift card, $25", 25, "giftcard", "Blues Thursdays, anyone?"]],
  "bluebird-back": [["Bluebird tee", 22, "tee", "Sky blue tee."], ["Backroom cap", 20, "cap", "Corduroy cap.", SHOP]],
  "gilded-hen": [["Gilded Hen tote", 18, "tote", "Gold hen on cream canvas."], ["Brunch gift card, $30", 30, "giftcard", "Good for any meal."], ["Hen mug", 14, "glass", "Large ceramic mug."]],
};

const CAPTIONS = [
  "Doors open at six. The stage is set.", "Patio season is here.", "New lights over the stage this week.", "Fresh pours, loud amps.",
  "Thank you for packing the room on Saturday.", "Soundcheck, then dinner, then music.", "Behind the bar before the crowd shows up.", "Mic stands polished, ready for Friday.",
  "Open slots next month. Musicians, say hello.", "The corner stage, waiting for you.",
];
const VIDEO_CAPTIONS = ["Room check before doors.", "Lights up for the first set.", "A quiet moment before the crowd arrives."];

const VIDEO_VENUES = new Set(["velvet-pigeon", "hollow-oak", "neon-heron", "brass-compass", "mothlight", "tipsy-atlas"]);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
const render = async (html, size = 1000) => {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(html);
  return page.screenshot({ type: "jpeg", quality: 82, clip: { x: 0, y: 0, width: size, height: size } });
};
const uploadPhoto = async (path, buf) => {
  const { error } = await admin.storage.from("photos").upload(path, buf, { contentType: "image/jpeg", upsert: true, cacheControl: "31536000" });
  if (error) throw error;
};

const tmp = mkdtempSync(join(tmpdir(), "gigmate-venue-video-"));
function makeClip(seed, palette) {
  const out = join(tmp, `clip-${seed}.mp4`);
  const c = (i) => palette[i].replace("#", "0x");
  execFileSync("ffmpeg", [
    "-loglevel", "error", "-y", "-f", "lavfi", "-i",
    `gradients=s=480x480:d=3:r=24:c0=${c(1)}:c1=${c(2)}:c2=${c(3)}:c3=${c(4)}:speed=0.08:nb_colors=4`,
    "-vf", "format=yuv420p", "-c:v", "libx264", "-preset", "veryfast", "-crf", "30", "-movflags", "+faststart", "-an", out,
  ]);
  return readFileSync(out);
}

console.log("Looking up the fictional venues");
const users = (await admin.auth.admin.listUsers({ page: 1, perPage: 200 })).data.users;
const slugs = Object.keys(MERCH);
if (!users.find((u) => u.email === `venue.${slugs[0]}@gigmate.test`)) {
  console.error("Run `npm run seed` first (it creates the fictional venues).");
  process.exit(1);
}

let photos = 0, videos = 0, items = 0;
for (const [i, slug] of slugs.entries()) {
  const id = users.find((u) => u.email === `venue.${slug}@gigmate.test`)?.id;
  if (!id) continue;
  const { data: prof } = await admin.from("profiles").select("display_name").eq("id", id).single();
  const name = prof.display_name;
  const pal = PALETTES[(i + 2) % PALETTES.length];
  const r = rng(hash(slug));

  await uploadPhoto(`${id}/seed-avatar.jpg`, await render(artAvatar(r, pal, 1000, name)));

  const captions = [...CAPTIONS].sort(() => r() - 0.5);
  const rows = [];
  const count = 3 + (i % 2);
  for (let k = 0; k < count; k++) {
    const style = POST_STYLES[(hash(slug) + k * 3) % POST_STYLES.length];
    await uploadPhoto(`${id}/seed-photo-${k}.jpg`, await render(style(rng(hash(slug) + k * 77), PALETTES[(i + k + 3) % PALETTES.length], 1000)));
    rows.push({ author_id: id, kind: "announcement", body: captions[k], media_path: `${id}/seed-photo-${k}.jpg`, media_type: "image", created_at: new Date(Date.now() - (k * 4 + 1 + (i % 3)) * 86400 * 1000 - i * 1800 * 1000).toISOString() });
    photos++;
  }
  if (VIDEO_VENUES.has(slug)) {
    const clip = makeClip(slug, pal);
    const up = await admin.storage.from("videos").upload(`${id}/seed-video-0.mp4`, clip, { contentType: "video/mp4", upsert: true, cacheControl: "31536000" });
    if (up.error) throw up.error;
    await uploadPhoto(`${id}/seed-video-0-poster.jpg`, await render(POST_STYLES[(i + 1) % POST_STYLES.length](rng(hash(slug) + 9), pal, 1000)));
    rows.push({ author_id: id, kind: "announcement", body: VIDEO_CAPTIONS[i % VIDEO_CAPTIONS.length], media_path: `${id}/seed-video-0.mp4`, media_type: "video", poster_path: `${id}/seed-video-0-poster.jpg`, created_at: new Date(Date.now() - (2 + (i % 3)) * 86400 * 1000).toISOString() });
    videos++;
  }

  const productRows = [];
  for (const [k, [title, dollars, kind, description, buy]] of MERCH[slug].entries()) {
    await uploadPhoto(`${id}/seed-product-${k}.jpg`, await render(artProduct(rng(hash(title)), PALETTES[(i + k + 1) % PALETTES.length], 1000, kind)));
    productRows.push({ owner_id: id, title, price_cents: dollars * 100, description, photo_path: `${id}/seed-product-${k}.jpg`, buy_url: buy ?? null });
  }

  const a = await admin.from("profiles").update({ avatar_url: `${id}/seed-avatar.jpg` }).eq("id", id);
  if (a.error) throw a.error;
  // Replace this venue's earlier media posts and shop items (text announcements are left alone)
  const d1 = await admin.from("posts").delete().eq("author_id", id).not("media_path", "is", null);
  if (d1.error) throw d1.error;
  const d2 = await admin.from("products").delete().eq("owner_id", id);
  if (d2.error) throw d2.error;
  const i1 = await admin.from("posts").insert(rows);
  if (i1.error) throw i1.error;
  const i2 = await admin.from("products").insert(productRows);
  if (i2.error) throw i2.error;
  items += productRows.length;
  console.log(`  ready: ${name} (${rows.length} posts, ${productRows.length} shop items)`);
}
await browser.close();
console.log(`Done: ${photos} photos, ${videos} videos and ${items} shop items across ${slugs.length} fictional venues.`);
