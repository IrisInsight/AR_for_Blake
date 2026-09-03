import { getBook } from "@/lib/db";
import { body, HttpError, ok, route, str } from "@/lib/http";
import { ensurePool } from "@/lib/quiz";

export const maxDuration = 300;

/** Warm the question cache for a book so the quiz starts instantly. */
export const POST = route(async (req) => {
  const b = await body(req);
  const book = await getBook(str(b.bookId, "bookId"));
  if (!book) throw new HttpError(404, "Book not found");
  const pool = await ensurePool(book, "main");
  return ok({ ready: true, size: pool.length });
});
