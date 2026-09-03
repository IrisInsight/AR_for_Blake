# Reader Rocket

A home version of Accelerated Reader for Brooklyn and Blake. Pick who's reading, find the book you just finished, take a comprehension quiz, earn points, build a rocket, launch it, discover a planet.

Next.js (App Router) + TypeScript + Tailwind, Postgres on Supabase, Claude Sonnet 5 with web search for book lookup and quiz writing, deployed on Vercel. No accounts: open the URL and tap your name. Progress lives in the database, so it follows the kids across phones and iPads.

## Environment variables

| Variable | Required | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | **Yes** (production) | Server routes call Claude for book search and quiz generation. Never sent to the browser. If it is missing the app still runs; search and quizzes show a clear on-screen message instead of crashing. |
| `SUPABASE_URL` | No | Overrides the built-in database URL. |
| `SUPABASE_PUBLISHABLE_KEY` | No | Overrides the built-in publishable key. Publishable keys are safe to expose; this one stays server-side regardless. |
| `RR_MOCK_AI` | Dev only | `1` returns canned books and questions so you can click through without spending tokens. |
| `RR_FAKE_DB` | Dev only | `1` uses an in-memory database (state resets when the server restarts). |

The only secret you have to touch is `ANTHROPIC_API_KEY`. Add it in Vercel → Project → Settings → Environment Variables, then redeploy.

## Database

Supabase project `reader-rocket` (`nuddxbupepsqgiytxbnh`, us-east-1). Schema lives in `supabase/migrations/`:

- `0001_init.sql`: all tables, row-level-security policies, and the seed rows for Blake (grade 3) and Brooklyn (grade 5), both with a 20-point goal.
- `0002_archived_attempts.sql`: `attempts.archived` for "restart current rocket".

Both migrations are already applied to the live project. To recreate on a fresh Supabase project, run the files in order in the SQL editor (or `supabase db push`), then set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.

## Local development

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm run dev
```

To click through everything with no key and no network: `RR_MOCK_AI=1 RR_FAKE_DB=1 npm run dev`.

`node --test src/lib/ar.test.mjs` checks the AR point formula against the three reference books.

## How the pieces fit

- `src/lib/ar.ts`: point math, quiz length, ZPD ranges, pass threshold. Pure functions.
- `src/lib/ai.ts`: Claude calls (`claude-sonnet-5`, web search tool `web_search_20260318`), JSON extraction, mock mode.
- `src/lib/quiz.ts`: question pools cached per book (18 main, 6 bonus); random subset served per attempt; flagged questions retire after two flags.
- `src/lib/engine.ts`: finishing a quiz or bonus round, awarding points, bolts, badges, missions, streak; launching; the dashboard state shape.
- `src/lib/game.ts`: ranks, badges, missions, streak decay, station levels, planet naming.
- `src/lib/catalog.ts`: every purchasable rocket part with price and unlock rule.
- `src/components/Rocket.tsx`: the inline-SVG rocket, seven build stages, all customizations.
- `src/app/api/*`: server routes. The browser never talks to Supabase or Anthropic directly.

## Deploying

The Vercel project is linked to this repository; every push to the production branch deploys. See `NOTES.md` for decisions and the setup checklist.
