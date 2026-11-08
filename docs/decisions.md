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
