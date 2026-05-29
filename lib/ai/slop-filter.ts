/** Banned words/phrases — yoga-studio AI slop and generic marketing filler. */
export const BANNED_PHRASES = [
  "namaste",
  "journey",
  "crush it",
  "wellness warrior",
  "manifest",
  "vibes only",
  "bliss",
  "flow state",
  "let go",
  "tribe",
  "transformative",
  "transformation",
  "holistic",
  "sacred space",
  "honor your",
  "honour your",
  "embrace your",
  "cultivate",
  "mindful moment",
  "self-care",
  "empower",
  "unlock your",
  "elevate your",
  "ignite your",
  "radiant",
  "rejuvenate",
  "nourish your soul",
  "hold space",
  "grounded energy",
  "beautiful practice",
  "dive deep",
  "lean into",
  "step into your",
  "in today's fast-paced",
  "whether you're new",
  "whether you are new",
  "it's not just",
  "it is not just",
  "reminder that",
  "gentle reminder",
  "you've got this",
  "you got this",
  "amazing work",
  "so proud of you",
  "blessed",
  "grateful for you",
  "living your best",
  "find your center",
  "find your centre",
  "inner peace",
  "soulful",
  "magic happens",
  "safe space",
  "show up for yourself",
  "🙏",
  "✨",
  "💫",
  "🔥",
] as const;

/** Regex patterns that usually mean generic LLM copy. */
const SLOP_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /\bcrush\b/i, message: 'Avoid "crush" (wellness-bro tone)' },
  { pattern: /^whether\b/i, message: 'Do not start with "Whether..."' },
  { pattern: /\bin a world where\b/i, message: 'Cliche opener: "in a world where"' },
  { pattern: /!{2,}/, message: "No multiple exclamation marks" },
  { pattern: /[!?]$/, message: "No exclamation or question mark at the end" },
  { pattern: /\b\d+\s*\/\s*5\b/, message: "No star ratings" },
  { pattern: /\byelp\b/i, message: "No review-site tone" },
  { pattern: /\bas you (?:step|walk|enter)\b/i, message: 'Avoid "as you step/walk/enter..."' },
  { pattern: /\bremember[, ]/i, message: 'Avoid preachy "Remember,..." openers' },
  { pattern: /—.*—/, message: "Too many em dashes" },
];

export function findSlopViolations(content: string): string[] {
  const errors: string[] = [];
  const lower = content.toLowerCase();

  for (const phrase of BANNED_PHRASES) {
    if (phrase === "crush it") {
      if (/\bcrush it\b/i.test(content)) errors.push('Banned phrase: "crush it"');
      continue;
    }
    if (phrase === "tribe" && /\btribe\b/i.test(lower)) {
      errors.push('Banned word: "tribe"');
      continue;
    }
    if (lower.includes(phrase)) {
      errors.push(`Banned phrase: "${phrase}"`);
    }
  }

  for (const { pattern, message } of SLOP_PATTERNS) {
    if (pattern.test(content)) errors.push(message);
  }

  return errors;
}

export const COPY_GUARDRAILS = `
Write like a sharp human, not a wellness brochure.
- Short, concrete, dry wit OK. No cheerleader energy.
- No emojis. No exclamation marks. No question marks at the end.
- No "journey", "transform", "embrace", "hold space", "honor your", "whether you're".
- No star ratings, Yelp tone, or fake reviews.
- Prefer plain words: room, mat, class, sweat, show up.
`.trim();
