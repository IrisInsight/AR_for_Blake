# Build notes

## Round three: the slot machine pivot

Quizzes, book search, Claude, and the rocket are gone. Reading minutes are the only input. Decisions I made:

1. **One minute = one spin, credited when the timer stops.** Leftover seconds carry over so a 4:50 session isn't rounded down forever. A sitting caps at 120 minutes so a forgotten timer can't mint a night of spins. The grown-up corner can stop or cancel a running timer, add minutes read elsewhere, delete a session (which takes its spins back), and hand out a few bonus spins.
2. **Payouts.** Any spin 2, pair 6, triples 25/25/50/50/75/75/150, three gems 500. Weights make triples about 2.5% of spins and the gem triple about 1 in 37,000. Expected value ≈ 4.5 points per spin, so the default 250-point jackpot is about an hour of reading. Every spin pays something because reading always counts.
3. **Coins replace bolts** (same column, new name). One coin per spin, extra for pairs and triples, 30 for a jackpot, 5 per badge, 8 to 18 per mission. Cosmetics only.
4. **Jackpot = trophy.** Filling the meter puts a named trophy on the shelf, bumps the level, and carries surplus points into the next meter.
5. **Streak counts days with at least 10 minutes**, with a gauge that fades over missed days instead of snapping to zero.
6. **Missions** are weekly and about minutes and days (60 or 120 minutes, 3 or 5 days, a 30-minute day) plus one machine mission (25 spins, or land a triple once he has spun a while).
7. **Machine cosmetics:** 11 cabinet paints, 7 symbol sets (classic, space, dino, candy, sports, monsters, ocean; the gem is always the jackpot symbol), 6 lever knobs, 6 light colors, and a free name on the marquee. Unlocks key off minutes read, jackpots, triples, and spin count.
8. **Auto spin** exists so 40 banked spins don't take 40 pulls; each spin still animates and pays on screen.
9. **Kept:** the family-code gate and link, the dark navy look and Nunito, sound with a persisted mute, the grown-up corner, PWA setup.
10. **Dropped from the database:** all quiz, book, prep-queue and API-usage tables. The seed run that finished before the pivot cost $84.20 in Claude usage and is no longer used.

## Still open from last round

- **Free-tier database (item 5 of round two).** Your only Supabase org is on the Pro plan where each project is $10/month. Create a Free-plan org and tell me; `scripts/migrate-db.mjs` copies the data and I'll repoint, verify, then delete the paid project.
- **Branch rename (item 7).** `main` is pushed and identical to the build branch. Set the default branch to `main` on GitHub and the production branch to `main` on Vercel; then the old branch can go.
