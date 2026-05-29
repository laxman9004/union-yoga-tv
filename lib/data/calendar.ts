import { prisma } from "@/lib/db/client";
import {
  studioDayEnd,
  studioDayKey,
  studioDayStart,
  studioLocalDate,
  studioYmd,
} from "./dates";

export type CalendarDay = {
  /** Studio-local calendar day, YYYY-MM-DD. */
  date: string;
  /** Day-start instant (UTC) for that studio day. */
  dayStart: string;
  classCount: number;
  lineupDraftCount: number;
  lineupPublishedCount: number;
  studioMessageCount: number;
  status: "published" | "draft" | "empty";
  /** Relative to today in studio time. */
  isPast: boolean;
  isToday: boolean;
};

export type ScheduledCopy = {
  id: string;
  templateId: string;
  content: string;
  status: string;
  validFor: string | null;
};

/**
 * Sequence of studio day-start instants from `center - pastDays` to
 * `center + futureDays` (inclusive). Each day is computed independently at
 * studio-midnight so DST transitions never skip or duplicate a day.
 */
export function dayRange(
  center: Date,
  pastDays: number,
  futureDays: number
): Date[] {
  const { year, month, day } = studioYmd(center);
  const out: Date[] = [];
  for (let offset = -pastDays; offset <= futureDays; offset++) {
    out.push(studioLocalDate(year, month, day + offset));
  }
  return out;
}

export async function getCalendarSummary(
  from: Date,
  to: Date,
  now: Date = new Date()
): Promise<CalendarDay[]> {
  const rangeStart = studioDayStart(from);
  const rangeEnd = studioDayEnd(to);

  const [sessions, lineups, copy] = await Promise.all([
    prisma.classSession.findMany({
      where: { startTime: { gte: rangeStart, lte: rangeEnd } },
      select: { startTime: true },
    }),
    prisma.classLineup.findMany({
      where: { validFor: { gte: rangeStart, lte: rangeEnd } },
      select: { validFor: true, status: true },
    }),
    prisma.generatedCopy.findMany({
      where: {
        validFor: { gte: rangeStart, lte: rangeEnd },
        status: { in: ["draft", "published"] },
      },
      select: { validFor: true },
    }),
  ]);

  const days = new Map<string, CalendarDay>();
  const todayKey = studioDayKey(now);

  // Seed every day in the range so empty days still appear.
  for (const dayStart of dayRange(from, 0, daysBetween(from, to))) {
    const key = studioDayKey(dayStart);
    days.set(key, {
      date: key,
      dayStart: dayStart.toISOString(),
      classCount: 0,
      lineupDraftCount: 0,
      lineupPublishedCount: 0,
      studioMessageCount: 0,
      status: "empty",
      isPast: key < todayKey,
      isToday: key === todayKey,
    });
  }

  const ensure = (instant: Date): CalendarDay => {
    const key = studioDayKey(instant);
    let d = days.get(key);
    if (!d) {
      d = {
        date: key,
        dayStart: studioDayStart(instant).toISOString(),
        classCount: 0,
        lineupDraftCount: 0,
        lineupPublishedCount: 0,
        studioMessageCount: 0,
        status: "empty",
        isPast: key < todayKey,
        isToday: key === todayKey,
      };
      days.set(key, d);
    }
    return d;
  };

  for (const s of sessions) ensure(s.startTime).classCount++;
  for (const l of lineups) {
    const d = ensure(l.validFor);
    if (l.status === "published") d.lineupPublishedCount++;
    else if (l.status === "draft") d.lineupDraftCount++;
  }
  for (const c of copy) {
    if (c.validFor) ensure(c.validFor).studioMessageCount++;
  }

  for (const d of days.values()) {
    if (d.lineupPublishedCount > 0) d.status = "published";
    else if (d.lineupDraftCount > 0 || d.studioMessageCount > 0) d.status = "draft";
    else d.status = "empty";
  }

  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function listScheduledCopy(
  from: Date,
  to: Date
): Promise<ScheduledCopy[]> {
  const rows = await prisma.generatedCopy.findMany({
    where: {
      validFor: { gte: studioDayStart(from), lte: studioDayEnd(to) },
      status: { in: ["draft", "published"] },
    },
    orderBy: [{ validFor: "asc" }, { updatedAt: "desc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    templateId: r.templateId,
    content: r.content,
    status: r.status,
    validFor: r.validFor?.toISOString() ?? null,
  }));
}

/** Whole studio-days between two instants (inclusive of both ends). */
function daysBetween(from: Date, to: Date): number {
  const a = studioDayStart(from).getTime();
  const b = studioDayStart(to).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000));
}
