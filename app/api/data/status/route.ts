import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function GET() {
  const [config, memberCount, sessionCount, lastRun] = await Promise.all([
    prisma.studioConfig.findUnique({ where: { id: 1 } }),
    prisma.member.count(),
    prisma.classSession.count(),
    prisma.importRun.findFirst({
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    lastImportAt: config?.lastImportAt?.toISOString() ?? null,
    dataThroughDate: config?.dataThroughDate?.toISOString()?.slice(0, 10) ?? null,
    memberCount,
    sessionCount,
    lastImportFile: lastRun?.filename ?? null,
  });
}
