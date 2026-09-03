// AR BookFinder values for titles I am confident about. Checked against the formula in the README.
import { normKey } from "./ar";
import type { BookFormat } from "./ar";

export interface KnownBook {
  title: string;
  author: string;
  atos: number;
  words: number;
  format: BookFormat;
  series?: string;
  n?: number;
  emoji?: string;
}

export const KNOWN_BOOKS: KnownBook[] = [
  { title: "Diary of a Wimpy Kid", author: "Jeff Kinney", atos: 5.2, words: 19784, format: "illustrated_novel", series: "Diary of a Wimpy Kid", n: 1, emoji: "📓" },
  { title: "Charlotte's Web", author: "E. B. White", atos: 4.4, words: 31938, format: "middle_grade", emoji: "🕷️" },
  { title: "Harry Potter and the Sorcerer's Stone", author: "J. K. Rowling", atos: 5.5, words: 77325, format: "middle_grade", series: "Harry Potter", n: 1, emoji: "⚡" },
  { title: "Harry Potter and the Chamber of Secrets", author: "J. K. Rowling", atos: 6.7, words: 84799, format: "middle_grade", series: "Harry Potter", n: 2, emoji: "🐍" },
  { title: "Harry Potter and the Prisoner of Azkaban", author: "J. K. Rowling", atos: 6.7, words: 106821, format: "middle_grade", series: "Harry Potter", n: 3, emoji: "🐺" },
  { title: "Harry Potter and the Goblet of Fire", author: "J. K. Rowling", atos: 6.8, words: 190637, format: "long_novel", series: "Harry Potter", n: 4, emoji: "🏆" },
  { title: "Harry Potter and the Order of the Phoenix", author: "J. K. Rowling", atos: 7.2, words: 257045, format: "long_novel", series: "Harry Potter", n: 5, emoji: "🐦‍🔥" },
];

const byKey = new Map(KNOWN_BOOKS.map((k) => [normKey(k.title, k.author), k]));

export function knownBook(title: string, author: string): KnownBook | undefined {
  return byKey.get(normKey(title, author));
}
