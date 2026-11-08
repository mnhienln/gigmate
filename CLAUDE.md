# GigMate

Mobile-first web app (installable PWA) connecting local musicians with bars, breweries and small venues. Launch city: Dayton, Ohio. Built by a student team at Startup Weekend as a working demo.

@AGENTS.md

## Read this first
- This is Next.js 16 with Cache Components. Read the relevant guide in `node_modules/next/dist/docs/` before writing Next code. Key differences already hit: `middleware.ts` is now `proxy.ts`; request-time values (dates, cookies, DB reads) must sit inside `<Suspense>` after `await connection()`; icon components cannot be passed from server to client components (pass a string name).
- The user is a student learning. For every architecture choice, explain it in 2 to 3 sentences and name the tradeoff (in chat, and in `docs/decisions.md` for lasting ones).
- Do not use em dashes in any text, code comment or UI copy.
- Work in phases. After each phase: run the app, fix errors, summarize, commit, and wait for the go-ahead.
- Keep secrets in `.env.local` and the cloud environment settings. Never commit keys. Never ask the user to paste keys into chat.

## Business model (changed from the first brief, current as of Nov 2026)
- Venues use GigMate free. They pay only for (1) boosting a slot post and (2) a last-minute cancellation fee.
- Musicians pay a subscription: $5 weekly, $16 monthly, yearly price TBD. Free trial TBD.
- GigMate takes NO cut of gig pay. Venues and musicians settle pay directly for now (in-app payment is a possible later phase).
- Therefore: no Stripe Connect, no held payouts, no "Gig happened releases payout". Do not build them unless asked.
- Stripe (TEST MODE only) is used for exactly three things: musician subscription (Checkout, subscription mode), venue boost (Checkout, one-time), venue cancellation fee (Checkout, one-time).
- OPEN decisions, ask before building the related screen: yearly price and trial; what a non-subscriber can do (proposal: browse free, subscribe to apply); cancellation window, fee amount and who receives it; boost price and duration (guess: $10 for 24h).
- Pitch framing: reliable opportunities and connections, backed by reviews and reliability signals (for example "cancelled last minute: 0 times" on venue profiles).

## Platform and stack
- One codebase, one database, one login. Role chosen at signup (musician or venue) decides the shell. Role is set once and immutable.
- Next.js 16 (App Router) + TypeScript, Tailwind CSS v4, Supabase (auth, Postgres, storage), Stripe test mode, deploy on Vercel.
- Design at 375px first, then tablet and desktop. Check every screen at 375px before calling it done.
- Fonts are self-hosted via `@fontsource/*` (the cloud environment cannot reach Google Fonts).

## Two apps under one brand
Route groups with real URL prefixes so paths never collide and the role guard is a prefix check.

Musician app, `src/app/(musician)/m/`, theme `poster` (warm retro gig-poster look; see mockup notes below). Bottom nav, 5 slots:
Feed (home) | Discover | + (new post, raised center button) | Bookings | Profile.
Header has logo, Alerts and Messages icons. Messages is a placeholder (real-time chat is out of scope).

Venue app, `src/app/(venue)/v/`, theme `daylight` (light, calendar-first, denser, utilitarian). Bottom nav, 4 tabs:
Calendar | Requests | Find acts | Venue profile. Plus a prominent "Need an act tonight" flow that posts an urgent slot.

Both nav bars become side rails on desktop (`md` and up). Not built yet.

### Musician visual language (from the user's mockup)
- Tokens (in `src/app/globals.css`): cream `#f6e5bc` background, espresso `#3b2314`, burnt orange `#b8461a`, mustard `#e4a52a`, brick `#8f2d1c`.
- Type: Anton (display, uppercase), Space Mono (labels, uppercase, tracked), DM Sans (body), Playfair Display 900 italic (logo and date numerals).
- Signature pieces: four-line stripe under the logo; "Now booking" ticket card with punched notches and an orange date stub (this is the natural place for BOOSTED slots); post card with vinyl-record media and a rotated "Verified sound" stamp.
- Contrast was checked: all small text meets 4.5:1. Re-check any new color pair.
- Components share token NAMES across themes (`bg-bg`, `text-ink`, `bg-gold`, `bg-accent`, `bg-nav`...), so shared components work in both apps.

