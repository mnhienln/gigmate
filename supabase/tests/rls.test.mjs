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

const sql = readFileSync(process.env.SQL_PATH ?? new URL("../migrations/0001_init.sql", import.meta.url), "utf8");

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

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log("Failed:\n - " + failures.join("\n - "));
  process.exit(1);
}
