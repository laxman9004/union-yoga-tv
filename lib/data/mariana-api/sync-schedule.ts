/**
 * Pull the upcoming class schedule from the Mariana Customer API and upsert
 * the resulting class instances into whatever Prisma datasource is active
 * (Turso in prod, local SQLite in dev).
 *
 * This is Stage 1 of replacing the CSV import: today's full class list
 * appears in the calendar/copy tabs without anyone running `npm run sync`.
 * It is idempotent and additive — uses the same `syntheticSessionId` keys
 * the CSV importer uses, so API-sourced and CSV-sourced rows merge instead
 * of duplicating. Cancelled classes are skipped by default.
 *
 * It does NOT touch CheckIn, Member, or capacity/utilization counters; those
 * still come from CSV until Stage 2.
 */
import { prisma } from "@/lib/db/client";
import { studioDayKey, studioLocalDate, studioYmd } from "@/lib/data/dates";
import { fetchClassesForRange } from "@/lib/mariana-api/fetch-classes";

export type ScheduleSyncStats = {
  fetched: number;
  upserted: number;
  cancelledSkipped: number;
  errors: string[];
  windowStart: string; // YYYY-MM-DD studio-local
  windowEnd: string; // YYYY-MM-DD studio-local
  durationMs: number;
};

export type ScheduleSyncOptions = {
  /** Days *before* today to include in the pull. Default 2 (safety net for late edits). */
  daysBack?: number;
  /** Days *after* today to include. Default 14 (matches the existing sync window). */
  daysAhead?: number;
  /** Optional Mariana location id filter. */
  locationId?: string;
  /** Include cancelled classes (default: skip). */
  includeCancelled?: boolean;
};

function dayOffsetKey(offsetDays: number): string {
  const now = new Date();
  const { year, month, day } = studioYmd(now);
  const d = studioLocalDate(year, month, day + offsetDays, 0, 0, 0, 0);
  return studioDayKey(d);
}

/**
 * Sync the schedule window into the active Prisma client. Safe to run from a
 * route handler or a cron — no shared state, no streaming, bounded by the
 * window size (~50–100 classes for a 14-day window).
 */
export async function syncScheduleToTurso(
  options: ScheduleSyncOptions = {}
): Promise<ScheduleSyncStats> {
  const t0 = Date.now();
  const daysBack = options.daysBack ?? 2;
  const daysAhead = options.daysAhead ?? 14;
  const minDate = dayOffsetKey(-daysBack);
  const maxDate = dayOffsetKey(daysAhead);

  const stats: ScheduleSyncStats = {
    fetched: 0,
    upserted: 0,
    cancelledSkipped: 0,
    errors: [],
    windowStart: minDate,
    windowEnd: maxDate,
    durationMs: 0,
  };

  let rows;
  try {
    rows = await fetchClassesForRange({
      minDate,
      maxDate,
      locationId: options.locationId,
      includeCancelled: options.includeCancelled ?? false,
    });
  } catch (err) {
    stats.errors.push(
      `Mariana fetch failed: ${err instanceof Error ? err.message : String(err)}`
    );
    stats.durationMs = Date.now() - t0;
    return stats;
  }

  stats.fetched = rows.length;

  for (const row of rows) {
    try {
      await prisma.classSession.upsert({
        where: { id: row.sessionId },
        create: {
          id: row.sessionId,
          classType: row.classType,
          instructorName: row.instructorName,
          classroomName: row.classroomName,
          startTime: row.startTime,
          endTime: row.endTime,
          // capacity / availableSpots / checkedInCount / utilizationPercent
          // are intentionally left unset — they come from utilization CSV
          // (until Stage 2) and we don't want to overwrite real values.
        },
        update: {
          classType: row.classType,
          instructorName: row.instructorName,
          classroomName: row.classroomName,
          startTime: row.startTime,
          endTime: row.endTime,
        },
      });
      stats.upserted++;
    } catch (err) {
      stats.errors.push(
        `${row.sessionId}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  stats.durationMs = Date.now() - t0;
  return stats;
}
