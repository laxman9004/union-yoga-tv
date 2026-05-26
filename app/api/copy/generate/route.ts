import { NextResponse } from "next/server";
import { generateCopyDraft } from "@/lib/ai/generate";
import { getTemplate, type CopyTemplateId } from "@/lib/ai/templates";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const templateId = body.templateId as string;
  if (!getTemplate(templateId)) {
    return NextResponse.json({ error: "Unknown template" }, { status: 400 });
  }
  const result = await generateCopyDraft(templateId as CopyTemplateId, {
    count: typeof body.count === "number" ? body.count : undefined,
  });
  return NextResponse.json(result);
}