## Data model (target; refine in migrations)
profiles(id, role, display_name, city, neighborhood, avatar_url, onboarded_at)
musician_profiles(profile_id, genres, rate_min_cents, rate_max_cents, bio, media_links, photos, available_tonight, verified_sound)
musician_availability(musician_id, weekday or date)
venue_profiles(profile_id, venue_type, capacity, has_pa, stage_notes, address, photos)
gig_slots(id, venue_id, starts_at, set_length_min, pay_cents, genre, gear_provided, status, is_urgent, boosted_until)
applications(id, slot_id, musician_id, status), unique(slot_id, musician_id)
invitations(id, slot_id, musician_id, status)
bookings(id, slot_id unique, application_id, musician_id, venue_id, agreed_pay_cents, completed_at, cancelled_at, cancelled_by)
reviews(id, booking_id, reviewer_id, reviewee_id, rating, body, created_at), unique(booking_id, reviewer_id)
posts(id, author_id, kind, body, media_url, slot_id, created_at)
subscriptions(musician_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end)
boosts(id, slot_id, venue_id, stripe_checkout_session_id, starts_at, ends_at)
Money is integer cents. Timestamps are timestamptz, displayed in America/New_York.

## Security rules
- Row Level Security on every table. Users edit only their own rows.
- Reviews: allowed only on completed bookings by a party to the booking. A review is visible to the other side once both reviews exist OR 7 days have passed. Implement as a computed RLS rule, not a stored column (a column cannot flip itself without a cron job).
- Subscription and boost state is written only by the server (service role) from the Stripe webhook, never trusted from the browser.
- `SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_SECRET_KEY` are server-only. Never import them in client code.
- The webhook is the source of truth for payments, not the success redirect.
- `src/proxy.ts` is only an optimistic redirect (logged out goes to /login). The real checks are `requireRole()` in `src/lib/auth.ts` (rendered through `<RoleGate>` in each app layout) and RLS in the database. Every server action must re-check the user itself.
- Role and column protection: `profiles.role`, `musician_profiles.verified_sound`, `gig_slots.boosted_until` and `gig_slots.status` are NOT writable by users (column grants). Slot status and bookings change only through the SQL functions `accept_application()` and `mark_gig_complete()`.

## Seed data and demo
- Fictional Dayton-area venues and musicians only (no real business names). DECISION (user, Nov 2026): do NOT use real businesses such as Blind Bob's, and do not scrape Instagram; everything is invented.
- DONE: `npm run seed` (`scripts/seed-demo.mjs`, run with `NODE_USE_ENV_PROXY=1` in the container) creates 14 fictional bars with addresses, capacity, PA and stage notes, 31 open gigs in the NEXT 3 WEEKS ($60 to $450, 12 genres, notes about tips and perks) and 8 venue announcements for the feed. Safe to re-run; RE-RUN IT THE DAY BEFORE THE DEMO so gigs stay in the future. It never touches the demo accounts (Mara Quinn, Front Room Bar). The demo venue starts with NO gigs on purpose, so the live demo can post one.
- DONE: `npm run seed:musicians` (`scripts/seed-musicians.mjs`, run AFTER `npm run seed`, with `NODE_USE_ENV_PROXY=1`) creates 15 fictional acts (emails `band.<slug>@gigmate.test`) with profile photo, 3 posts and 0 to 2 shop items each (all pictures are drawn by a headless browser: poster-style art, no photos of anyone), plus 31 completed gigs and 62 reviews so ratings run 4.0 to 5.0 and three acts are still "New". Music links point at the front page of Spotify, YouTube, SoundCloud or Bandcamp because the acts are invented. Re-running is safe: it replaces the acts' posts, products and history (history gigs carry the note `seed-history`). `npm run seed` only refreshes FUTURE open gigs, so history survives. The demo musician (Mara Quinn) and the demo venue (Front Room Bar) are deliberately left as blank slates for the live demo.
- Browser tests are scoped to the demo venue ("Front Room Bar") so seeded data cannot break them. Never run broad deletes on the live database (an unfiltered delete was blocked by the safety classifier); delete by exact id or by the test venue's id.
- Seeding runs through a script using the Supabase admin API (it must create auth users).
- Login screen gets one-tap "Demo as musician" and "Demo as venue" buttons (user approved). Hide them outside the demo.
- Images are generated gradients and SVG, no licensed photos.
- Email confirmation is disabled in Supabase so sign-up works on stage.

## Out of scope
Native apps, in-app gig payouts (for now), push notifications, real-time chat, recommendation algorithms, admin dashboard.

