# Blake's Rocket Reader Challenge

A home version of Accelerated Reader for Blake. Open the app, find the book you just finished, take a comprehension quiz, earn points, build a rocket, launch it, discover a planet.

Next.js (App Router) + TypeScript + Tailwind, Postgres on Supabase, Claude Sonnet 5 with web search for book lookup and quiz writing, deployed on Vercel. No accounts: open the URL and you are on Blake's dashboard. Progress lives in the database, so it follows him across phones and iPads.

## Environment variables

| Variable | Required | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | **Yes** (production) | Server routes call Claude for book search and quiz generation. Never sent to the browser. If it is missing the app still runs; search and quizzes show a clear on-screen message instead of crashing. |
| `SUPABASE_URL` | No | Overrides the built-in database URL. |
| `SUPABASE_PUBLISHABLE_KEY` | No | Overrides the built-in publishable key. Publishable keys are safe to expose; this one stays server-side regardless. |
| `GOOGLE_BOOKS_KEY` | No | Only needed if Google Books starts rate-limiting the fallback catalog search. |
| `RR_MOCK_AI` | Dev only | `1` returns canned books and questions so you can click through without spending tokens. |
| `RR_FAKE_DB` | Dev only | `1` uses an in-memory database (state resets when the server restarts). |

The only secret you have to touch is `ANTHROPIC_API_KEY`. Add it in Vercel → Project → Settings → Environment Variables, then redeploy.

## Database

Supabase project `reader-rocket` (`nuddxbupepsqgiytxbnh`, us-east-1). Schema lives in `supabase/migrations/`:

- `0001_init.sql`: all tables, row-level-security policies, and the seed rows (originally two readers).
- `0002_archived_attempts.sql`: `attempts.archived` for "restart current rocket".
- `0003_single_reader.sql`: removes the second reader; the app is Blake's alone. Blake is grade 3 with a 20-point goal.
- `0004_search_prep_gate.sql`: book format and page count, the search cache, the quiz prep queue, settings (family code, catalog provider), and per-call API usage.

All migrations are already applied to the live project. To recreate on a fresh Supabase project, run the files in order in the SQL editor (or `supabase db push`), then set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.

## Local development

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm run dev
```

To click through everything with no key and no network: `RR_MOCK_AI=1 RR_FAKE_DB=1 npm run dev`.

`node --test src/lib/ar.test.mjs` checks the AR point formula against the three reference books.

## Getting in

The app sits behind a family code (no passwords, no accounts). The grown-up corner shows a shareable link that carries the code; opening it once on a device sets a long-lived cookie. Typing the code on `/enter` does the same. "Make a new code" in the grown-up corner invalidates every other device.

## How search works now

1. `POST /api/search` asks Open Library (Google Books as fallback) for candidates: title, author, pages, year, cover. Sub-second, cached per query.
2. Cards render immediately. For each card not already in `books`, the client calls `POST /api/resolve`, where Claude Haiku 4.5 (web search) finds the ATOS level, AR word count, format, and series. If Haiku is unsure, Sonnet 5 takes over for that book. The result is cached forever by normalized title plus author.
3. Word counts are clamped by format (`FORMATS` in `src/lib/ar.ts`), so a 200-page graphic novel scores like a graphic novel, not a 50,000-word novel.
4. Resolving a series book warms the next five books of that series in the background.

## Quiz prep

The grown-up corner's "Quiz prep" resolves a book and writes its question pool right away. The worker (`POST /api/prep/run`) processes three books at a time and chains itself until the queue is empty. Finishing a series book queues the next one. `GET /api/admin/seed` queues the built-in list of common series in `src/lib/seedlist.ts`.

Admin routes (all behind the family code): `/api/admin/booksapi` compares the two catalogs, `/api/admin/verify-levels?model=haiku|sonnet` checks levels against known AR values, `/api/admin/audit` re-resolves any cached book that looks inflated for its format and rescores earned points, `/api/admin/usage` totals Claude spend.

## How the pieces fit

- `src/lib/ar.ts`: point math, quiz length, ZPD ranges, pass threshold. Pure functions.
- `src/lib/ai.ts`: Claude calls (Sonnet 5 for quizzes with `web_search_20260318`, Haiku 4.5 for levels with `web_search_20250305`), usage and cost logging, JSON extraction, mock mode.
- `src/lib/bookapis.ts`: Open Library and Google Books adapters. `src/lib/resolve.ts`: level and format resolution with caching and series warming. `src/lib/prep.ts`: the prep queue worker.
- `src/proxy.ts`: the family-code gate.
- `src/lib/quiz.ts`: question pools cached per book (18 main, 6 bonus); random subset served per attempt; flagged questions retire after two flags.
- `src/lib/engine.ts`: finishing a quiz or bonus round, awarding points, bolts, badges, missions, streak; launching; the dashboard state shape.
- `src/lib/game.ts`: ranks, badges, missions, streak decay, station levels, planet naming.
- `src/lib/catalog.ts`: every purchasable rocket part with price and unlock rule.
- `src/components/Rocket.tsx`: the inline-SVG rocket, seven build stages, all customizations.
- `src/app/api/*`: server routes. The browser never talks to Supabase or Anthropic directly.

## Deploying

The Vercel project is linked to this repository; every push to the production branch deploys. See `NOTES.md` for decisions and the setup checklist.
