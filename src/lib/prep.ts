// Quiz prep queue: resolve a book, generate its question pool, and chain the next batch.
import { after } from "next/server";
import { claimPrep, countPrep, findPrepByBook, getBook, getPool, getSetting, insertPrep, pendingPrep, updatePrep } from "./db";
import { ensurePool } from "./quiz";
import { resolveByTitle } from "./resolve";
import { getFamilyCode } from "./gate";
import type { Provider } from "./bookapis";
import type { PrepItem } from "./types";

export const BATCH = 3;

export async function provider(): Promise<Provider> {
  const v = await getSetting("books_provider");
  return v === "google" ? "google" : "openlibrary";
}

/** Add a book to the queue. Reuses an existing row for the same book unless it failed. */
export async function enqueue(title: string, author: string | null, source: string, bookId: string | null): Promise<PrepItem> {
  if (bookId) {
    const existing = await findPrepByBook(bookId);
    if (existing) {
      if (existing.status === "failed") await updatePrep(existing.id, { status: "pending", error: null });
      return existing;
    }
    const pool = await getPool(bookId, "main");
    const row = await insertPrep({ title, author, book_id: bookId, source });
    if (pool) await updatePrep(row.id, { status: "ready" });
    return row;
  }
  return insertPrep({ title, author, book_id: null, source });
}

async function processOne(item: PrepItem, prov: Provider): Promise<void> {
  try {
    let bookId = item.book_id;
    if (!bookId) {
      const book = await resolveByTitle(item.title, item.author, prov, { source: item.source });
      bookId = book.id;
      await updatePrep(item.id, { book_id: bookId, title: book.title, author: book.author });
    }
    const book = await getBook(bookId);
    if (!book) throw new Error("Book vanished");
    await ensurePool(book, "main");
    await updatePrep(item.id, { status: "ready", error: null, tries: item.tries + 1 });
  } catch (e) {
    await updatePrep(item.id, { status: "failed", error: (e instanceof Error ? e.message : String(e)).slice(0, 300), tries: item.tries + 1 });
  }
}

/** Claim up to BATCH pending rows, process them in parallel, then kick the next batch. */
export async function runQueue(origin: string): Promise<{ processed: number; pendingAfter: number }> {
  const prov = await provider();
  const candidates = await pendingPrep(BATCH);
  const claimed: PrepItem[] = [];
  for (const c of candidates) if (await claimPrep(c.id)) claimed.push(c);
  await Promise.all(claimed.map((c) => processOne(c, prov)));
  const pendingAfter = await countPrep("pending");
  if (pendingAfter > 0 && claimed.length > 0) {
    const code = await getFamilyCode();
    after(async () => {
      try {
        await fetch(`${origin}/api/prep/run?code=${code}`, { method: "POST" });
      } catch (e) {
        console.error("chain failed", e);
      }
    });
  }
  return { processed: claimed.length, pendingAfter };
}

/** Fire the worker without waiting for it. */
export function kick(origin: string): void {
  after(async () => {
    try {
      const code = await getFamilyCode();
      await fetch(`${origin}/api/prep/run?code=${code}`, { method: "POST" });
    } catch (e) {
      console.error("kick failed", e);
    }
  });
}