## Phases and status
1. Scaffold, auth, role-based routing. DONE: scaffold, tokens, both shells, musician Feed home, `supabase/migrations/0001_init.sql` (schema, RLS, functions) with 37 passing local tests (`npm run test:db`, 41 tests after 0003; date helpers: `npm run test:unit`, 15 tests), `0002_storage.sql`, Supabase clients, proxy, `requireRole`/`RoleGate`, login, signup with role choice, 3-step onboarding per role, `/home` router, logout, demo-login buttons (`DEMO_MODE=true`), `scripts/create-demo-users.mjs`. Migrations 0001 and 0002 are APPLIED to the live project and demo users exist. VERIFIED against the live project with Playwright at 375px: demo logins, role guards in both directions, logout, login errors, 3-step onboarding for both roles with correct saved data. NOT yet verified: the public signup form (blocked by Supabase email settings, see below). TODO: PWA icons (192 and 512 PNG in `/public`), Stripe test-mode spike (webhook), desktop side rail.
2. Venue flow. DONE and verified in a browser at 375px (`tests/e2e/venue-flow.cjs`, 38 checks): calendar with week strip and day list, Post a gig, Need an act tonight (urgent), slot detail (cancel open slot, Gig happened), Requests with side-by-side compare and Accept/Decline, Venue profile edit. NOT built: venue photos upload (do in phase 6), Find acts and invitations (phase 5). The success paths of Accept and Gig happened cannot run inside this container (see Environment notes) but are VERIFIED on the live deployment with real keys (`REAL_KEYS=1`, 39 checks).
3. Musician flow. DONE and verified in a browser at 375px (`tests/e2e/musician-flow.cjs`, 48 checks): Feed on real data (featured gig ticket, pending count, scene posts read-only; the fake sample post is removed), Discover with when/genre/minimum-pay filters as a GET form, one-tap apply with "Applied" states and a stale-tab duplicate guard, Bookings with Confirmed/Applied/Played tabs and withdraw, Profile press kit view and edit (genres, rates, bio, up to 3 listen links, available tonight). Apply is FREE for everyone for now; the subscription gate is added in phase 4 once the open decisions are answered. A withdrawn application cannot be re-submitted for the same gig (unique pair). The profile and the + button were then rebuilt as the Instagram-style profile (see 3.5 below). Migration `0003_musician_rules.sql` (withdraw only while pending, apply only to future open slots) exists with passing tests; The user reported running it successfully in the Supabase SQL Editor (applied to the live project; this container cannot independently confirm policies).
3.5. Instagram-style profiles (user request, Nov 2026). DONE and VERIFIED in a browser at 375px. Migration `0004_profiles_media.sql` is APPLIED to the live project (the user ran it; confirmed the `products` table, `musician_stats` view, new posts columns and the `videos` bucket exist). Tests: `npm run test:db` 54, `tests/e2e/profile-flow.cjs` 46 (uploads, photo shrunk 2400x1600 to 1600x1067 at 72 KB, video thumbnail, viewer, feed, profile photo, shop, venue view, deletes remove files), `musician-flow` 51, `venue-flow` 38. NOT yet on the live site: `main` has not been moved forward, so https://gigmate-delta.vercel.app still has the OLD profile until the user approves a deploy (fast-forward `main` from `claude/phase-1-scaffold`). What exists: `/m/profile` read-only view (avatar, Posts/Gigs/Rating stats, genres, bio, tabs Posts | Music | Shop via `?tab=`), `Edit profile` button to `/m/profile/edit` (profile photo, details form with up to 5 music links, manage posts, shop form), `/m/post` composer (photo or video up to 60 s and 40 MB, caption), `/v/musicians/[id]` read-only venue view, Requests cards and Compare link to it, feed posts show uploaded media. Decisions: music = buttons that open Spotify/YouTube/SoundCloud (no OAuth, no in-app player); products = showcase with optional external buy link (no in-app checkout, no Connect); uploads go browser to Supabase Storage directly (photos resized to 1600 px JPEG in the browser; videos get a thumbnail made in the browser); Vercel request body limit is why. Videos are not transcoded (phone MOV plays on iOS/Safari; desktop Chrome may not play H.265). NOT built: likes, comments, followers, public profiles for other musicians to view each other, venue photo gallery.
4. Stripe test payments (subscription, boost, cancellation fee). 5. Reviews, creating posts, Find acts and invites, public profiles. 6. Seed data, photo upload, polish, deploy.

