# Blake's Reading Jackpot

A reading tracker with a slot machine in it. Every minute Blake reads earns one spin. Every spin pays points. Points fill a jackpot meter; filling it wins a trophy for the shelf. Coins earned alongside points buy new looks for the machine and never touch the score.

Next.js (App Router) + TypeScript + Tailwind, Postgres on Supabase, deployed on Vercel. No accounts: the whole app sits behind a family code that a device learns once from a shareable link. No AI, no API keys.

## How it works

- **Timer.** Start reading on the dashboard; the timer keeps running across reloads and devices because the session lives in the database. Stop to collect one spin per full minute (leftover seconds carry to the next session). A single sitting stops crediting after 120 minutes. A grown-up can also add minutes read elsewhere.
- **Machine.** Three reels, eight weighted symbols, rolled on the server (`src/lib/slots.ts`). Any spin pays 2 points, a pair 6, triples 25 to 150, three gems 500. Expected value is about 4.5 points a spin, so the default 250-point jackpot is roughly an hour of reading.
- **Two currencies.** Points measure reading and are never spent. Coins come from spins, badges, missions and jackpots, and buy cabinet colors, symbol sets, lever knobs and marquee lights.
- **Meta.** Ranks from lifetime points, weekly missions built from recent activity, a daily streak with a fading gauge, badges, and a trophy per jackpot.

## Environment variables

| Variable | Required | What it does |
|---|---|---|
| `SUPABASE_URL` | No | Overrides the built-in database URL. |
| `SUPABASE_PUBLISHABLE_KEY` | No | Overrides the built-in publishable key (safe to expose; it stays server-side here anyway). |
| `RR_FAKE_DB` | Dev only | `1` uses an in-memory database with family code `TESTCODE`. |

There are no secrets to configure.

## Database

Supabase project `reader-rocket` (`nuddxbupepsqgiytxbnh`, us-east-1). Migrations in `supabase/migrations/` are applied in order; `0005_slot_machine_pivot.sql` drops the quiz-era tables and adds `reading_sessions`, `spins` and `jackpots`. `scripts/migrate-db.mjs` copies every table between two Supabase projects (see `NOTES.md` on moving to a free tier).

## Local development

```bash
npm install
RR_FAKE_DB=1 npm run dev     # then open http://localhost:3000/?code=TESTCODE
```

## Layout

- `src/lib/slots.ts`: symbols, weights, payouts, the roll.
- `src/lib/engine.ts`: timer start/stop, minute crediting, spinning, jackpots, badges and missions.
- `src/lib/game.ts`: ranks, badges, missions, streak, trophy names.
- `src/lib/catalog.ts`: everything the shop sells.
- `src/components/SlotMachine.tsx`: the cabinet, reels and lever; animation is CSS transforms, outcomes come from the server.
- `src/proxy.ts`: the family-code gate.
