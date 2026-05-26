const BANNED = [
  "namaste",
  "journey",
  "crush it",
  "crush",
  "wellness warrior",
  "manifest",
  "vibes only",
  "bliss",
  "flow state",
  "let go",
  "🙏",
  "tribe",
];

export type CopyValidation = {
  ok: boolean;
  errors: string[];
};

export function validateCopy(
  content: string,
  opts?: { maxWords?: number; maxChars?: number }
): CopyValidation {
  const errors: string[] = [];
  const lower = content.toLowerCase();

  for (const word of BANNED) {
    if (word === "crush" && /\bcrush it\b/i.test(content)) {
      errors.push('Banned phrase: "crush it"');
    } else if (word === "crush" && /\bcrush\b/i.test(content) && !/\bcrush it\b/i.test(content)) {
      continue;
    } else if (word === "tribe" && /\btribe\b/i.test(lower)) {
      errors.push('Banned word: "tribe" (corporate sense)');
    } else if (lower.includes(word)) {
      errors.push(`Banned: "${word}"`);
    }
  }

  if (opts?.maxWords) {
    const words = content.trim().split(/\s+/).length;
    if (words > opts.maxWords) {
      errors.push(`Too long: ${words} words (max ${opts.maxWords})`);
    }
  }
  if (opts?.maxChars && content.length > opts.maxChars) {
    errors.push(`Too long: ${content.length} chars (max ${opts.maxChars})`);
  }

  if (!content.trim()) errors.push("Empty content");

  return { ok: errors.length === 0, errors };
}
