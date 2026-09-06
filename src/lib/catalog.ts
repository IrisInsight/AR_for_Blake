import type { Machine } from "./types";
import { THEMES } from "./slots";

export interface Paint {
  id: string;
  label: string;
  color: string;
  trim: string;
}
export const CABINETS: Paint[] = [
  { id: "red", label: "Cherry red", color: "#e5484d", trim: "#ffd23f" },
  { id: "blue", label: "Electric blue", color: "#3b82f6", trim: "#f4f1ea" },
  { id: "green", label: "Slime green", color: "#3ecf6a", trim: "#1b2a4a" },
  { id: "purple", label: "Grape", color: "#9b5cf6", trim: "#ffd23f" },
  { id: "orange", label: "Lava orange", color: "#ff8a1f", trim: "#1b2a4a" },
  { id: "pink", label: "Bubblegum", color: "#ff6fae", trim: "#f4f1ea" },
  { id: "teal", label: "Deep sea", color: "#14b8a6", trim: "#ffd23f" },
  { id: "black", label: "Stealth black", color: "#2b2f3a", trim: "#3ecf6a" },
  { id: "gold", label: "Solid gold", color: "#f5b700", trim: "#7a4a00" },
  { id: "chrome", label: "Chrome", color: "#c9d1de", trim: "#1b2a4a" },
  { id: "galaxy", label: "Galaxy", color: "#5b3fd4", trim: "#ff6fae" },
];
export const LIGHTS: Record<string, { label: string; colors: string[] }> = {
  gold: { label: "Gold", colors: ["#ffd23f", "#fff3b0"] },
  rainbow: { label: "Rainbow", colors: ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93"] },
  ice: { label: "Ice", colors: ["#7dd3fc", "#ffffff"] },
  fire: { label: "Fire", colors: ["#ff8a1f", "#e5484d"] },
  toxic: { label: "Toxic", colors: ["#a3e635", "#3ecf6a"] },
  pink: { label: "Pink", colors: ["#ff6fae", "#fbcfe8"] },
};
export const LEVERS: Record<string, { label: string; color: string }> = {
  red: { label: "Red ball", color: "#e5484d" },
  black: { label: "Black ball", color: "#2b2f3a" },
  gold: { label: "Gold ball", color: "#f5b700" },
  blue: { label: "Blue ball", color: "#3b82f6" },
  green: { label: "Green ball", color: "#3ecf6a" },
  skull: { label: "Skull", color: "#f4f1ea" },
};

export type UnlockRule = { type: "minutes" | "jackpots" | "triples" | "spins"; n: number };
export type Category = "cabinet" | "theme" | "lever" | "lights";

export interface ShopItem {
  id: string;
  category: Category;
  value: string;
  label: string;
  price: number;
  unlock?: UnlockRule;
}
const item = (category: Category, value: string, label: string, price: number, unlock?: UnlockRule): ShopItem => ({ id: `${category}:${value}`, category, value, label, price, unlock });

export const CATALOG: ShopItem[] = [
  item("cabinet", "red", "Cherry red", 0),
  item("cabinet", "blue", "Electric blue", 0),
  item("cabinet", "green", "Slime green", 8),
  item("cabinet", "purple", "Grape", 8),
  item("cabinet", "orange", "Lava orange", 8),
  item("cabinet", "pink", "Bubblegum", 8),
  item("cabinet", "teal", "Deep sea", 10),
  item("cabinet", "black", "Stealth black", 15, { type: "minutes", n: 60 }),
  item("cabinet", "gold", "Solid gold", 40, { type: "jackpots", n: 1 }),
  item("cabinet", "chrome", "Chrome", 30, { type: "minutes", n: 300 }),
  item("cabinet", "galaxy", "Galaxy", 50, { type: "jackpots", n: 3 }),
  item("theme", "classic", "Classic", 0),
  item("theme", "space", "Space", 12),
  item("theme", "dino", "Dino", 12),
  item("theme", "candy", "Candy", 12),
  item("theme", "sports", "Sports", 15, { type: "spins", n: 50 }),
  item("theme", "monsters", "Monsters", 20, { type: "triples", n: 3 }),
  item("theme", "ocean", "Ocean", 20, { type: "minutes", n: 120 }),
  item("lever", "red", "Red ball", 0),
  item("lever", "black", "Black ball", 5),
  item("lever", "blue", "Blue ball", 5),
  item("lever", "green", "Green ball", 5),
  item("lever", "gold", "Gold ball", 20, { type: "jackpots", n: 1 }),
  item("lever", "skull", "Skull", 15, { type: "triples", n: 5 }),
  item("lights", "gold", "Gold", 0),
  item("lights", "ice", "Ice", 6),
  item("lights", "fire", "Fire", 6),
  item("lights", "pink", "Pink", 6),
  item("lights", "toxic", "Toxic", 10, { type: "spins", n: 100 }),
  item("lights", "rainbow", "Rainbow", 25, { type: "jackpots", n: 2 }),
];
export const CATEGORY_LABELS: Record<Category, string> = { cabinet: "Cabinet", theme: "Symbols", lever: "Lever", lights: "Lights" };

export const DEFAULT_MACHINE: Machine = { cabinet: "red", theme: "classic", lever: "red", lights: "gold", name: "Blake's Jackpot" };

export interface Milestones {
  minutes: number;
  jackpots: number;
  triples: number;
  spins: number;
}
export function unlockMet(rule: UnlockRule | undefined, m: Milestones): boolean {
  return !rule || m[rule.type] >= rule.n;
}
export function unlockText(rule: UnlockRule): string {
  switch (rule.type) {
    case "minutes":
      return `Read ${rule.n} minutes in total`;
    case "jackpots":
      return rule.n === 1 ? "Hit your first jackpot" : `Hit ${rule.n} jackpots`;
    case "triples":
      return `Spin ${rule.n} triples`;
    case "spins":
      return `Spin ${rule.n} times`;
  }
}
export function ownsItem(owned: string[], it: ShopItem): boolean {
  return it.price === 0 || owned.includes(it.id);
}
export function themeLabel(id: string): string {
  return THEMES[id]?.label ?? "Classic";
}

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
