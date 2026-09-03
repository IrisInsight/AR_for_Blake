// Speculative warming: when a book in a series is finished, get the next one's quiz ready.
import { db, getBook } from "./db";
import { warmSeries } from "./resolve";
import { enqueue, kick } from "./prep";
import type { Book } from "./types";

async function nextInSeries(book: Book): Promise<Book | null> {
  if (!book.series || !book.series_number) return null;
  const res = await db().from("books").select("*").eq("series", book.series).eq("series_number", book.series_number + 1).maybeSingle();
  if (res.error || !res.data) return null;
  return res.data as Book;
}

export async function warmNextInSeries(bookId: string, origin: string): Promise<void> {
  const book = await getBook(bookId);
  if (!book || !book.series || !book.series_number) return;
  let next = await nextInSeries(book);
  if (!next) {
    await warmSeries(book.series, book.author, book.series_number);
    next = await nextInSeries(book);
  }
  if (!next) return;
  await enqueue(next.title, next.author, "series", next.id);
  kick(origin);
}
