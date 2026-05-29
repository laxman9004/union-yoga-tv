import { prisma } from "@/lib/db/client";
import { getTemplate } from "@/lib/ai/templates";
import { validateCopy } from "@/lib/ai/validate-copy";
import { publishCopy } from "@/lib/ai/generate";
import { studioDayStart } from "./dates";

function startOfToday(): Date {
  return studioDayStart();
}

export async function createCopyDraft(
  templateId: string,
  content: string,
  opts?: { publish?: boolean; validFor?: Date }
) {
  const template = getTemplate(templateId);
  if (!template) throw new Error("Unknown template");

  const validation = validateCopy(content, { maxWords: template.maxWords });
  if (!validation.ok) throw new Error(validation.errors.join("; "));

  // Normalize whatever date is passed to its studio day-start so validFor keys
  // line up with the day windows used everywhere else.
  const validFor = opts?.validFor ? studioDayStart(opts.validFor) : startOfToday();

  const row = await prisma.generatedCopy.create({
    data: {
      templateId,
      content: content.trim(),
      status: "draft",
      validFor,
    },
  });

  if (opts?.publish) {
    await publishCopy(row.id, content.trim());
  }

  return row;
}
