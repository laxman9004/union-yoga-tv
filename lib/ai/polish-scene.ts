/**
 * Rewrite a single TV scene's headline + subline with more energy/specificity.
 *
 * The candidate builder (lib/data/lineup/candidates.ts) emits templated copy
 * like "Hit class #100 today" — clear but flat. This helper takes a scene's
 * full context (member name, milestone target, class type, instructor) and
 * asks Claude to rewrite both lines into something celebratory and on-brand.
 *
 * Returns null when ANTHROPIC_API_KEY is unset (caller renders an error).
 */
import Anthropic from "@anthropic-ai/sdk";
import { loadBrandContextBlock } from "./brand-context";
import { COPY_GUARDRAILS } from "./slop-filter";
import { validateCopy } from "./validate-copy";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const MAX_HEADLINE_WORDS = 8;
const MAX_SUBLINE_WORDS = 18;

export type PolishInput = {
  sceneKey: string;
  category: "class" | "student";
  payload: Record<string, unknown>;
  classType?: string | null;
  instructorName?: string | null;
  currentHeadline: string;
  currentSubline: string;
};

export type PolishResult =
  | { ok: true; headline: string; subline: string }
  | { ok: false; error: string };

function parseJsonish(raw: string): { headline?: string; subline?: string } {
  // Tolerate Markdown code fences and trailing prose.
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first === -1 || last === -1) return {};
  try {
    return JSON.parse(trimmed.slice(first, last + 1));
  } catch {
    return {};
  }
}

export async function polishScene(input: PolishInput): Promise<PolishResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "ANTHROPIC_API_KEY not set — add to Netlify env vars or .env.local",
    };
  }

  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  const brandBlock = await loadBrandContextBlock();
  const client = new Anthropic({ apiKey });

  // Compact, scene-specific context — keep token cost predictable.
  const sceneContext = {
    sceneKey: input.sceneKey,
    category: input.category,
    classType: input.classType ?? null,
    instructorName: input.instructorName ?? null,
    payload: input.payload,
    current: { headline: input.currentHeadline, subline: input.currentSubline },
  };

  const userPrompt = [
    brandBlock,
    "",
    "---",
    "",
    `You're rewriting one lobby-TV celebration scene for a yoga studio so it pops on a screen across the room. The room sees this for a few seconds — make it land.`,
    "",
    `Scene context (JSON):`,
    JSON.stringify(sceneContext, null, 2),
    "",
    `Rules:`,
    `- Output ONLY a JSON object: {"headline": "...", "subline": "..."}. No prose, no code fences.`,
    `- Headline ≤ ${MAX_HEADLINE_WORDS} words. Subline ≤ ${MAX_SUBLINE_WORDS} words.`,
    `- Use ONLY facts from the payload — do NOT invent class counts, names, or stats.`,
    `- If you reference the member, use the format "First L." (e.g. "Katie A.") from payload.firstName + payload.lastInitial.`,
    `- Be specific (concrete numbers, the class type, the instructor) over generic warmth.`,
    `- Active voice. Present tense. No emoji. No exclamation points unless the moment earns it (milestone, birthday).`,
    `- The headline should announce the moment in 3-7 words. The subline adds one specific detail or a brief celebration.`,
    `- Match brand voice. Don't be cheesy.`,
  ].join("\n");

  const message = await client.messages.create({
    model,
    max_tokens: 200,
    system: COPY_GUARDRAILS,
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = message.content[0];
  const raw = block?.type === "text" ? block.text : "";
  const parsed = parseJsonish(raw);

  const headline = (parsed.headline ?? "").trim();
  const subline = (parsed.subline ?? "").trim();
  if (!headline || !subline) {
    return { ok: false, error: `AI returned no usable lines: ${raw.slice(0, 160)}` };
  }

  const hv = validateCopy(headline, { maxWords: MAX_HEADLINE_WORDS });
  const sv = validateCopy(subline, { maxWords: MAX_SUBLINE_WORDS });
  if (!hv.ok || !sv.ok) {
    return {
      ok: false,
      error: [...hv.errors, ...sv.errors].slice(0, 3).join("; "),
    };
  }

  return { ok: true, headline, subline };
}
