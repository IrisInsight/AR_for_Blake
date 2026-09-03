// Small profanity filter for the rocket name. Normalizes leetspeak and spacing before checking.
const BAD = [
  "fuck", "shit", "bitch", "asshole", "damn", "crap", "dick", "cock", "pussy", "cunt", "bastard", "slut", "whore",
  "fag", "nigg", "retard", "piss", "penis", "vagina", "boob", "sex", "porn", "nazi", "hitler", "kill", "die", "hell",
  "butthole", "dumbass", "jackass", "douche", "twat", "wanker", "bollock",
];
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };

export function isClean(name: string): boolean {
  const norm = name
    .toLowerCase()
    .split("")
    .map((c) => LEET[c] ?? c)
    .join("")
    .replace(/[^a-z]/g, "");
  return !BAD.some((w) => norm.includes(w));
}

export const NAME_MAX = 20;

export function cleanName(raw: string): string {
  return raw.replace(/[^\w\s'!\-]/g, "").replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
}
