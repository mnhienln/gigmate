# Architecture decisions

Each entry: what we chose, why, and the tradeoff.

## 1. Route groups plus real `/m` and `/v` prefixes
Route groups `(musician)` and `(venue)` give each app its own layout, theme and nav without changing URLs. Both apps want a "profile" page, so real prefixes keep paths unique and make the role guard a simple prefix check.
Tradeoff: slightly longer URLs.

## 2. Themes through CSS variable tokens
Both themes define the same variable names (`--bg`, `--ink`, `--gold`, ...). A layout sets `data-theme`, and shared components restyle themselves with no branching in code.
Tradeoff: more upfront design of the token set.

## 3. Request-time content sits behind Suspense (Cache Components)
Next 16 prerenders as much as it can. Anything that depends on the request (the date, the signed-in user, database rows) is rendered at request time inside `<Suspense>` after `await connection()`. The skeleton in the fallback paints instantly.
Tradeoff: one extra render step per visit, in exchange for fresh, per-user content and a fast first paint.

## 4. Client components get plain data only
Server layouts cannot pass functions, such as icon components, to client components. The nav receives an icon name and looks it up on the client.
Tradeoff: new icons must be registered in one file.

## 5. Self-hosted fonts with Fontsource
The cloud environment does not reach Google Fonts, and self-hosting avoids a third-party request on every page load.
Tradeoff: font files add to our own bundle.

## 6. Notches on the ticket card are positioned divs, not a CSS mask
Simpler to read and to keep accessible. Tradeoff: the page background must stay a flat color or the notches would show.

## 7. No held payouts, no Stripe Connect (for now)
Revenue comes from musician subscriptions, venue boosts and cancellation fees, so GigMate never sits between the two sides for gig pay. This removes the riskiest and most regulated part of the build, and subscription revenue cannot be bypassed by taking a deal off-platform.
Tradeoff: GigMate cannot guarantee musicians get paid, so trust has to come from reviews and reliability signals.

## 8. Dayton time is converted at the edges, with the built-in Intl API
The database stores UTC instants. Forms collect Dayton date and time, convert to UTC when saving, and convert back when showing. Day-only values travel as `YYYY-MM-DD` strings, which cannot shift a day. Intl already knows daylight saving, so we use it instead of a date library.
Tradeoff: we maintain a small conversion helper ourselves, so it has unit tests around the daylight saving switch.

## 9. The week view is a day strip plus a list on phones
Seven real columns would be about 45px wide at 375px, too small to read or tap. Seven tappable day chips with dots (open or booked), plus the selected day's gigs listed below, keeps the whole week visible and every target at least 44px.
Tradeoff: one day at a time. A true seven-column grid is a good addition for desktop.

## 10. Accepting a musician is one database function
`accept_application()` accepts the applicant, declines the rest, marks the slot booked and creates the booking in a single transaction, and it locks the rows while doing so. Two venue staff tapping at once cannot double-book a night.
Tradeoff: the rule lives in SQL, not TypeScript, so changes need a migration.

## 11. Compare is plain HTML, not JavaScript
The checkboxes belong to a GET form through the `form` attribute, so "compare two" works with no client code and the compare view is a normal, linkable page. Tradeoff: the pick-two rule is checked on the server after submit, with a plain message, instead of live in the browser.

## 12. Venue look is a sibling of the musician look
Same fonts, brand colors and stripes, but white paper, denser cards and burnt orange as the one primary action color. The two apps feel like one brand. All venue colors live in one CSS block, so changing the look is a single edit.

## 13. Discover filters live in the URL
Filters are a plain GET form, so a filtered view is a link: it can be bookmarked, shared, and the back button works, with no client JavaScript. The page accepts only values from our own lists and ignores anything else, so a hand-edited URL cannot break the query.
Tradeoff: results update when you tap "Show gigs", not as you type.

## 14. One ticket component, many uses
The poster-style ticket takes an `action` slot instead of knowing about applying. The feed (one featured gig) and Discover (every gig) reuse it, and later the boost badge can reuse it too.
Tradeoff: a slightly more abstract component than a one-off card.

## 15. Application state decides what the Apply button shows
The button reads this musician's application for each gig (none, pending, accepted, declined, withdrawn). A gig cannot be applied to twice from the UI, and a stale tab that tries anyway is stopped by the database's unique rule, which we turn into a friendly message.
Tradeoff: one extra query per page to look up the musician's applications.

## 16. The database says no to late and wrong-state changes
A tiny migration (0003) makes withdrawing possible only while an application is pending, and applying possible only to future open gigs. The app also checks, but the database is the last line of defense, since anyone can call the API directly.
Tradeoff: another SQL file to apply. It is tested in the local security suite.