## Environment notes
- LIVE SITE: https://gigmate-delta.vercel.app (Vercel project `gigmate`, id `prj_CYh5JWnPSkwJ21Hi7rRH3HhvUoPq`, team `team_z84QQfPl7SnXO8J5f01VnagL`). Vercel auto-deploys the GitHub `main` branch to production. `main` is the repo default branch. Work happens on `claude/phase-1-scaffold` and is fast-forwarded to `main` only when the user agrees (a push to `main` redeploys the live site). The repo is PUBLIC, so never commit secrets.
- Vercel env vars set by the user in Vercel's own form: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable), `DEMO_MODE=true`, `DEMO_PASSWORD`. NOT set yet: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (needed in phase 4; the user must add them in Vercel, never in chat). `DEMO_MODE` is read at BUILD time by the login page, so changing it needs a redeploy. If the demo password changes, run `NODE_USE_ENV_PROXY=1 npm run demo:users` with the new `DEMO_PASSWORD` in `.env.local` so the demo accounts match.
- The Vercel connector in this session is READ-ONLY (it could not create a project). The user creates and configures projects in Vercel's website. Reading works: `list_projects` WITHOUT a teamId, then `list_deployments` with the projectId.
- This session's network allows `gigmate-delta.vercel.app`, so browser tests can run against the live site: `cd /tmp && BASE=https://gigmate-delta.vercel.app REAL_KEYS=1 S=<dir> NODE_PATH=$(npm root -g) node /home/user/gigmate/tests/e2e/venue-flow.cjs` (and `musician-flow.cjs`). Use the live site for anything that depends on `auth.uid()` or RLS, because inside the container the proxy hides the user's identity.
- Cloud environment `gigmate` allows only: the Supabase project host (`wbekcrhqodrphehktutt.supabase.co`), `api.stripe.com`, and package registries. Add hosts through the environment settings.
- Local-only env: `DEMO_MODE=true` and `DEMO_PASSWORD` (demo accounts `demo.musician@gigmate.test`, `demo.venue@gigmate.test`). Set the same on Vercel for the demo site.
- Supabase env var names: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. New variables only load in a NEW session.
- Playwright and Chromium are preinstalled. Screenshot check: `NODE_PATH=$(npm root -g) node script.js` from outside the project. Kill old servers with `fuser -k <port>/tcp` before restarting (a stale `next start` serves a replaced build and breaks CSS).
- Pushes use the Claude GitHub App on `mnhienln/gigmate`.
- The Supabase SECRET key is saved on the cloud environment as a network credential for the Supabase host; the proxy injects it into requests. It is NOT in any env var, so locally `.env.local` holds a placeholder `sb_secret_placeholder_injected_by_proxy`. Consequence: every request from this container to Supabase carries the secret key in the `apikey` header, so tests from here are not a faithful check of RLS. Use `npm run test:db` (PGlite) for that.
- This container cannot create tables (no database login). SQL is applied by the user pasting it into the Supabase SQL Editor.
- Node's built-in fetch ignores the container proxy. Run anything that talks to Supabase or Stripe from Node (scripts, `npm start` for browser tests) with `NODE_USE_ENV_PROXY=1`, for example `NODE_USE_ENV_PROXY=1 npm run demo:users`. curl and the browser tests need nothing special.
- Supabase signup facts learned the hard way: addresses ending in `.test` are rejected by public signup (`email_address_invalid`) but the admin API accepts them, which is why demo and test users are created through the admin API. With "Confirm email" ON, signup tries to send an email and the built-in sender is rate limited to a few emails per hour (`over_email_send_rate_limit`), so real signups fail on stage. The project currently has Confirm email ON. Turn it OFF before the demo (Authentication, Sign In / Providers, Email).
- Handy live-project checks without a browser: `curl https://wbekcrhqodrphehktutt.supabase.co/rest/v1/ -H "apikey: proxy-injected"` lists tables and functions (the proxy swaps in the real key).
- PROVEN limitation: because the proxy injects the SECRET key as the `apikey` header, the database ignores the signed-in user's JWT for requests made from this container (`current_role_is('venue')` returns false for the real demo venue, `auth.uid()` is null). The app therefore runs as the service role here: RLS and any SQL that uses `auth.uid()` (accept_application, mark_gig_complete, ownership checks) cannot be exercised through the running app. The faithful fix is to remove the saved network credential and instead set `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable) plus `SUPABASE_SERVICE_ROLE_KEY` as environment variables in the environment settings, then use a new session. Until then, test RLS with `npm run test:db` and verify auth-dependent flows on a deployment with real keys.
- Never ask the user to paste keys in chat. If they do, tell them to rotate the key.
