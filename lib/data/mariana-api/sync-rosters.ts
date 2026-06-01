/**
 * Stage 2: pull check-ins, members, and per-class roster from the Mariana
 * Admin API and upsert into Turso. Replaces what the CSV Reservations +
 * Customer Details + Frequency + Utilization imports used to do.
 *
 * Algorithm:
 *   1. Enumerate Mariana class ids for the window via the Customer API
 *      (re-uses fetchClassesForRange — already proven to filter by date).
 *   2. For each class id, hit /api/class_sessions/{id}?include=reservations,
 *      reservations.user. One round-trip yields the class + every reservation
 *      + every linked user.
 *   3. Upsert Member rows (preserving NameBlocklist-driven optOutFlag), upsert
 *      CheckIn rows where check_in_date is set, refresh ClassSession capacity
 *      / checked-in counts from the admin record.
 *   4. Recompute per-member checkIns1Week, checkIns1Month, checkInsPeriod, and
 *      lastCheckInAt from the CheckIn table — the candidate-building scenes
 *      (welcome-back, streak, etc.) read these fields.
 *
 * Idempotent. Roughly N class round-trips per call where N = #classes in
 * window (~70 for a 14-day forward window at this studio).
 */
import { prisma } from "@/lib/db/client";
import { studioDayKey, studioLocalDate, studioYmd } from "@/lib/data/dates";
import { fetchClassesForRange } from "@/lib/mariana-api/fetch-classes";
import {
  fetchRoster,
  type ApiReservation,
  type ApiAdminUser,
  type ApiAdminClassSession,
} from "@/lib/mariana-api/fetch-roster";

export type RosterSyncStats = {
  classesScanned: number;
  membersUpserted: number;
  checkInsUpserted: number;
  classSessionsUpdated: number;
  memberAggregatesUpdated: number;
  errors: string[];
  windowStart: string;
  windowEnd: string;
  durationMs: number;
};

export type RosterSyncOptions = {
  daysBack?: number;
  daysAhead?: number;
  locationId?: string;
  /**
   * If provided, sync ONLY this single studio-local day (YYYY-MM-DD).
   * Overrides daysBack/daysAhead. Used by the chunked client loop so each
   * function call stays well under Netlify's per-function timeout.
   */
  date?: string;
};

function dayOffsetKey(offsetDays: number): string {
  const { year, month, day } = studioYmd(new Date());
  return studioDayKey(studioLocalDate(year, month, day + offsetDays));
}

function parseDateOrNull(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function firstWord(name: string | null | undefined): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0];
}

function lastInitialOf(lastName: string | null | undefined): string | null {
  if (!lastName) return null;
  const c = lastName.trim()[0];
  return c ? c.toUpperCase() : null;
}

/** Run an async fn against each item with bounded concurrency. */
async function pool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
  return results;
}

