import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, ContentBlock } from "@anthropic-ai/sdk/resources/messages";
import { BONUS_POOL_SIZE, MAIN_POOL_SIZE } from "./ar";
import type { Question } from "./types";
import { costUsd, type Usage } from "./pricing";
import { logUsage } from "./db";

export const SONNET = "claude-sonnet-5";
export const HAIKU = "claude-haiku-4-5";
export const MODEL = SONNET;
// Checked against platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool on 2026-09-03:
// web_search_20260318 (dynamic filtering) needs Claude 4.6+; Haiku 4.5 uses the basic 20250305 tool.
export const WEB_SEARCH_SONNET = { type: "web_search_20260318" as const, name: "web_search" as const };
export const WEB_SEARCH_HAIKU = { type: "web_search_20250305" as const, name: "web_search" as const };

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

export interface RunOpts {
  model: string;
  purpose: string;
  system: string;
  user: string;
  maxSearches: number;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}

export interface RunResult {
  text: string;
  usage: Usage;
  cost: number;
  ms: number;
}

/** One search-enabled call. Handles pause_turn, sums usage across turns, logs cost. */
export async function runWithSearch(opts: RunOpts): Promise<RunResult> {
  const c = anthropic();
  const t0 = Date.now();
  const messages: MessageParam[] = [{ role: "user", content: opts.user }];
  const usage: Usage = { input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0, searches: 0 };
  const isHaiku = opts.model === HAIKU;
  const tool = isHaiku ? WEB_SEARCH_HAIKU : WEB_SEARCH_SONNET;
  let text = "";
  for (let i = 0; i < 6; i++) {
    const res = await c.messages.create({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 8000,
      system: opts.system,
      messages,
      tools: [{ ...tool, max_uses: opts.maxSearches }],
      ...(isHaiku ? {} : { output_config: { effort: opts.effort ?? "medium" } }),
    });
    usage.input_tokens += res.usage.input_tokens;
    usage.output_tokens += res.usage.output_tokens;
    usage.cache_read_tokens += res.usage.cache_read_input_tokens ?? 0;
    usage.cache_write_tokens += res.usage.cache_creation_input_tokens ?? 0;
    usage.searches += res.usage.server_tool_use?.web_search_requests ?? 0;
    text = collectText(res.content);
    if (res.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: res.content });
      continue;
    }
    if (res.stop_reason === "refusal") throw new Error("The model declined this request.");
    break;
  }
  const ms = Date.now() - t0;
  const cost = costUsd(opts.model, usage);
  void logUsage({ model: opts.model, purpose: opts.purpose, ...usage, cost_usd: cost, ms }).catch(() => {});
  return { text, usage, cost, ms };
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

export function firstEmoji(s: string): string | null {
  const m = s.match(/\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic})*/u);
  return m ? m[0] : null;
}

// ---------------- Quiz generation (Sonnet) ----------------

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
  const { text } = await runWithSearch({
    model: SONNET,
    purpose: `quiz_${kind}`,
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

function mockQuestions(book: BookForQuiz, n: number, kind: string): Question[] {
  return Array.from({ length: n }, (_, i) => ({
    q: `${kind === "bonus" ? "Why" : "What"} happens in part ${i + 1} of ${book.title}?`,
    choices: ["The right answer", "A wrong answer", "Another wrong one", "Also wrong"],
    answer: 0,
    skill: kind === "bonus" ? "inference" : "recall",
  }));
}
