// Accelerated Reader style math. Kept pure so it can be unit tested.

/** points = (10 + atos) × (words / 100000), rounded to the nearest 0.5, floor 0.5 */
export function bookPoints(atos: number, wordCount: number): number {
  const raw = (10 + atos) * (wordCount / 100000);
  const rounded = Math.round(raw * 2) / 2;
  return Math.max(0.5, rounded);
}

/** AR scales quiz length with book size. The kid never chooses this. */
export function quizLength(points: number): 5 | 10 | 15 {
  if (points < 2) return 5;
  if (points <= 8) return 10;
  return 15;
}

export const PASS_THRESHOLD = 0.6;
export const BONUS_POINTS = 0.5;
export const MAIN_POOL_SIZE = 18;
export const BONUS_POOL_SIZE = 6;
export const BONUS_ROUND_SIZE = 3;

/** Earned points: zero under 60%, otherwise book points × percent correct, one decimal. */
export function earnedPoints(points: number, correct: number, total: number): number {
  if (total <= 0) return 0;
  const pct = correct / total;
  if (pct < PASS_THRESHOLD) return 0;
  return Math.round(points * pct * 10) / 10;
}

/** How many questions a kid may flag on one attempt (so flagging can't empty the quiz). */
export function maxFlags(total: number): number {
  return Math.max(2, Math.floor(total / 3));
}

export const ZPD: Record<number, [number, number]> = {
  1: [1.0, 2.0],
  2: [1.6, 2.6],
  3: [2.2, 3.4],
  4: [2.8, 4.2],
  5: [3.4, 5.0],
  6: [4.0, 5.8],
  7: [4.4, 6.4],
  8: [4.8, 7.0],
};

export type LevelLabel = "easy" | "just_right" | "challenge";

export function zpdFor(grade: number): [number, number] {
  const g = Math.min(8, Math.max(1, Math.round(grade)));
  return ZPD[g];
}

export function levelLabel(atos: number, grade: number): LevelLabel {
  const [lo, hi] = zpdFor(grade);
  if (atos < lo) return "easy";
  if (atos > hi) return "challenge";
  return "just_right";
}

export const LEVEL_COPY: Record<LevelLabel, { label: string; blurb: string }> = {
  easy: { label: "Easy", blurb: "A quick trip." },
  just_right: { label: "Just right", blurb: "Right in your zone." },
  challenge: { label: "Challenge", blurb: "A bigger mission. Extra brave." },
};

/** Book formats and words per page. Word counts come from AR BookFinder when Claude finds them, and are
 * clamped to the format's ceiling so a 200-page graphic novel can never score like a 50,000-word novel. */
export const FORMATS = {
  picture: { label: "Picture book", min: 30, mid: 40, max: 60, pages: 32 },
  graphic_novel: { label: "Graphic novel / comic", min: 30, mid: 35, max: 60, pages: 200 },
  early_reader: { label: "Early reader", min: 80, mid: 100, max: 120, pages: 32 },
  early_chapter: { label: "Early chapter book", min: 150, mid: 175, max: 200, pages: 80 },
  illustrated_novel: { label: "Illustrated novel", min: 80, mid: 100, max: 140, pages: 220 },
  middle_grade: { label: "Middle grade novel", min: 225, mid: 240, max: 250, pages: 200 },
  long_novel: { label: "Long novel / YA", min: 250, mid: 260, max: 275, pages: 350 },
} as const;
export type BookFormat = keyof typeof FORMATS;
export const FORMAT_IDS = Object.keys(FORMATS) as BookFormat[];

export function isFormat(v: unknown): v is BookFormat {
  return typeof v === "string" && v in FORMATS;
}

/** Final word count from what Claude found plus the format rules. */
export function finalWordCount(format: BookFormat, pages: number | null, found: number | null, source: string): { words: number; source: "ar" | "estimate" } {
  const f = FORMATS[format];
  const p = pages && pages > 0 ? pages : f.pages;
  const ceiling = p * f.max;
  if (source === "ar" && found && found > 0) {
    return { words: Math.min(Math.round(found), ceiling), source: "ar" };
  }
  return { words: Math.round(p * f.mid), source: "estimate" };
}

/** Length buckets for books the family adds by hand. */
export const LENGTH_BUCKETS = {
  picture: { label: "Picture book", words: 800 },
  early: { label: "Early chapter book", words: 8000 },
  novel: { label: "Novel", words: 35000 },
  long: { label: "Long novel", words: 80000 },
} as const;
export type LengthBucket = keyof typeof LENGTH_BUCKETS;

export function normKey(title: string, author: string): string {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/^(the|a|an)\s+/, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const lastName = clean(author).split(" ").filter(Boolean).pop() ?? "";
  return `${clean(title)}|${lastName}`;
}

export function fmtPts(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? r.toFixed(1) : r.toFixed(1);
}