export async function syncRostersFromMariana(
  options: RosterSyncOptions = {}
): Promise<RosterSyncStats> {
  const t0 = Date.now();
  // Single-day mode: caller passes an explicit YYYY-MM-DD. Used by the chunked
  // client loop to keep each function invocation small enough that we never
  // touch Netlify's per-function timeout.
  let minDate: string;
  let maxDate: string;
  if (options.date && /^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    minDate = options.date;
    maxDate = options.date;
  } else {
    const daysBack = options.daysBack ?? 0;
    const daysAhead = options.daysAhead ?? 1;
    minDate = dayOffsetKey(-daysBack);
    maxDate = dayOffsetKey(daysAhead);
  }

  const stats: RosterSyncStats = {
    classesScanned: 0,
    membersUpserted: 0,
    checkInsUpserted: 0,
    classSessionsUpdated: 0,
    memberAggregatesUpdated: 0,
    errors: [],
    windowStart: minDate,
    windowEnd: maxDate,
    durationMs: 0,
  };

  // Snapshot the blocklist once — Member.optOutFlag is driven exclusively by
  // NameBlocklist (matches CSV importer behavior); we never inherit it from
  // Mariana's `marketing_opt_in` (different concept).
  const blocklist = new Set(
    (await prisma.nameBlocklist.findMany({ select: { memberId: true } })).map(
      (r) => r.memberId
    )
  );

  // 1. Enumerate classes in the window (gives us {marianaId, sessionId}).
  let classes;
  try {
    classes = await fetchClassesForRange({
      minDate,
      maxDate,
      locationId: options.locationId,
      includeCancelled: false,
    });
  } catch (err) {
    stats.errors.push(
      `Mariana schedule fetch failed: ${err instanceof Error ? err.message : String(err)}`
    );
    stats.durationMs = Date.now() - t0;
    return stats;
  }

  // Track which members get any new check-ins so we can scope the aggregate
  // refresh to just those (vs. recomputing for all 1800+ users every sync).
  const touchedMemberIds = new Set<string>();

  // 2. Per-class: fetch roster, upsert members + check-ins + class session.
  await pool(classes, 4, async (cls) => {
    stats.classesScanned++;
    let roster;
    try {
      roster = await fetchRoster(cls.marianaId);
    } catch (err) {
      stats.errors.push(
        `class ${cls.marianaId}: roster fetch failed — ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      return;
    }

    // 2a. Refresh ClassSession with admin-only fields. The Stage 1 sync
    // already created the row (or CSV did); we just enrich it with capacity
    // + checked-in count + waitlist count + end time.
    try {
      await upsertClassSessionFromAdmin(cls.sessionId, roster.classSession);
      stats.classSessionsUpdated++;
    } catch (err) {
      stats.errors.push(
        `${cls.sessionId}: classSession update failed — ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    // 2b. Upsert each linked user as a Member.
    for (const user of roster.users.values()) {
      // Skip merged/duplicate accounts — they'll appear under merged_into_id.
      if (user.attributes.merged_into_id) continue;
      try {
        await upsertMemberFromApi(user, blocklist);
        stats.membersUpserted++;
      } catch (err) {
        stats.errors.push(
          `member ${user.id}: upsert failed — ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }

    // 2c. Upsert CheckIn for each reservation that actually checked in.
    for (const res of roster.reservations) {
      if (!res.attributes.check_in_date) continue; // not attended
      const userId = res.relationships?.user?.data?.id;
      if (!userId) continue;
      try {
        await upsertCheckInFromApi(res, userId, cls.sessionId);
        stats.checkInsUpserted++;
        touchedMemberIds.add(userId);
      } catch (err) {
        stats.errors.push(
          `reservation ${res.id}: check-in upsert failed — ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }
  });

  // 3. Recompute aggregate counts (checkIns1Week/1Month/Period, lastCheckInAt)
  // for every member who got new check-ins this run.
  for (const memberId of touchedMemberIds) {
    try {
      await refreshMemberAggregates(memberId);
      stats.memberAggregatesUpdated++;
    } catch (err) {
      stats.errors.push(
        `member ${memberId}: aggregate refresh failed — ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  stats.durationMs = Date.now() - t0;
  return stats;
}

async function upsertClassSessionFromAdmin(
  sessionId: string,
  cs: ApiAdminClassSession
): Promise<void> {
  const a = cs.attributes;
  const start = parseDateOrNull(a.start_datetime);
  const end = parseDateOrNull(a.end_datetime);
  if (!start) return; // shouldn't happen, but defensive

  // We rely on Stage 1 / CSV importer to have created the row with the right
  // classType + instructor + classroom. Here we just enrich admin-only fields.
  const update = {
    capacity: a.capacity ?? null,
    checkedInCount: a.checked_in_user_count ?? null,
    availableSpots:
      typeof a.capacity === "number" && typeof a.checked_in_user_count === "number"
        ? Math.max(0, a.capacity - a.checked_in_user_count)
        : null,
    waitlistCount: a.public_waitlist_count ?? 0,
    endTime: end,
  };

  // If the row doesn't exist yet, create it with the bare minimum so the
  // CheckIn FK below resolves. Stage 1 should have created it, but a roster
  // sync run alone shouldn't fail just because schedule sync hasn't run.
  await prisma.classSession.upsert({
    where: { id: sessionId },
    create: {
      id: sessionId,
      classType: a.class_type_display,
      instructorName: a.instructor_names?.join(", ") || null,
      classroomName: a.classroom_display ?? null,
      startTime: start,
      ...update,
    },
    update,
  });
}

async function upsertMemberFromApi(
  user: ApiAdminUser,
  blocklist: Set<string>
): Promise<void> {
  const a = user.attributes;
  const firstName = a.first_name?.trim() || "Friend";

  // Update fields the API is authoritative for; never touch
  // checkIns1Week/Month/Period/lastCheckInAt here — those are recomputed
  // from our CheckIn table later in the sync.
  await prisma.member.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      firstName,
      lastInitial: lastInitialOf(a.last_name),
      email: a.email || null,
      birthday: parseDateOrNull(a.birth_date),
      memberSinceDate: parseDateOrNull(a.date_joined),
      optOutFlag: blocklist.has(user.id),
      lifetimeClassCount: a.completed_class_count ?? 0,
    },
    update: {
      firstName,
      lastInitial: lastInitialOf(a.last_name),
      email: a.email || null,
      birthday: parseDateOrNull(a.birth_date),
      memberSinceDate: parseDateOrNull(a.date_joined),
      optOutFlag: blocklist.has(user.id),
      lifetimeClassCount: a.completed_class_count ?? 0,
    },
  });
}

async function upsertCheckInFromApi(
  res: ApiReservation,
  userId: string,
  sessionId: string
): Promise<void> {
  const a = res.attributes;
  const at = parseDateOrNull(a.check_in_date);
  if (!at) return;
  const isGuest = !!a.reserved_for_guest;
  const guestFirstName = isGuest ? firstWord(a.guest_name) : null;

  await prisma.checkIn.upsert({
    where: { id: res.id },
    create: {
      id: res.id,
      memberId: userId,
      classSessionId: sessionId,
      checkedInAt: at,
      isGuest,
      guestFirstName,
    },
    update: {
      memberId: userId,
      classSessionId: sessionId,
      checkedInAt: at,
      isGuest,
      guestFirstName,
    },
  });
}

async function refreshMemberAggregates(memberId: string): Promise<void> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const monthAgo = new Date(now.getTime() - 30 * 86_400_000);

  const [w, m, last] = await Promise.all([
    prisma.checkIn.count({
      where: {
        memberId,
        isGuest: false,
        checkedInAt: { gte: weekAgo, lte: now },
      },
    }),
    prisma.checkIn.count({
      where: {
        memberId,
        isGuest: false,
        checkedInAt: { gte: monthAgo, lte: now },
      },
    }),
    prisma.checkIn.findFirst({
      where: { memberId, isGuest: false },
      orderBy: { checkedInAt: "desc" },
      select: { checkedInAt: true },
    }),
  ]);

  await prisma.member.update({
    where: { id: memberId },
    data: {
      checkIns1Week: w,
      checkIns1Month: m,
      checkInsPeriod: m, // CSV used a Mariana-report-window count; align with month
      lastCheckInAt: last?.checkedInAt ?? null,
    },
  });
}
