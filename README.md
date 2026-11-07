# GigMate

Local musicians and venues, connected. Launching in Dayton, Ohio.

A mobile-first, installable web app built at Startup Weekend. Musicians browse open gig slots and build a press kit. Venues post slots, compare applicants and fill empty nights.

## Run it

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open http://localhost:3000 and pick a preview. Check screens at 375px wide.

## Stack
Next.js 16, TypeScript, Tailwind CSS v4, Supabase, Stripe (test mode), Vercel.

See `CLAUDE.md` for product decisions and `docs/decisions.md` for architecture choices and tradeoffs.
