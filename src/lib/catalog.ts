import type { RocketConfig } from "./types";

export interface HullPaint {
  id: string;
  label: string;
  primary: string;
  secondary?: string; // two-tone
}

export const HULL_PAINTS: HullPaint[] = [
  { id: "red", label: "Rocket red", primary: "#e5484d" },
  { id: "white", label: "Moon white", primary: "#f4f1ea" },
  { id: "blue", label: "Sky blue", primary: "#3b82f6" },
  { id: "green", label: "Slime green", primary: "#3ecf6a" },
  { id: "orange", label: "Lava orange", primary: "#ff8a1f" },
  { id: "purple", label: "Grape", primary: "#9b5cf6" },
  { id: "yellow", label: "Banana", primary: "#ffd23f" },
  { id: "black", label: "Stealth black", primary: "#2b2f3a" },
  { id: "teal", label: "Deep sea", primary: "#14b8a6" },
  { id: "pink", label: "Bubblegum", primary: "#ff6fae" },
  { id: "red_white", label: "Candy cane", primary: "#e5484d", secondary: "#f4f1ea" },
  { id: "blue_yellow", label: "Lightning", primary: "#3b82f6", secondary: "#ffd23f" },
  { id: "black_orange", label: "Tiger", primary: "#2b2f3a", secondary: "#ff8a1f" },
  { id: "green_purple", label: "Alien", primary: "#3ecf6a", secondary: "#9b5cf6" },
  { id: "white_blue", label: "Ice cap", primary: "#f4f1ea", secondary: "#3b82f6" },
  { id: "gold", label: "Solid gold", primary: "#f5b700", secondary: "#fff3b0" },
  { id: "chrome", label: "Chrome", primary: "#c9d1de", secondary: "#f8fafc" },
  { id: "galaxy", label: "Galaxy", primary: "#5b3fd4", secondary: "#ff6fae" },
];

export const EXHAUST_COLORS: Record<string, string[]> = {
  orange: ["#ffb703", "#fb5607"],
  blue: ["#7dd3fc", "#2563eb"],
  green: ["#a3e635", "#16a34a"],
  purple: ["#d8b4fe", "#7c3aed"],
  pink: ["#fbcfe8", "#ec4899"],
  rainbow: ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93"],
  comet: ["#ffffff", "#7dd3fc", "#2563eb"],
};

export type UnlockRule =
  | { type: "points"; n: number }
  | { type: "books"; n: number }
  | { type: "launches"; n: number }
  | { type: "perfects"; n: number }
  | { type: "bonus"; n: number }
  | { type: "station"; n: number };

export type Category = "hull" | "nose" | "fins" | "decal" | "booster" | "engine" | "exhaust" | "patch_shape" | "patch_icon";

export interface ShopItem {
  id: string; // `${category}:${value}`
  category: Category;
  value: string;
  label: string;
  price: number; // 0 = free
  unlock?: UnlockRule;
}

const item = (category: Category, value: string, label: string, price: number, unlock?: UnlockRule): ShopItem => ({
  id: `${category}:${value}`,
  category,
  value,
  label,
  price,
  unlock,
});

export const CATALOG: ShopItem[] = [
  // Hull paint
  item("hull", "red", "Rocket red", 0),
  item("hull", "white", "Moon white", 0),
  item("hull", "blue", "Sky blue", 0),
  item("hull", "green", "Slime green", 4),
  item("hull", "orange", "Lava orange", 4),
  item("hull", "purple", "Grape", 4),
  item("hull", "yellow", "Banana", 4),
  item("hull", "teal", "Deep sea", 5),
  item("hull", "pink", "Bubblegum", 5),
  item("hull", "black", "Stealth black", 8),
  item("hull", "red_white", "Candy cane", 10),
  item("hull", "blue_yellow", "Lightning", 10),
  item("hull", "white_blue", "Ice cap", 10),
  item("hull", "black_orange", "Tiger", 14, { type: "books", n: 3 }),
  item("hull", "green_purple", "Alien", 14, { type: "station", n: 4 }),
  item("hull", "gold", "Solid gold", 25, { type: "launches", n: 1 }),
  item("hull", "chrome", "Chrome", 20, { type: "station", n: 2 }),
  item("hull", "galaxy", "Galaxy", 30, { type: "station", n: 7 }),
  // Nose cones
  item("nose", "cone", "Classic cone", 0),
  item("nose", "rounded", "Rounded", 6),
  item("nose", "blunt", "Blunt", 6),
  item("nose", "needle", "Needle", 15, { type: "launches", n: 1 }),
  // Fins
  item("fins", "swept", "Swept", 0),
  item("fins", "straight", "Straight", 5),
  item("fins", "delta", "Delta", 10),
  item("fins", "none", "No fins", 3),
  // Decals
  item("decal", "none", "Clean", 0),
  item("decal", "stripes", "Racing stripes", 5),
  item("decal", "stars", "Stars", 8),
  item("decal", "lightning", "Lightning bolt", 10),
  item("decal", "flames", "Flames", 12, { type: "books", n: 5 }),
  item("decal", "teeth", "Shark teeth", 15, { type: "perfects", n: 1 }),
  item("decal", "shooting_star", "Shooting star", 20, { type: "launches", n: 1 }),
  // Boosters
  item("booster", "none", "Single stack", 0),
  item("booster", "twin", "Twin boosters", 15),
  item("booster", "quad", "Quad boosters", 30, { type: "station", n: 5 }),
  // Engine bells
  item("engine", "standard", "Standard bell", 0),
  item("engine", "wide", "Wide bell", 10),
  item("engine", "triple", "Triple bell", 20, { type: "books", n: 10 }),
  // Exhaust
  item("exhaust", "orange", "Fire", 0),
  item("exhaust", "blue", "Blue flame", 6),
  item("exhaust", "green", "Toxic green", 6),
  item("exhaust", "purple", "Purple haze", 8),
  item("exhaust", "pink", "Pink burn", 8),
  item("exhaust", "rainbow", "Rainbow", 25, { type: "bonus", n: 1 }),
  item("exhaust", "comet", "Comet trail", 12, { type: "station", n: 3 }),
  // Mission patch shapes
  item("patch_shape", "circle", "Circle", 0),
  item("patch_shape", "shield", "Shield", 0),
  item("patch_shape", "hex", "Hexagon", 4),
  item("patch_shape", "star", "Star", 6),
  // Mission patch icons
  item("patch_icon", "rocket", "Rocket", 0),
  item("patch_icon", "star", "Star", 0),
  item("patch_icon", "moon", "Moon", 0),
  item("patch_icon", "planet", "Planet", 0),
  item("patch_icon", "bolt", "Bolt", 3),
  item("patch_icon", "comet", "Comet", 3),
  item("patch_icon", "dino", "Dino", 5),
  item("patch_icon", "cat", "Space cat", 5),
  item("patch_icon", "skull", "Skull", 8, { type: "perfects", n: 1 }),
  item("patch_icon", "crown", "Crown", 10, { type: "station", n: 6 }),
  item("patch_icon", "station", "Station", 4, { type: "station", n: 1 }),
];

