// Security tests for supabase/migrations/0001_init.sql
// Run with: npm run test:db
//
// Uses PGlite (real Postgres compiled to WebAssembly) so the rules run here
// without a live Supabase project. We stub the two things Supabase provides:
// the auth.users table and auth.uid(). Everything else is the real SQL.

import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const db = new PGlite();
let passed = 0;
const failures = [];

const migration = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8");
const sql =
  readFileSync(process.env.SQL_PATH ?? new URL("../migrations/0001_init.sql", import.meta.url), "utf8") +
  "\n" + migration("0002_storage.sql") +
  "\n" + migration("0003_musician_rules.sql") +
  "\n" + migration("0004_profiles_media.sql") +
  "\n" + migration("0005_payments.sql");

// --- Supabase stand-ins ------------------------------------------------------
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth, public to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  -- Supabase grants everything on new public tables to these roles; RLS is the gate.
  alter default privileges in schema public grant all on tables to anon, authenticated;

  -- Stand-ins for Supabase Storage: just enough for the policies in 0002 and 0004.
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  grant usage on schema storage to anon, authenticated;
  grant all on storage.objects to anon, authenticated;
`);
await db.exec(sql);

// --- helpers -----------------------------------------------------------------
/** Run one statement as a signed-in user (RLS applies). */
async function as(uid, query, params = []) {
  return db.transaction(async (tx) => {
    await tx.query("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [uid]);
    return tx.query(query, params);
  });
}
/** Run one statement as an anonymous visitor. */
async function asAnon(query, params = []) {
  return db.transaction(async (tx) => {
    await tx.query("set local role anon");
    return tx.query(query, params);
  });
}
async function fails(promise, pattern, label) {
  try {
    await promise;
  } catch (e) {
    assert.match(String(e.message), pattern, `${label}: wrong error: ${e.message}`);
    return;
  }
  assert.fail(`${label}: expected an error but it succeeded`);
}
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failures.push(name);
    console.log(`  FAIL ${name}\n       ${e.message}`);
  }
}
async function newUser(email, role, name) {
  const meta = role ? { role, display_name: name } : {};
  const r = await db.query(
    "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
    [email, JSON.stringify(meta)],
  );
  return r.rows[0].id;
}

// --- fixtures ----------------------------------------------------------------
const mara = await newUser("mara@x.test", "musician", "Mara Quinn");
const otis = await newUser("otis@x.test", "musician", "Otis Bell");
const cleo = await newUser("cleo@x.test", "musician", "Cleo Park");
const front = await newUser("front@x.test", "venue", "Front Room Bar");
/** Give a musician an active paid plan (done by the server in real life, never by the browser). */
async function subscribe(uid, status = "active", days = 30) {
  await db.query(
    "insert into subscriptions (musician_id, plan, status, current_period_end) values ($1, 'monthly', $2, now() + ($3 || ' days')::interval) on conflict (musician_id) do update set status = $2, current_period_end = now() + ($3 || ' days')::interval",
    [uid, status, String(days)],
  );
}
for (const uid of [mara, otis, cleo]) await subscribe(uid);
const hops = await newUser("hops@x.test", "venue", "Hops Hall");

console.log("\nSignup trigger");
await test("signup creates a profile with the chosen role", async () => {
  const r = await db.query("select role, display_name from profiles where id = $1", [mara]);
  assert.equal(r.rows[0].role, "musician");
  assert.equal(r.rows[0].display_name, "Mara Quinn");
  assert.equal((await db.query("select 1 from musician_profiles where profile_id = $1", [mara])).rows.length, 1);
  assert.equal((await db.query("select 1 from venue_profiles where profile_id = $1", [front])).rows.length, 1);
});
await test("signup with an invalid role is rejected", async () => {
  await fails(newUser("bad@x.test", "admin", "Eve"), /choose whether/, "invalid role");
});
await test("signup with no role is rejected", async () => {
  await fails(newUser("none@x.test", null, ""), /choose whether/, "missing role");
});

console.log("\nProfiles and column protection");
await test("a user can update their own display name", async () => {
  const r = await as(mara, "update profiles set display_name = 'Mara Q' where id = $1 returning id", [mara]);
  assert.equal(r.rows.length, 1);
});
await test("a user cannot change their own role", async () => {
  await fails(as(mara, "update profiles set role = 'venue' where id = $1", [mara]), /permission denied/, "role change");
});
await test("a user cannot edit someone else's profile", async () => {
  const r = await as(mara, "update profiles set display_name = 'Hacked' where id = $1 returning id", [otis]);
  assert.equal(r.rows.length, 0);
});
await test("a musician cannot grant themselves verified_sound", async () => {
  await fails(as(mara, "update musician_profiles set verified_sound = true where profile_id = $1", [mara]), /permission denied/, "verified");
});
await test("a musician can update their own press-kit fields", async () => {
  const r = await as(mara, "update musician_profiles set genres = '{folk}', bio = 'Hi' where profile_id = $1 returning profile_id", [mara]);
  assert.equal(r.rows.length, 1);
});
await test("an anonymous visitor sees no profiles", async () => {
  assert.equal((await asAnon("select * from profiles")).rows.length, 0);
});

console.log("\nGig slots");
let slot;
await test("a venue can post a slot", async () => {
  const r = await as(front,
    "insert into gig_slots (venue_id, starts_at, set_length_min, pay_cents, genre) values ($1, now() + interval '3 days', 120, 15000, 'Folk') returning id",
    [front]);
  slot = r.rows[0].id;
  assert.ok(slot);
});
await test("a musician cannot post a slot", async () => {
  await fails(as(mara,
    "insert into gig_slots (venue_id, starts_at, set_length_min, pay_cents) values ($1, now(), 60, 100)", [mara]),
    /row-level security/, "musician post slot");
});
await test("a venue cannot post a slot as another venue", async () => {
  await fails(as(front,
    "insert into gig_slots (venue_id, starts_at, set_length_min, pay_cents) values ($1, now(), 60, 100)", [hops]),
    /row-level security/, "impersonate venue");
});
await test("a venue cannot set boosted_until itself (only the server can)", async () => {
  await fails(as(front, "update gig_slots set boosted_until = now() + interval '1 day' where id = $1", [slot]), /permission denied/, "boost");
});
await test("a venue cannot fake a slot status", async () => {
  await fails(as(front, "update gig_slots set status = 'completed' where id = $1", [slot]), /permission denied/, "status");
});
await test("a musician can browse slots", async () => {
  assert.equal((await as(mara, "select id from gig_slots")).rows.length, 1);
});

console.log("\nApplications");
let appMara, appOtis;
await test("a musician can apply", async () => {
  appMara = (await as(mara, "insert into applications (slot_id, musician_id) values ($1, $2) returning id", [slot, mara])).rows[0].id;
  appOtis = (await as(otis, "insert into applications (slot_id, musician_id) values ($1, $2) returning id", [slot, otis])).rows[0].id;
});
await test("applying twice is rejected", async () => {
  await fails(as(mara, "insert into applications (slot_id, musician_id) values ($1, $2)", [slot, mara]), /duplicate key/, "duplicate apply");
});
await test("a musician cannot apply as someone else", async () => {
  await fails(as(mara, "insert into applications (slot_id, musician_id) values ($1, $2)", [slot, cleo]), /row-level security/, "apply as other");
});
await test("a venue cannot apply to a slot", async () => {
  await fails(as(hops, "insert into applications (slot_id, musician_id) values ($1, $2)", [slot, hops]), /row-level security/, "venue apply");
});
await test("other musicians cannot see my application", async () => {
  assert.equal((await as(cleo, "select id from applications")).rows.length, 0);
  assert.equal((await as(otis, "select id from applications")).rows.length, 1); // only their own
});
await test("the slot's venue sees all applications; another venue sees none", async () => {
  assert.equal((await as(front, "select id from applications")).rows.length, 2);
  assert.equal((await as(hops, "select id from applications")).rows.length, 0);
});
await test("a musician cannot accept their own application", async () => {
  await fails(as(mara, "update applications set status = 'accepted' where id = $1", [appMara]), /row-level security/, "self accept");
});

console.log("\nAccepting and bookings");
let booking;
await test("only the owning venue can accept", async () => {
  await fails(as(mara, "select accept_application($1)", [appMara]), /only accept applicants for your own/, "musician accept");
  await fails(as(hops, "select accept_application($1)", [appMara]), /only accept applicants for your own/, "other venue accept");
});
await test("the venue accepts: booking created, others declined, slot booked", async () => {
  booking = (await as(front, "select accept_application($1) as id", [appMara])).rows[0].id;
  assert.ok(booking);
  assert.equal((await db.query("select status from applications where id = $1", [appOtis])).rows[0].status, "declined");
  assert.equal((await db.query("select status from gig_slots where id = $1", [slot])).rows[0].status, "booked");
  assert.equal((await db.query("select agreed_pay_cents from bookings where id = $1", [booking])).rows[0].agreed_pay_cents, 15000);
});
await test("a slot cannot be accepted twice", async () => {
  await fails(as(front, "select accept_application($1)", [appOtis]), /no longer open/, "double book");
});
await test("both parties can read the booking, outsiders cannot", async () => {
  assert.equal((await as(mara, "select id from bookings")).rows.length, 1);
  assert.equal((await as(front, "select id from bookings")).rows.length, 1);
  assert.equal((await as(cleo, "select id from bookings")).rows.length, 0);
  assert.equal((await as(hops, "select id from bookings")).rows.length, 0);
});
await test("nobody can write bookings directly", async () => {
  await fails(as(mara, "update bookings set completed_at = now() where id = $1", [booking]), /permission denied/, "update booking");
  await fails(as(front, "insert into bookings (slot_id, musician_id, venue_id, agreed_pay_cents) values ($1,$2,$3,1)", [slot, mara, front]), /row-level security|duplicate/, "insert booking");
});

console.log("\nReviews");
await test("reviews are blocked before the gig is complete", async () => {
  await fails(as(mara, "insert into reviews (booking_id, reviewer_id, reviewee_id, rating) values ($1,$2,$3,5)", [booking, mara, front]), /row-level security/, "early review");
});
await test("only the venue can mark the gig complete", async () => {
  await fails(as(mara, "select mark_gig_complete($1)", [booking]), /Only the venue/, "musician complete");
  await as(front, "select mark_gig_complete($1)", [booking]);
  assert.equal((await db.query("select status from gig_slots where id = $1", [slot])).rows[0].status, "completed");
});
await test("reviews must be about the other party, by a party to the booking", async () => {
  await fails(as(mara, "insert into reviews (booking_id, reviewer_id, reviewee_id, rating) values ($1,$2,$3,5)", [booking, mara, cleo]), /row-level security/, "wrong reviewee");
  await fails(as(cleo, "insert into reviews (booking_id, reviewer_id, reviewee_id, rating) values ($1,$2,$3,5)", [booking, cleo, front]), /row-level security/, "outsider review");
  await fails(as(mara, "insert into reviews (booking_id, reviewer_id, reviewee_id, rating) values ($1,$2,$3,6)", [booking, mara, front]), /check constraint/, "rating 6");
});
await test("a review stays hidden until both sides submit", async () => {
  await as(mara, "insert into reviews (booking_id, reviewer_id, reviewee_id, rating, body) values ($1,$2,$3,5,'Great room')", [booking, mara, front]);
  assert.equal((await as(mara, "select id from reviews")).rows.length, 1, "author sees own");
  assert.equal((await as(front, "select id from reviews")).rows.length, 0, "venue cannot peek");
  assert.equal((await as(cleo, "select id from reviews")).rows.length, 0, "outsider cannot see");
  assert.equal((await as(cleo, "select * from review_summaries")).rows.length, 0, "summary hides it");
});
await test("a second review by the same person is rejected", async () => {
  await fails(as(mara, "insert into reviews (booking_id, reviewer_id, reviewee_id, rating) values ($1,$2,$3,4)", [booking, mara, front]), /duplicate key/, "double review");
});
await test("a lone review becomes visible after 7 days", async () => {
  await db.query("update reviews set created_at = now() - interval '8 days'");
  assert.equal((await as(cleo, "select id from reviews")).rows.length, 1);
  assert.equal((await as(cleo, "select review_count from review_summaries where reviewee_id = $1", [front])).rows[0].review_count, 1);
  await db.query("update reviews set created_at = now()"); // reset
  assert.equal((await as(cleo, "select id from reviews")).rows.length, 0);
});
await test("both reviews become visible once both sides submit", async () => {
  await as(front, "insert into reviews (booking_id, reviewer_id, reviewee_id, rating, body) values ($1,$2,$3,4,'On time')", [booking, front, mara]);
  assert.equal((await as(cleo, "select id from reviews")).rows.length, 2);
  assert.equal((await as(front, "select id from reviews")).rows.length, 2);
  assert.equal((await as(cleo, "select avg_rating from review_summaries where reviewee_id = $1", [mara])).rows[0].avg_rating, "4.00");
});
await test("reviews cannot be edited or deleted", async () => {
  const u = await as(mara, "update reviews set rating = 1 where reviewer_id = $1 returning id", [mara]).catch((e) => e);
  assert.ok(u instanceof Error || u.rows.length === 0, "update must not succeed");
  const d = await as(mara, "delete from reviews where reviewer_id = $1 returning id", [mara]).catch((e) => e);
  assert.ok(d instanceof Error || d.rows.length === 0, "delete must not succeed");
});

console.log("\nPosts, subscriptions, boosts");
await test("posting as yourself works, as someone else does not", async () => {
  await as(mara, "insert into posts (author_id, body) values ($1, 'New song')", [mara]);
  await fails(as(mara, "insert into posts (author_id, body) values ($1, 'Fake')", [otis]), /row-level security/, "post as other");
  assert.equal((await as(cleo, "select id from posts")).rows.length, 1);
});
await test("subscriptions and boosts cannot be written by users", async () => {
  await fails(as(mara, "insert into subscriptions (musician_id, plan, status) values ($1, 'weekly', 'active')", [mara]), /row-level security/, "fake subscription");
  await fails(as(front, "insert into boosts (slot_id, venue_id, ends_at) values ($1, $2, now())", [slot, front]), /row-level security/, "fake boost");
});

console.log("\nPhase 3 rules: withdrawing and late applications");
const dana = await newUser("dana@x.test", "musician", "Dana Fox");
const eli = await newUser("eli@x.test", "musician", "Eli Reed");
await subscribe(dana);
await subscribe(eli);
let slot2;
await test("setup: a second future slot", async () => {
  slot2 = (await as(front,
    "insert into gig_slots (venue_id, starts_at, set_length_min, pay_cents) values ($1, now() + interval '5 days', 90, 12000) returning id", [front])).rows[0].id;
  assert.ok(slot2);
});
await test("a musician can withdraw a PENDING application", async () => {
  await as(dana, "insert into applications (slot_id, musician_id) values ($1, $2)", [slot2, dana]);
  const r = await as(dana, "update applications set status = 'withdrawn' where slot_id = $1 and musician_id = $2 returning id", [slot2, dana]);
  assert.equal(r.rows.length, 1);
});
await test("a musician cannot withdraw an ACCEPTED application", async () => {
  const appEli = (await as(eli, "insert into applications (slot_id, musician_id) values ($1, $2) returning id", [slot2, eli])).rows[0].id;
  await as(front, "select accept_application($1)", [appEli]);
  const r = await as(eli, "update applications set status = 'withdrawn' where id = $1 returning id", [appEli]);
  assert.equal(r.rows.length, 0, "accepted application must not be withdrawable");
  assert.equal((await db.query("select status from applications where id = $1", [appEli])).rows[0].status, "accepted");
});
await test("a musician cannot apply to a slot that already started", async () => {
  const pastSlot = (await db.query(
    "insert into gig_slots (venue_id, starts_at, set_length_min, pay_cents) values ($1, now() - interval '2 hours', 60, 5000) returning id", [front])).rows[0].id;
  await fails(as(dana, "insert into applications (slot_id, musician_id) values ($1, $2)", [pastSlot, dana]), /row-level security/, "late application");
});

console.log("\nPhase 3.5: media posts, shop, stats and storage");
const gus = await newUser("gus@x.test", "musician", "Gus Marlow");
const ivy = await newUser("ivy@x.test", "musician", "Ivy Stone");
const file = (uid, ext = "jpg") => `${uid}/00000000-0000-4000-8000-000000000001.${ext}`;
await test("a photo post without a caption is allowed, and shows up for others", async () => {
  await as(gus, "insert into posts (author_id, body, media_path, media_type) values ($1, '', $2, 'image')", [gus, file(gus)]);
  assert.equal((await as(ivy, "select id from posts where author_id = $1", [gus])).rows.length, 1);
});
await test("a text-only post still needs words", async () => {
  await fails(as(gus, "insert into posts (author_id, body) values ($1, '')", [gus]), /check constraint/, "empty text post");
});
await test("a video post can carry a poster image", async () => {
  await as(gus, "insert into posts (author_id, body, media_path, media_type, poster_path) values ($1, 'Soundcheck', $2, 'video', $3)", [gus, file(gus, "mp4"), file(gus)]);
});
await test("a post cannot point at someone else's file", async () => {
  await fails(as(gus, "insert into posts (author_id, body, media_path, media_type) values ($1, 'x', $2, 'image')", [gus, file(ivy)]), /check constraint/, "foreign media");
  await fails(as(gus, "insert into posts (author_id, body, media_path, media_type, poster_path) values ($1, 'x', $2, 'video', $3)", [gus, file(gus, "mp4"), file(ivy)]), /check constraint/, "foreign poster");
});
await test("media path and type must come together", async () => {
  await fails(as(gus, "insert into posts (author_id, body, media_path) values ($1, 'x', $2)", [gus, file(gus)]), /check constraint/, "path without type");
});
await test("only the author can delete a post", async () => {
  const mine = (await as(gus, "select id from posts where author_id = $1 limit 1", [gus])).rows[0].id;
  assert.equal((await as(ivy, "delete from posts where id = $1 returning id", [mine])).rows.length, 0);
  assert.equal((await as(gus, "delete from posts where id = $1 returning id", [mine])).rows.length, 1);
});
await test("a musician can add a product; a venue cannot", async () => {
  await as(gus, "insert into products (owner_id, title, price_cents, buy_url, photo_path) values ($1, 'Tour tee', 2500, 'https://shop.example.com/tee', $2)", [gus, file(gus)]);
  await fails(as(front, "insert into products (owner_id, title, price_cents) values ($1, 'Pint glass', 800)", [front]), /row-level security/, "venue product");
});
await test("product rules: owner only, https link only, no negative price, own photo only", async () => {
  await fails(as(ivy, "insert into products (owner_id, title, price_cents) values ($1, 'Fake', 100)", [gus]), /row-level security/, "product as someone else");
  await fails(as(gus, "insert into products (owner_id, title, price_cents, buy_url) values ($1, 'Bad', 100, 'javascript:alert(1)')", [gus]), /check constraint/, "javascript link");
  await fails(as(gus, "insert into products (owner_id, title, price_cents) values ($1, 'Neg', -5)", [gus]), /check constraint/, "negative price");
  await fails(as(gus, "insert into products (owner_id, title, price_cents, photo_path) values ($1, 'Steal', 100, $2)", [gus, file(ivy)]), /check constraint/, "foreign product photo");
});
await test("everyone signed in can see products; only the owner can edit or delete", async () => {
  assert.equal((await as(ivy, "select id from products where owner_id = $1", [gus])).rows.length, 1);
  assert.equal((await as(ivy, "update products set price_cents = 1 where owner_id = $1 returning id", [gus])).rows.length, 0);
  assert.equal((await as(ivy, "delete from products where owner_id = $1 returning id", [gus])).rows.length, 0);
  assert.equal((await as(gus, "update products set price_cents = 3000 where owner_id = $1 returning id", [gus])).rows.length, 1);
});
await test("listen links are capped at 8", async () => {
  const nine = JSON.stringify(Array.from({ length: 9 }, (_, i) => ({ label: "L" + i, url: "https://x.test/" + i })));
  await fails(as(gus, "update musician_profiles set media_links = $2::jsonb where profile_id = $1", [gus, nine]), /check constraint/, "9 links");
  await as(gus, "update musician_profiles set media_links = $2::jsonb where profile_id = $1", [gus, JSON.stringify([{ label: "Spotify", url: "https://open.spotify.com/artist/x" }])]);
});
await test("gigs played is public, but bookings stay private", async () => {
  const stats = await as(cleo, "select gigs_played from musician_stats where musician_id = $1", [mara]);
  assert.equal(stats.rows[0].gigs_played, 1); // Mara's completed booking from the reviews section
  assert.equal((await as(cleo, "select id from bookings")).rows.length, 0);
});
await test("storage: you can only write inside your own folder, in both buckets", async () => {
  for (const bucket of ["photos", "videos"]) {
    await as(gus, "insert into storage.objects (bucket_id, name) values ($1, $2)", [bucket, `${gus}/a.bin`]);
    await fails(as(gus, "insert into storage.objects (bucket_id, name) values ($1, $2)", [bucket, `${ivy}/a.bin`]), /row-level security/, `${bucket} foreign folder`);
    assert.equal((await as(ivy, "delete from storage.objects where bucket_id = $1 and name = $2 returning id", [bucket, `${gus}/a.bin`])).rows.length, 0);
    assert.equal((await as(gus, "delete from storage.objects where bucket_id = $1 and name = $2 returning id", [bucket, `${gus}/a.bin`])).rows.length, 1);
  }
});
await test("the videos bucket exists with a size limit and video types only", async () => {
  const b = (await db.query("select file_size_limit, allowed_mime_types from storage.buckets where id = 'videos'")).rows[0];
  assert.equal(Number(b.file_size_limit), 41943040);
  assert.deepEqual(b.allowed_mime_types, ["video/mp4", "video/quicktime", "video/webm"]);
});

console.log("\nPhase 4: subscriptions, cancellations and reliability");
const openSlot = async (days, venueId = front) =>
  (await db.query("insert into gig_slots (venue_id, starts_at, set_length_min, pay_cents) values ($1, now() + ($2 || ' hours')::interval, 90, 10000) returning id", [venueId, String(days * 24)])).rows[0].id;
const apply = (uid, slot) => as(uid, "insert into applications (slot_id, musician_id) values ($1, $2)", [slot, uid]);

await test("a musician with no subscription cannot apply", async () => {
  const nina = await newUser("nina@x.test", "musician", "Nina Cole");
  await fails(apply(nina, await openSlot(5)), /row-level security/, "no plan");
});
await test("a free trial counts as a plan", async () => {
  const tess = await newUser("tess@x.test", "musician", "Tess Ward");
  await subscribe(tess, "trialing", 7);
  await apply(tess, await openSlot(5));
});
await test("an expired, past due or cancelled plan cannot apply", async () => {
  for (const [name, status, days] of [["expired", "active", -1], ["pastdue", "past_due", 20], ["cancelled", "canceled", 20]]) {
    const u = await newUser(`${name}@x.test`, "musician", name);
    await subscribe(u, status, days);
    await fails(apply(u, await openSlot(5)), /row-level security/, name);
  }
});
await test("users cannot give themselves a plan or edit one", async () => {
  const sam = await newUser("sam@x.test", "musician", "Sam Hart");
  await fails(as(sam, "insert into subscriptions (musician_id, plan, status, current_period_end) values ($1, 'yearly', 'active', now() + interval '1 year')", [sam]), /row-level security/, "self plan");
  await subscribe(sam, "canceled", 20);
  assert.equal((await as(sam, "update subscriptions set status = 'active' where musician_id = $1 returning musician_id", [sam])).rows.length, 0);
});

const mkBooking = async (musician, days) => {
  const slot = await openSlot(days);
  await db.query("update gig_slots set status = 'booked' where id = $1", [slot]);
  const b = await db.query("insert into bookings (slot_id, musician_id, venue_id, agreed_pay_cents) values ($1, $2, $3, 10000) returning id", [slot, musician, front]);
  return { slot, booking: b.rows[0].id };
};
await test("a venue can cancel for free when the gig is 48 hours or more away", async () => {
  const { slot, booking } = await mkBooking(mara, 10);
  await as(front, "select cancel_booking($1)", [booking]);
  const row = (await db.query("select cancelled_at, cancelled_late, cancel_fee_cents from bookings where id = $1", [booking])).rows[0];
  assert.ok(row.cancelled_at); assert.equal(row.cancelled_late, false); assert.equal(row.cancel_fee_cents, 0);
  assert.equal((await db.query("select status from gig_slots where id = $1", [slot])).rows[0].status, "cancelled");
});
await test("only the venue on the booking can cancel it", async () => {
  const { booking } = await mkBooking(mara, 10);
  await fails(as(mara, "select cancel_booking($1)", [booking]), /Only the venue/, "musician cancels");
  await fails(as(hops, "select cancel_booking($1)", [booking]), /Only the venue/, "other venue cancels");
});
await test("inside 48 hours the free path is refused (the fee cannot be dodged)", async () => {
  const { booking } = await mkBooking(mara, 1);
  await fails(as(front, "select cancel_booking($1)", [booking]), /48 hours/, "late free cancel");
  assert.equal((await db.query("select cancelled_at from bookings where id = $1", [booking])).rows[0].cancelled_at, null);
});
await test("users cannot call the late-cancellation function, only the server can", async () => {
  const { booking } = await mkBooking(mara, 1);
  await fails(as(front, "select apply_late_cancellation($1, 2500)", [booking]), /permission denied/, "venue calls server function");
  await fails(asAnon("select apply_late_cancellation($1, 2500)", [booking]), /permission denied/, "anon calls server function");
});
let lateBooking;
await test("the server finishes a late cancellation after payment, and repeating it changes nothing", async () => {
  lateBooking = await mkBooking(mara, 1);
  await db.query("select apply_late_cancellation($1, 2500)", [lateBooking.booking]);
  const first = (await db.query("select cancelled_at, cancelled_late, cancel_fee_cents from bookings where id = $1", [lateBooking.booking])).rows[0];
  assert.equal(first.cancelled_late, true); assert.equal(first.cancel_fee_cents, 2500);
  assert.equal((await db.query("select status from gig_slots where id = $1", [lateBooking.slot])).rows[0].status, "cancelled");
  await db.query("select apply_late_cancellation($1, 2500)", [lateBooking.booking]);
  const second = (await db.query("select cancelled_at from bookings where id = $1", [lateBooking.booking])).rows[0];
  assert.equal(String(second.cancelled_at), String(first.cancelled_at));
});
await test("a finished gig cannot be cancelled", async () => {
  await fails(as(front, "select cancel_booking($1)", [booking]), /already happened/, "cancel finished");
});
await test("late cancellations are public numbers; bookings stay private", async () => {
  const r = (await as(cleo, "select late_cancellations, gigs_hosted from venue_reliability where venue_id = $1", [front])).rows[0];
  assert.equal(r.late_cancellations, 1);
  assert.ok(r.gigs_hosted >= 1);
  assert.equal((await as(cleo, "select id from bookings")).rows.length, 0);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log("Failed:\n - " + failures.join("\n - "));
  process.exit(1);
}
