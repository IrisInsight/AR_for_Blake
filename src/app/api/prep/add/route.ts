import { body, HttpError, ok, route, str } from "@/lib/http";
import { enqueue, kick, provider } from "@/lib/prep";
import { resolveByTitle } from "@/lib/resolve";
import { getBook } from "@/lib/db";

export const maxDuration = 120;

/** Grown-up types what Blake is reading; the book gets resolved now and its quiz written right away. */
export const POST = route(async (req) => {
  const b = await body(req);
  const origin = new URL(req.url).origin;
  if (typeof b.bookId === "string") {
    const book = await getBook(b.bookId);
    if (!book) throw new HttpError(404, "Book not found");
    const item = await enqueue(book.title, book.author, String(b.source ?? "grownup"), book.id);
    kick(origin);
    return ok({ item, book });
  }
  const title = str(b.title, "Title", 160);
  const author = typeof b.author === "string" && b.author.trim() ? b.author.trim().slice(0, 120) : null;
  const book = await resolveByTitle(title, author, await provider(), { source: "grownup" });
  const item = await enqueue(book.title, book.author, "grownup", book.id);
  kick(origin);
  return ok({ item, book });
});
