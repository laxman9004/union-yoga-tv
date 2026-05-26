import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { createCopyDraft } from "@/lib/data/copy";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await prisma.generatedCopy.findMany({
    where: { status: { in: ["draft", "published"] } },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 80,
  });
  return NextResponse.json({ items: rows });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const templateId = body.templateId as string;
  const content = typeof body.content === "string" ? body.content : "";

  try {
    const row = await createCopyDraft(templateId, content, {
      publish: body.publish === true,
    });
    return NextResponse.json(row);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not save copy" },
      { status: 400 }
    );
  }
}
