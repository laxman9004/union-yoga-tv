import { readFile } from "fs/promises";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db/client";
import { buildFrameSnapshot } from "@/lib/data/snapshot";
import { loadBrandContextBlock } from "./brand-context";
import { getTemplate, type CopyTemplateId } from "./templates";
import { validateCopy } from "./validate-copy";

function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function endOfToday(): Date {
  const s = startOfToday();
  s.setHours(23, 59, 59, 999);
  return s;
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
      errors: ["ANTHROPIC_API_KEY not set in .env.local"],
    };
  }

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
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `${brandBlock}\n\n---\n\n${promptBody}\n\n---\n\nInputs (JSON):\n${inputs}\n\nWrite only the final line(s). No quotes around the whole thing. Variation ${i + 1} of ${count}.`,
        },
      ],
    });

    const block = message.content[0];
    const raw =
      block.type === "text" ? block.text.trim() : "";
    const validation = validateCopy(raw, { maxWords: template.maxWords });

    if (!validation.ok) {
      errors.push(`${templateId} #${i + 1}: ${validation.errors.join("; ")}`);
      continue;
    }

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

export async function publishCopy(id: string, content?: string) {
  const row = await prisma.generatedCopy.findUnique({ where: { id } });
  if (!row) throw new Error("Not found");

  const finalContent = content ?? row.content;
  const validation = validateCopy(finalContent, {
    maxWords: getTemplate(row.templateId as CopyTemplateId)?.maxWords ?? 50,
  });
  if (!validation.ok) {
    throw new Error(validation.errors.join("; "));
  }

  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  await prisma.$transaction([
    prisma.generatedCopy.updateMany({
      where: {
        templateId: row.templateId,
        status: "published",
        validFor: { gte: todayStart, lte: todayEnd },
      },
      data: { status: "archived" },
    }),
    prisma.generatedCopy.update({
      where: { id },
      data: { content: finalContent, status: "published" },
    }),
  ]);
}

export { getPublishedCopyForDisplay } from "@/lib/data/published-copy";
