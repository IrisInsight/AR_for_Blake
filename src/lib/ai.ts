import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, ContentBlock } from "@anthropic-ai/sdk/resources/messages";
import { BONUS_POOL_SIZE, MAIN_POOL_SIZE } from "./ar";
import type { Question } from "./types";

export const MODEL = "claude-sonnet-5";
// Checked against platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool on 2026-09-03:
// web_search_20260318 is the newest version (dynamic filtering + response inclusion), supported on Claude 4.6+.
export const WEB_SEARCH_TOOL = { type: "web_search_20260318" as const, name: "web_search" as const };

export class MissingKeyError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set");
  }
}

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function mockMode(): boolean {
  return process.env.RR_MOCK_AI === "1";
}

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!hasApiKey()) throw new MissingKeyError();
  if (!client) client = new Anthropic({ maxRetries: 2 });
  return client;
}

interface RunOpts {
  system: string;
  user: string;
  maxSearches: number;
  effort: "low" | "medium" | "high";
  maxTokens?: number;
}

/** One search-enabled call. Handles pause_turn by sending the paused turn back. Returns the text. */
export async function runWithSearch(opts: RunOpts): Promise<string> {
  const c = anthropic();
  const messages: MessageParam[] = [{ role: "user", content: opts.user }];
  let text = "";
  for (let i = 0; i < 6; i++) {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 8000,
      system: opts.system,
      messages,
      tools: [{ ...WEB_SEARCH_TOOL, max_uses: opts.maxSearches }],
      output_config: { effort: opts.effort },
    });
    text = collectText(res.content);
    if (res.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: res.content });
      continue;
    }
    if (res.stop_reason === "refusal") throw new Error("The model declined this request.");
    break;
  }
  return text;
}

function collectText(content: ContentBlock[]): string {
  return content
    .filter((b): b is Extract<ContentBlock, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/** Pull the first JSON array or object out of a model reply that may contain prose or fences. */
export function extractJson<T>(text: string): T {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = [fence?.[1], text];
  for (const cand of candidates) {
    if (!cand) continue;
    const trimmed = cand.trim();
    try {
      return JSON.parse(trimmed) as T;
    } catch {
      /* fall through */
    }
    const starts = [trimmed.indexOf("["), trimmed.indexOf("{")].filter((i) => i >= 0);
    if (!starts.length) continue;
    const start = Math.min(...starts);
    const closer = trimmed[start] === "[" ? "]" : "}";
    const end = trimmed.lastIndexOf(closer);
    if (end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as T;
      } catch {
        /* keep trying */
      }
    }
  }
  throw new Error("Could not read JSON from model reply");
}

// ---------------- Book lookup ----------------

export interface RawBook {
  title: string;
  author: string;
  series: string | null;
  series_number: number | null;
  atos: number;
  word_count: number;
  description: string;
  emoji: string;
}

const SEARCH_SYSTEM = `You are the book lookup service for a children's reading app used by an 8-year-old and a 10-year-old. A kid types the title (sometimes misspelled, sometimes just a series name or a character) of a book they just finished. Return up to 5 real, published books that best match.

Use web search to verify each book's ATOS book level (as listed on AR BookFinder or the publisher) and its word count. Search for "<title> AR BookFinder" or "<title> ATOS level word count". If a word count cannot be found, estimate it from page count and format (picture book ~600 words, early chapter book ~6,000-12,000, middle grade novel ~30,000-60,000) and say so by rounding to a plausible number. Match the exact edition and author; many children's titles are reused.

Only return books appropriate for children (picture books, early readers, chapter books, middle grade, gentle young adult). If the query points at adult, violent, or sexual material, or is not a book at all, return an empty array.

For each book give: title, author (as printed), series name and number in the series (null if standalone), atos (a decimal like 4.2), word_count (an integer), description (one sentence, spoiler-free, written for a kid), emoji (one emoji that represents the book).

Return only JSON, no prose:
[{"title":"...","author":"...","series":null,"series_number":null,"atos":4.2,"word_count":31938,"description":"...","emoji":"🕷️"}]`;

export async function lookupBooks(query: string): Promise<RawBook[]> {
  if (mockMode()) return mockBooks(query);
  const text = await runWithSearch({
    system: SEARCH_SYSTEM,
    user: `Query: ${query.slice(0, 120)}`,
    maxSearches: 6,
    effort: "medium",
    maxTokens: 4000,
  });
  let arr: unknown;
  try {
    arr = extractJson<unknown>(text);
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  const out: RawBook[] = [];
  for (const r of arr as Record<string, unknown>[]) {
    const title = String(r.title ?? "").trim();
    const author = String(r.author ?? "").trim();
    const atos = Number(r.atos);
    const wc = Math.round(Number(r.word_count));
    if (!title || !author || !Number.isFinite(atos) || !Number.isFinite(wc) || wc <= 0) continue;
    out.push({
      title,
      author,
      series: r.series ? String(r.series) : null,
      series_number: r.series_number == null ? null : Number(r.series_number),
      atos: Math.max(0.5, Math.min(12, Math.round(atos * 10) / 10)),
      word_count: Math.max(100, wc),
      description: String(r.description ?? "").slice(0, 200),
      emoji: firstEmoji(String(r.emoji ?? "")) ?? "📖",
    });
    if (out.length >= 5) break;
  }
  return out;
}

function firstEmoji(s: string): string | null {
  const m = s.match(/\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic})*/u);
  return m ? m[0] : null;
}

