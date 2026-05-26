import { prisma } from "@/lib/db/client";
import { getTemplate } from "@/lib/ai/templates";
import { validateCopy } from "@/lib/ai/validate-copy";
import { publishCopy } from "@/lib/ai/generate";

function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export async function createCopyDraft(
  templateId: string,
  content: string,
  opts?: { publish?: boolean }
) {
  const template = getTemplate(templateId);
  if (!template) throw new Error("Unknown template");

  const validation = validateCopy(content, { maxWords: template.maxWords });
  if (!validation.ok) throw new Error(validation.errors.join("; "));

  const row = await prisma.generatedCopy.create({
    data: {
      templateId,
      content: content.trim(),
      status: "draft",
      validFor: startOfToday(),
    },
  });

  if (opts?.publish) {
    await publishCopy(row.id, content.trim());
  }

  return row;
}
