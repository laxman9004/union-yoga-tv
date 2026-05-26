import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { publishCopy } from "@/lib/ai/generate";
import { getTemplate } from "@/lib/ai/templates";
import { validateCopy } from "@/lib/ai/validate-copy";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await request.json();

  if (body.action === "publish") {
    try {
      await publishCopy(id, body.content);
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Publish failed" },
        { status: 400 }
      );
    }
  }

  if (typeof body.content === "string") {
    const row = await prisma.generatedCopy.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const template = getTemplate(row.templateId);
    const validation = validateCopy(body.content, {
      maxWords: template?.maxWords ?? 50,
    });
    if (!validation.ok) {
      return NextResponse.json({ error: validation.errors.join("; ") }, { status: 400 });
    }
    const updated = await prisma.generatedCopy.update({
      where: { id },
      data: { content: body.content },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  await prisma.generatedCopy.update({
    where: { id },
    data: { status: "archived" },
  });
  return NextResponse.json({ ok: true });
}
