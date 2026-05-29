import { prisma } from "@/lib/db/client";
import {
  DEFAULT_CLASS_MINUTES,
  POST_CLASS_MINUTES,
  PRE_CLASS_MINUTES,
  type DisplayLineupState,
  type LineupDisplayItem,
} from "./types";
import { endOfDay, startOfDay } from "./store";

export async function resolveDisplayLineup(now = new Date()): Promise<DisplayLineupState> {
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const sessions = await prisma.classSession.findMany({
    where: { startTime: { gte: dayStart, lte: dayEnd } },
    orderBy: { startTime: "asc" },
    include: {
      lineups: {
        where: { validFor: dayStart, status: "published" },
        include: {
          items: {
            where: { enabled: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  const active = sessions.find((s) => isClassWindow(now, s.startTime, s.endTime));
  if (!active) {
    return { mode: "ambient", activeClass: null, items: [] };
  }

  const lineup = active.lineups[0];
  if (!lineup || !lineup.items.length) {
    return {
      mode: "ambient",
      activeClass: {
        classSessionId: active.id,
        classType: active.classType,
        instructorName: active.instructorName,
        startTime: active.startTime.toISOString(),
        windowLabel: formatWindow(active.startTime, active.endTime),
      },
      items: [],
    };
  }

  const items: LineupDisplayItem[] = lineup.items.map((i) => ({
    itemKey: i.itemKey,
    sceneKey: i.sceneKey as LineupDisplayItem["sceneKey"],
    headline: i.headline,
    subline: i.subline,
    payload: JSON.parse(i.payloadJson) as Record<string, unknown>,
  }));

  return {
    mode: "class",
    activeClass: {
      classSessionId: active.id,
      classType: active.classType,
      instructorName: active.instructorName,
      startTime: active.startTime.toISOString(),
      windowLabel: formatWindow(active.startTime, active.endTime),
    },
    items,
  };
}

export function isClassWindow(now: Date, start: Date, end: Date | null): boolean {
  const preMs = PRE_CLASS_MINUTES * 60 * 1000;
  const postMs = POST_CLASS_MINUTES * 60 * 1000;
  const startMs = start.getTime() - preMs;
  const endMs = (end ?? new Date(start.getTime() + DEFAULT_CLASS_MINUTES * 60 * 1000)).getTime() + postMs;
  const t = now.getTime();
  return t >= startMs && t <= endMs;
}

function formatWindow(start: Date, end: Date | null) {
  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
}
