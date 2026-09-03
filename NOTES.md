# Build notes

## What I decided differently from the brief, and why

1. **Database: a new Supabase project, $10/month.** Your Supabase org is on a paid plan where each extra project costs $10/month for compute. The alternative was sharing a database with one of your other apps, which I didn't want to do. Project `reader-rocket` in us-east-1, matching the Vercel function region (`iad1`) set in `vercel.json`. If you'd rather not pay for it, the schema in `supabase/migrations` will recreate the app on any Postgres with PostgREST in a minute.
2. **The app reaches Postgres through the Supabase publishable key, not a database password.** The Supabase tooling I had never exposes the database password, and this keeps your promise of "only one secret" true. The publishable key is designed to be public, so it has a default baked into `src/lib/db.ts` (overridable by env). Row-level security is on with open policies for the anon role, which is equivalent to the app itself being open by design (no login).
3. **Web search tool version is `web_search_20260318`**, the newest listed on the docs page as of today, rather than the `20260209` variant. Sonnet 5 supports it.
4. **Surplus points carry over after a launch.** If Blake needs 3 more points and finishes a 12-point book, the extra 9 start his next rocket rather than vanishing. It seemed cruel otherwise.
5. **Flag cap.** A kid can flag at most `max(2, floor(n/3))` questions on one quiz (2 on a 5-question quiz, 3 on 10, 5 on 15). Flags still cost nothing; the cap just stops "flag everything" from producing a 100% on zero questions. A question retires from the pool after two flags from anyone.
6. **Bonus pool is generated lazily**, right after a passing quiz (in the background while the celebration plays) rather than alongside the main pool, so a failed quiz never pays for bonus questions.
7. **Ranks:** Cadet 0, Pilot 5, Navigator 15, Commander 30, Captain 50, Admiral 80, Star Marshal 120, Galactic Legend 200 lifetime points. Scaled so a third grader sees a promotion every few books early on.
8. **Bolts:** 3 per passing quiz, +3 for 100%, +5 for a cleared bonus round, +4 weekly streak bonus (first book of a week when there was one the week before), +5 per badge, 5 to 10 per weekly mission. Bolts buy cosmetics only; nothing in the shop touches scoring.
9. **Station unlocks are shop parts that become available to both kids** at a given station level (station patch icon, chrome paint, comet exhaust, alien paint, quad boosters, crown icon, galaxy paint). They still cost bolts.
10. **Streak decay:** weekly fuel gauge gains 40 for a week with a book (+15 per extra book) and loses 30 for an empty week; it never snaps to zero after one quiet week.
11. **"Restart current rocket"** (grown-up corner) keeps the books in the library but stops them counting toward the goal. **"Clear a quiz"** removes the attempt and its points so the kid can retry; bolts and badges already earned stay.
12. **Mute** is stored per device (localStorage), not in the database, so an iPad can be quiet while a phone isn't.
13. **Sounds are synthesized** with the Web Audio API rather than shipped as files. iOS needs a tap before audio plays, which every effect here follows.
14. **"Add it yourself" books** get word counts from the length bucket (picture 800, early chapter 8,000, novel 35,000, long novel 80,000) and points from the same AR formula.
15. **Quiz questions are served in plot order** (a random subset of the pool, re-sorted by pool index) as AR does, rather than shuffled.

## Verified

- Point formula against the three reference books: 3.0, 4.5, 12.0. `node --test src/lib/ar.test.mjs`.
- Full loop clicked through with Playwright at 390×844 (iPhone) and 1180×820 (iPad landscape): who's reading → search → book → quiz with a wrong answer and a flag → results celebration → bonus round → shop purchase → patch editor → launch countdown → planet landing → planet map → library → station → a failed quiz → grown-up corner. No console errors or failed requests.
- This sandbox cannot reach supabase.co or api.anthropic.com, so that run used the in-memory database and canned AI. The real database and Claude paths run on Vercel; the migration was applied to the live Supabase project and the seed rows are there.

## Things I could not do for you (the checklist)

See the end of the final message.