export const CATEGORY_LABELS: Record<Category, string> = {
  hull: "Paint",
  nose: "Nose cone",
  fins: "Fins",
  decal: "Decal",
  booster: "Boosters",
  engine: "Engine",
  exhaust: "Exhaust",
  patch_shape: "Patch shape",
  patch_icon: "Patch icon",
};

export const DEFAULT_ROCKET: RocketConfig = {
  hull: "red",
  nose: "cone",
  fins: "swept",
  decal: "none",
  booster: "none",
  engine: "standard",
  exhaust: "orange",
  name: "Rocket 1",
  patch: { shape: "circle", icon: "rocket", c1: "#ff7a1a", c2: "#1b2a4a" },
};

export const PATCH_COLORS = ["#ff7a1a", "#e5484d", "#ffd23f", "#3ecf6a", "#3b82f6", "#9b5cf6", "#ff6fae", "#f4f1ea", "#1b2a4a", "#14b8a6"];

export const ACCENT_COLORS: { id: string; label: string }[] = [
  { id: "#ff7a1a", label: "Orange" },
  { id: "#ff4d6d", label: "Red" },
  { id: "#ffd23f", label: "Yellow" },
  { id: "#3ecf6a", label: "Green" },
  { id: "#22d3ee", label: "Cyan" },
  { id: "#4f8cff", label: "Blue" },
  { id: "#c26cff", label: "Purple" },
  { id: "#ff6fae", label: "Pink" },
];

export const AVATARS: { id: string; emoji: string; label: string }[] = [
  { id: "astronaut", emoji: "🧑‍🚀", label: "Astronaut" },
  { id: "cat", emoji: "🐱", label: "Cat" },
  { id: "dog", emoji: "🐶", label: "Dog" },
  { id: "dino", emoji: "🦖", label: "Dino" },
  { id: "alien", emoji: "👽", label: "Alien" },
  { id: "robot", emoji: "🤖", label: "Robot" },
  { id: "fox", emoji: "🦊", label: "Fox" },
  { id: "unicorn", emoji: "🦄", label: "Unicorn" },
  { id: "dragon", emoji: "🐉", label: "Dragon" },
  { id: "owl", emoji: "🦉", label: "Owl" },
  { id: "shark", emoji: "🦈", label: "Shark" },
  { id: "panda", emoji: "🐼", label: "Panda" },
];

export function avatarEmoji(id: string): string {
  return AVATARS.find((a) => a.id === id)?.emoji ?? "🧑‍🚀";
}

export interface Milestones {
  points: number;
  books: number;
  launches: number;
  perfects: number;
  bonus: number;
  station: number;
}

export function unlockMet(rule: UnlockRule | undefined, m: Milestones): boolean {
  if (!rule) return true;
  return m[rule.type] >= rule.n;
}

export function unlockText(rule: UnlockRule): string {
  switch (rule.type) {
    case "points":
      return `Earn ${rule.n} lifetime points`;
    case "books":
      return rule.n === 1 ? "Finish 1 book" : `Finish ${rule.n} books`;
    case "launches":
      return rule.n === 1 ? "Launch 1 rocket" : `Launch ${rule.n} rockets`;
    case "perfects":
      return "Score 100% on a quiz";
    case "bonus":
      return "Clear a bonus round";
    case "station":
      return `Space station level ${rule.n}`;
  }
}

export function ownsItem(owned: string[], it: ShopItem): boolean {
  return it.price === 0 || owned.includes(it.id);
}

export function itemFor(category: Category, value: string): ShopItem | undefined {
  return CATALOG.find((i) => i.category === category && i.value === value);
}