## 17. Auth-dependent behavior is tested on the deployed site
Inside the cloud container, a network proxy attaches the secret key to every database request, so the database cannot tell who is logged in. Rather than bend the app to suit that, the browser tests have a real-keys mode that runs against the Vercel deployment. There, "accept an applicant", "gig happened" and the "gig just closed" refusal all run through the real database rules.
Tradeoff: those tests need the live site and touch the live (demo) data, so they clean up after themselves.

## 18. Files go from the phone straight to storage
A phone photo is 5 to 10 MB and Vercel only accepts about 4.5 MB per request, so routing uploads through our server would fail. The browser resizes the photo, uploads it to Supabase Storage under the user's own folder, and then calls a small server action that only records the path. Storage rules and a database check both insist the path is in the caller's own folder.
Tradeoff: more code runs on the phone, and an upload can succeed while recording fails, so the client removes the file if that happens.

## 19. One posts table for the profile grid and the feed
Instagram shows the same post in your grid and in followers' feeds, so we reuse `posts` and add optional media columns instead of creating a second table. A photo or video post can have an empty caption; a text post cannot.
Tradeoff: the feed query carries a few more columns, but nothing has to be merged or kept in sync.

## 20. A profile is read-only until you tap Edit profile
Viewing and editing live on different pages. Nothing on the profile can be changed by a stray tap, and the same read-only view is what a venue sees, so what the musician previews is exactly what venues get.
Tradeoff: one extra tap to edit.

## 21. Streaming sites are buttons, not embedded players
Spotify, YouTube and SoundCloud each need their own embed code and track URLs, and autoplay rules differ per phone. A button that opens the artist's page works the same everywhere and is what a booker needs: tap, listen, decide.
Tradeoff: the listener leaves the app. Embeds can be added later per site.

## 22. Tests check what the visitor sees, not only HTTP codes
A page that streams has already sent status 200 when it discovers an id does not exist, so "not found" pages come back as 200 with the right words on screen. Missing files in Supabase Storage answer HTTP 400 with "not found" inside. The tests assert on the visible result (and "not 200" for files) because that is what users actually experience.
Tradeoff: a search engine would see a soft 404. This is a logged-in app, so that does not matter here.

## 23. Only a signed message from Stripe can grant anything
Coming back from Stripe's page proves nothing: anyone can type the success address. So the plan, the boost and the late cancellation are granted only by the webhook, after it checks Stripe's signature. The success page just waits and re-checks. The tests prove it: starting checkout, or visiting the success address, changes nothing.
Tradeoff: a few seconds of "activating your plan" after paying, and a public webhook address to keep working.

## 24. Every webhook step is safe to run twice
Stripe may deliver a message more than once or out of order. Plans are saved with an upsert, a boost is recorded under a unique Checkout Session id so a repeat adds nothing, and the late-cancellation function does nothing if the gig is already cancelled.
Tradeoff: slightly more careful code than "just do it".

## 25. The 48-hour rule lives in the database, and the late path is server-only
A venue can only cancel for free if the real start time is 48 hours or more away, and that is checked in SQL, so calling the database directly cannot dodge the fee. The late path is a separate function that signed-in users are not allowed to call; only the server, after Stripe confirms the $25, can.
Tradeoff: two functions instead of one, but the money rule cannot be bypassed from a browser.

## 26. Prices and money rules sit in one file
`src/lib/pricing.ts` holds the plans, trial length, boost price, cancellation window and fee, plus the helpers that decide "late" and "boosted". The screens, the Stripe setup script and the tests all read it, so they cannot disagree, and the 48-hour edge is unit-tested.
Tradeoff: changing a price also means re-running the Stripe setup so Stripe has the new amount.

## 27. The shop belongs to venues, and the database says so
A venue sells bar merch (shirts, glasses, gift cards) and a musician's profile is about their music, photos and videos. So only a venue can add shop items: the insert rule in migration 0006 checks the role, the upload actions check it again, and the musician profile simply has no Shop tab. The old band shop items are deleted by the same migration.
Tradeoff: a band can no longer show merch inside GigMate. They can still link their own store from the Music tab.

## 28. One profile layout, two sets of tabs
Musicians and venues share the same Instagram-style pieces (avatar, header, photo and video grid, post composer, edit sections). Only the tab list differs: Posts and Music for musicians, Photos, Videos and Shop for venues. The tabs are plain links (`?tab=videos`), so each view has its own address and works without JavaScript.
Tradeoff: the shared pieces take a little more setup than two copies would, but a fix to the grid or the composer now lands in both apps at once.
