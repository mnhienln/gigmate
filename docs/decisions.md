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
