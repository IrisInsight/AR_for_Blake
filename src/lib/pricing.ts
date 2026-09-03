// USD per million tokens, from platform.claude.com/docs/en/about-claude/pricing (checked 2026-09-03).
export const PRICES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-haiku-4-5": { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
};
export const WEB_SEARCH_PER_1000 = 10;

export interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  searches: number;
}

export function costUsd(model: string, u: Usage): number {
  const p = PRICES[model] ?? PRICES["claude-sonnet-5"];
  const tokens = (u.input_tokens * p.input + u.output_tokens * p.output + u.cache_read_tokens * p.cacheRead + u.cache_write_tokens * p.cacheWrite) / 1e6;
  return Math.round((tokens + (u.searches * WEB_SEARCH_PER_1000) / 1000) * 1e5) / 1e5;
}
