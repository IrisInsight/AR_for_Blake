import { BONUS_ROUND_SIZE, quizLength } from "./ar";
import { generateQuestions } from "./ai";
import { getPool, retiredQuestions, savePool } from "./db";
import { MODEL } from "./ai";
import type { Book, ClientQuestion, Question } from "./types";

/** Get the cached pool or generate and cache it. */
export async function ensurePool(book: Book, kind: "main" | "bonus"): Promise<Question[]> {
  const cached = await getPool(book.id, kind);
  if (cached) return cached;
  const qs = await generateQuestions(book, kind);
  await savePool(book.id, kind, qs, MODEL);
  return qs;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick a random subset of live (not retired) question indexes, then put them back in plot order. */
export async function pickQuestions(book: Book, kind: "main" | "bonus", pool: Question[]): Promise<number[]> {
  const retired = await retiredQuestions(book.id, kind);
  const live = pool.map((_, i) => i).filter((i) => !retired.has(i));
  const n = kind === "main" ? quizLength(book.points) : BONUS_ROUND_SIZE;
  const picked = shuffle(live).slice(0, Math.min(n, live.length));
  return picked.sort((a, b) => a - b);
}

export function toClient(pool: Question[], idxs: number[]): ClientQuestion[] {
  return idxs.map((i) => ({ idx: i, q: pool[i].q, choices: pool[i].choices }));
}