// ---------------- Quiz generation ----------------

function quizSystem(n: number, atos: number, bonus: boolean): string {
  const skills = bonus
    ? `These are BONUS questions: harder than a normal quiz. Every question must require inference, theme, character motivation, or cause and effect ("why did she do that?", "what does this show about him?", "what lesson does the story teach?") rather than "what happened." Still answerable only by someone who read the book.`
    : `Spread across comprehension skills: literal recall, sequence, character motivation and traits, cause and effect, vocabulary in context, main idea, simple inference. Weight toward recall and sequence below level 3.0, toward inference and theme above 5.0.`;
  return `You are an experienced elementary reading specialist who writes comprehension quizzes in the style of Accelerated Reader. Write ${n} multiple-choice questions about the specific book named below.

First, search the web for a detailed chapter-by-chapter summary of this exact book so every question matches the real text. Match the right edition and author; many children's titles are reused.

Rules:
- Every question must be answerable only by someone who actually read the book. Nothing guessable from the title, cover, or genre.
- ${skills}
- Order the questions to follow the plot from beginning to end.
- Exactly four choices. One unambiguously correct. Distractors plausible, grammatically parallel, similar in length, and drawn from the book's own world (real characters, places, and events), never nonsense.
- No "all of the above," no "none of the above," no negatively worded stems.
- Wording readable at level ${atos.toFixed(1)}. Stems under 25 words. Choices under 12 words.
- Vary which position holds the correct answer.
- Only use details you are confident appear in this book. If unsure of a detail, pick a better-established one. Never invent a plot point.

Return only JSON, no prose: [{"q":"...","choices":["...","...","...","..."],"answer":0,"skill":"inference"}]`;
}

export interface BookForQuiz {
  title: string;
  author: string;
  series: string | null;
  series_number: number | null;
  atos: number;
}

export async function generateQuestions(book: BookForQuiz, kind: "main" | "bonus"): Promise<Question[]> {
  const n = kind === "main" ? MAIN_POOL_SIZE : BONUS_POOL_SIZE;
  if (mockMode()) return mockQuestions(book, n, kind);
  const desc = `Book: "${book.title}" by ${book.author}${book.series ? ` (${book.series}${book.series_number ? ` #${book.series_number}` : ""})` : ""}. ATOS level ${book.atos.toFixed(1)}.`;
  const text = await runWithSearch({
    system: quizSystem(n, book.atos, kind === "bonus"),
    user: desc,
    maxSearches: 8,
    effort: "high",
    maxTokens: 12000,
  });
  const arr = extractJson<unknown>(text);
  if (!Array.isArray(arr)) throw new Error("Quiz reply was not a list");
  const qs: Question[] = [];
  for (const r of arr as Record<string, unknown>[]) {
    const q = String(r.q ?? "").trim();
    const choices = Array.isArray(r.choices) ? (r.choices as unknown[]).map((c) => String(c).trim()) : [];
    const answer = Number(r.answer);
    if (!q || choices.length !== 4 || !Number.isInteger(answer) || answer < 0 || answer > 3) continue;
    qs.push({ q, choices, answer, skill: String(r.skill ?? "recall") });
  }
  if (qs.length < Math.min(n, kind === "main" ? 8 : 3)) throw new Error("Not enough usable questions came back");
  return qs;
}

// ---------------- Mock mode (local testing without a key) ----------------

function mockBooks(query: string): RawBook[] {
  const q = query.toLowerCase();
  if (q.includes("nothing")) return [];
  return [
    { title: "Charlotte's Web", author: "E. B. White", series: null, series_number: null, atos: 4.4, word_count: 31938, description: "A pig named Wilbur and a clever spider become best friends.", emoji: "🕷️" },
    { title: "Diary of a Wimpy Kid", author: "Jeff Kinney", series: "Diary of a Wimpy Kid", series_number: 1, atos: 5.2, word_count: 19784, description: "Greg Heffley survives middle school, barely.", emoji: "📓" },
    { title: "Harry Potter and the Sorcerer's Stone", author: "J. K. Rowling", series: "Harry Potter", series_number: 1, atos: 5.5, word_count: 77325, description: "A boy finds out he is a wizard.", emoji: "⚡" },
    { title: "Frog and Toad Are Friends", author: "Arnold Lobel", series: "Frog and Toad", series_number: 1, atos: 2.9, word_count: 2275, description: "Two friends share five little adventures.", emoji: "🐸" },
  ].filter((b) => !q || b.title.toLowerCase().includes(q.split(" ")[0]) || true);
}

function mockQuestions(book: BookForQuiz, n: number, kind: string): Question[] {
  return Array.from({ length: n }, (_, i) => ({
    q: `${kind === "bonus" ? "Why" : "What"} happens in part ${i + 1} of ${book.title}?`,
    choices: ["The right answer", "A wrong answer", "Another wrong one", "Also wrong"],
    answer: i % 4 === 0 ? 0 : 0,
    skill: kind === "bonus" ? "inference" : "recall",
  }));
}
