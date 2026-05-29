import { readFile } from "fs/promises";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db/client";
import { buildFrameSnapshot } from "@/lib/data/snapshot";
import { studioDayEnd, studioDayStart } from "@/lib/data/dates";
import { loadBrandContextBlock } from "./brand-context";
import { COPY_GUARDRAILS } from "./slop-filter";
import { getTemplate, type CopyTemplateId } from "./templates";
import { validateCopy } from "./validate-copy";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const MAX_ATTEMPTS = 3;

function startOfToday(): Date {
  return studioDayStart();
}

export async function loadPromptTemplate(templateId: CopyTemplateId): Promise<string> {
  const file = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "prompts",
    `${templateId}.md`
  );
  return readFile(file, "utf-8");
}

export async function buildPromptInputs(templateId: CopyTemplateId): Promise<string> {
  const snapshot = await buildFrameSnapshot();
  const day = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const popular = snapshot.popularClassThisWeek?.classType ?? "Hot Union Flow";
  const comp = snapshot.upcomingClass;

  const base: Record<string, string> = {
    day,
    popular_class: popular,
    member_count: String(snapshot.memberCount),
    first_timers_tonight: comp ? String(comp.firstTimerCount) : "0",
    regulars_tonight: comp ? String(comp.regularCount) : "0",
    class_type: comp?.classType ?? popular,
    instructor: comp?.instructorName ?? "tonight's teacher",
  };

  return JSON.stringify(base, null, 2);
}

async function requestCopyLine(
  client: Anthropic,
  model: string,
  brandBlock: string,
  promptBody: string,
  inputs: string,
  templateId: CopyTemplateId,
  maxWords: number,
  variation: number,
  count: number,
  priorErrors?: string[]
): Promise<string> {
  const retryNote =
    priorErrors?.length ?
      `\n\nYour last attempt was rejected:\n${priorErrors.map((e) => `- ${e}`).join("\n")}\nRewrite completely. Follow every rule.`
    : "";

  const message = await client.messages.create({
    model,
    max_tokens: 200,
    system: COPY_GUARDRAILS,
    messages: [
      {
        role: "user",
        content: `${brandBlock}\n\n---\n\n${promptBody}\n\n---\n\nInputs (JSON):\n${inputs}\n\nMax ${maxWords} words. Variation ${variation} of ${count} for template "${templateId}".\n\nOutput ONLY the final line(s). No quotes. No preamble.${retryNote}`,
      },
    ],
  });

  const block = message.content[0];
  return block.type === "text" ? block.text.trim() : "";
}

export async function generateCopyDraft(
  templateId: CopyTemplateId,
  opts?: { count?: number }
): Promise<{ created: number; errors: string[] }> {
  const template = getTemplate(templateId);
  if (!template) throw new Error(`Unknown template: ${templateId}`);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      created: 0,
      errors: ["ANTHROPIC_API_KEY not set — add to Netlify env vars or .env.local"],
    };
  }

  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;

  const [brandBlock, promptBody, inputs] = await Promise.all([
    loadBrandContextBlock(),
    loadPromptTemplate(templateId),
    buildPromptInputs(templateId),
  ]);

  const client = new Anthropic({ apiKey });
  const count = opts?.count ?? (templateId === "reverse-testimonial" ? 5 : 1);
  const errors: string[] = [];
  let created = 0;

  const validFor = startOfToday();

  for (let i = 0; i < count; i++) {
    let raw = "";
    let lastErrors: string[] = [];

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      raw = await requestCopyLine(
        client,
        model,
        brandBlock,
        promptBody,
        inputs,
        templateId,
        template.maxWords,
        i + 1,
        count,
        attempt > 1 ? lastErrors : undefined
      );

      const validation = validateCopy(raw, { maxWords: template.maxWords });
      if (validation.ok) break;
      lastErrors = validation.errors;
      if (attempt === MAX_ATTEMPTS) {
        errors.push(`${templateId} #${i + 1}: ${lastErrors.join("; ")}`);
      }
    }

    const validation = validateCopy(raw, { maxWords: template.maxWords });
    if (!validation.ok) continue;

    await prisma.generatedCopy.create({
      data: {
        templateId,
        content: raw,
        status: "draft",
        inputsJson: inputs,
        validFor,
      },
    });
    created++;
  }

  return { created, errors };
}

export async function publishCopy(
  id: string,
  content?: string,
  opts?: { validFor?: Date }
) {
  const row = await prisma.generatedCopy.findUnique({ where: { id } });
  if (!row) throw new Error("Not found");

  const finalContent = content ?? row.content;
  const validation = validateCopy(finalContent, {
    maxWords: getTemplate(row.templateId as CopyTemplateId)?.maxWords ?? 50,
  });
  if (!validation.ok) {
    throw new Error(validation.errors.join("; "));
  }

  // The day this line is valid for: an explicit override (publishing a draft for
  // a future date), else the row's own validFor, else today.
  const validFor =
    opts?.validFor ? studioDayStart(opts.validFor)
    : row.validFor ? studioDayStart(row.validFor)
    : startOfToday();
  const windowEnd = studioDayEnd(validFor);

  await prisma.$transaction([
    // Archive same-template siblings published for the SAME day, so future-dated
    // lines don't clobber today's copy.
    prisma.generatedCopy.updateMany({
      where: {
        templateId: row.templateId,
        status: "published",
        validFor: { gte: validFor, lte: windowEnd },
      },
      data: { status: "archived" },
    }),
    prisma.generatedCopy.update({
      where: { id },
      data: { content: finalContent, status: "published", validFor },
    }),
  ]);
}

export { getPublishedCopyForDisplay } from "@/lib/data/published-copy";
