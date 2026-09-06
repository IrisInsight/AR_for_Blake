// The machine. Three reels, weighted symbols, server-side rolls. Every spin pays something:
// reading always counts. Expected value is about 4.5 points per spin (one spin per minute read).

export interface SymbolDef {
  id: string;
  weight: number; // out of 100 per reel
  triple: number; // points for three in a row
  label: string;
}

export const SYMBOLS: SymbolDef[] = [
  { id: "cherry", weight: 20, triple: 25, label: "cherries" },
  { id: "book", weight: 20, triple: 25, label: "books" },
  { id: "star", weight: 15, triple: 50, label: "stars" },
  { id: "clover", weight: 15, triple: 50, label: "clovers" },
  { id: "rocket", weight: 12, triple: 75, label: "rockets" },
  { id: "bell", weight: 10, triple: 75, label: "bells" },
  { id: "seven", weight: 5, triple: 150, label: "sevens" },
  { id: "gem", weight: 3, triple: 500, label: "gems" },
];
export const REEL_LEN = SYMBOLS.length;

export const PAY = { none: 2, pair: 6 };
export const COINS = { spin: 1, pair: 1, triple: 5, jackpot: 25 };

/** Symbol glyphs per theme, in SYMBOLS order. The last slot is always the jackpot symbol. */
export const THEMES: Record<string, { label: string; glyphs: string[] }> = {
  classic: { label: "Classic", glyphs: ["🍒", "📚", "⭐", "🍀", "🚀", "🔔", "7️⃣", "💎"] },
  space: { label: "Space", glyphs: ["🪐", "🌙", "⭐", "☄️", "🚀", "👽", "🛸", "💎"] },
  dino: { label: "Dino", glyphs: ["🦖", "🦕", "🥚", "🌋", "🦴", "🌴", "🔥", "💎"] },
  candy: { label: "Candy", glyphs: ["🍭", "🍬", "🍩", "🍪", "🍫", "🧁", "🍦", "💎"] },
  sports: { label: "Sports", glyphs: ["⚽", "🏀", "🏈", "⚾", "🎾", "🏒", "🏆", "💎"] },
  monsters: { label: "Monsters", glyphs: ["👾", "👻", "🤖", "🐉", "🧟", "👽", "🎃", "💎"] },
  ocean: { label: "Ocean", glyphs: ["🐠", "🐙", "🦈", "🐢", "🐬", "🦀", "🐳", "💎"] },
};

export function glyphsFor(theme: string): string[] {
  return (THEMES[theme] ?? THEMES.classic).glyphs;
}

export type SpinKind = "none" | "pair" | "triple" | "jackpot";

export interface Roll {
  reels: number[]; // symbol index per reel
  kind: SpinKind;
  points: number;
  coins: number;
  matched: number[]; // reel positions that matched
}

const TOTAL = SYMBOLS.reduce((s, x) => s + x.weight, 0);

export function rollReel(rand: () => number = Math.random): number {
  let r = rand() * TOTAL;
  for (let i = 0; i < SYMBOLS.length; i++) {
    r -= SYMBOLS[i].weight;
    if (r < 0) return i;
  }
  return SYMBOLS.length - 1;
}

export function score(reels: number[]): Roll {
  const [a, b, c] = reels;
  if (a === b && b === c) {
    const sym = SYMBOLS[a];
    const jackpot = sym.id === "gem";
    return { reels, kind: jackpot ? "jackpot" : "triple", points: sym.triple, coins: COINS.spin + (jackpot ? COINS.jackpot : COINS.triple), matched: [0, 1, 2] };
  }
  if (a === b) return { reels, kind: "pair", points: PAY.pair, coins: COINS.spin + COINS.pair, matched: [0, 1] };
  if (b === c) return { reels, kind: "pair", points: PAY.pair, coins: COINS.spin + COINS.pair, matched: [1, 2] };
  if (a === c) return { reels, kind: "pair", points: PAY.pair, coins: COINS.spin + COINS.pair, matched: [0, 2] };
  return { reels, kind: "none", points: PAY.none, coins: COINS.spin, matched: [] };
}

export function roll(rand: () => number = Math.random): Roll {
  return score([rollReel(rand), rollReel(rand), rollReel(rand)]);
}

/** Expected points per spin, for tuning the goal. */
export function expectedValue(): number {
  const p = SYMBOLS.map((s) => s.weight / TOTAL);
  let ev = 0;
  let pTriple = 0;
  let pPair = 0;
  p.forEach((pi, i) => {
    pTriple += pi ** 3;
    ev += pi ** 3 * SYMBOLS[i].triple;
    pPair += 3 * pi * pi * (1 - pi);
  });
  ev += pPair * PAY.pair + (1 - pTriple - pPair) * PAY.none;
  return ev;
}

export const MAX_SESSION_MINUTES = 120; // a forgotten timer can't mint a whole night of spins
