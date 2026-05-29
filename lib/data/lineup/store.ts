import { prisma } from "@/lib/db/client";
import { studioDayEnd, studioDayStart } from "../dates";
import { buildClassLineupItems } from "./candidates";
import type { LineupAdminClass, LineupAdminDay, LineupAdminItem } from "./types";

/** Start of "today" in the studio timezone (never the server's local tz). */
export function startOfDay(d = new Date()): Date {
  return studioDayStart(d);
}

/** End of "today" in the studio timezone (never the server's local tz). */
export function endOfDay(d = new Date()): Date {
  return studioDayEnd(d);
}

export async function refreshTodayLineupDrafts(now = new Date()): Promise<void> {
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const sessions = await prisma.classSession.findMany({
    where: { startTime: { gte: dayStart, lte: dayEnd } },
    orderBy: { startTime: "asc" },
    include: {
      checkIns: {
        include: { member: true },
      },
      lineups: {
        where: { validFor: dayStart },
        include: { items: true },
      },
    },
  });

  for (const session of sessions) {
    const candidates = buildClassLineupItems({
      classSessionId: session.id,
      classType: session.classType,
      instructorName: session.instructorName,
      checkIns: session.checkIns,
      now,
    });

    const existing = session.lineups[0];
    const enabledMap = new Map(
      existing?.items.map((i) => [i.itemKey, i.enabled]) ?? []
    );

    const lineup = existing
      ? await prisma.classLineup.update({
          where: { id: existing.id },
          data: { status: "draft", publishedAt: null, updatedAt: now },
        })
      : await prisma.classLineup.create({
          data: {
            classSessionId: session.id,
            validFor: dayStart,
            status: "draft",
          },
        });

    await prisma.classLineupItem.deleteMany({ where: { lineupId: lineup.id } });

    if (candidates.length) {
      await prisma.classLineupItem.createMany({
        data: candidates.map((c) => ({
          lineupId: lineup.id,
          itemKey: c.itemKey,
          sceneKey: c.sceneKey,
          headline: c.headline,
          subline: c.subline,
          category: c.category,
          enabled: enabledMap.get(c.itemKey) ?? c.defaultEnabled,
          sortOrder: c.sortOrder,
          payloadJson: JSON.stringify(c.payload),
        })),
      });
    }

    await prisma.classLineup.update({
      where: { id: lineup.id },
      data: { status: "draft", updatedAt: now },
    });
  }
}

export async function getTodayLineupAdmin(now = new Date()): Promise<LineupAdminDay> {
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const sessions = await prisma.classSession.findMany({
    where: { startTime: { gte: dayStart, lte: dayEnd } },
    orderBy: { startTime: "asc" },
    include: {
      checkIns: { where: { isGuest: false } },
      lineups: {
        where: { validFor: dayStart },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  const publishedDates = sessions
    .map((s) => s.lineups[0]?.publishedAt)
    .filter((d): d is Date => d != null);
  const lastPublishedAt =
    publishedDates.length > 0
      ? publishedDates.reduce((latest, d) => (d > latest ? d : latest))
      : null;

  const classes: LineupAdminClass[] = sessions.map((session) => {
    const lineup = session.lineups[0];

    const members = session.checkIns.length;
    const room = lineup?.items.find((i) => i.sceneKey === "room-overview");
    const roomPayload = room ? (JSON.parse(room.payloadJson) as Record<string, number>) : null;

    const items: LineupAdminItem[] =
      lineup?.items.map((i) => ({
        itemKey: i.itemKey,
        sceneKey: i.sceneKey as LineupAdminDay["classes"][0]["items"][0]["sceneKey"],
        category: i.category as "class" | "student",
        headline: i.headline,
        subline: i.subline,
        defaultEnabled: i.enabled,
        sortOrder: i.sortOrder,
        payload: JSON.parse(i.payloadJson) as Record<string, unknown>,
        enabled: i.enabled,
      })) ?? [];

    return {
      classSessionId: session.id,
      classType: session.classType,
      instructorName: session.instructorName,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime?.toISOString() ?? null,
      checkedInCount: roomPayload?.checkedInCount ?? members,
      firstTimerCount: roomPayload?.firstTimerCount ?? 0,
      regularCount: roomPayload?.regularCount ?? 0,
      lineupId: lineup?.id ?? null,
      status: (lineup?.status as "draft" | "published") ?? "new",
      items,
    };
  });

  return {
    validFor: dayStart.toISOString().slice(0, 10),
    classes,
    lastPublishedAt: lastPublishedAt?.toISOString() ?? null,
  };
}

export type LineupDraftRow = {
  classSessionId: string;
  itemKey: string;
  enabled: boolean;
  headline?: string;
  subline?: string;
};

export async function saveLineupDraft(
  rows: LineupDraftRow[],
  now = new Date()
) {
  const dayStart = startOfDay(now);
  for (const row of rows) {
    const lineup = await prisma.classLineup.findUnique({
      where: {
        classSessionId_validFor: {
          classSessionId: row.classSessionId,
          validFor: dayStart,
        },
      },
    });
    if (!lineup) continue;
    await prisma.classLineupItem.updateMany({
      where: { lineupId: lineup.id, itemKey: row.itemKey },
      data: {
        enabled: row.enabled,
        ...(row.headline !== undefined ? { headline: row.headline } : {}),
        ...(row.subline !== undefined ? { subline: row.subline } : {}),
      },
    });
  }
}

export async function publishTodayLineup(rows: LineupDraftRow[], now = new Date()) {
  await saveLineupDraft(rows, now);
  const dayStart = startOfDay(now);

  await prisma.$transaction([
    prisma.classLineup.updateMany({
      where: { validFor: dayStart, status: "published" },
      data: { status: "archived" },
    }),
    prisma.classLineup.updateMany({
      where: { validFor: dayStart, status: "draft" },
      data: { status: "published", publishedAt: now },
    }),
  ]);
}
