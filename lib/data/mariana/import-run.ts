import type { PrismaClient } from "@/app/generated/prisma/client";
import { parseBool, parseDate, pick } from "../csv";
import {
  combineClassDateTime,
  isOnOrBeforeToday,
  parseMtDate,
  syntheticSessionId,
} from "../dates";
import { MT, isCheckedInStatus, parsePersonName } from "./fields";
import type { MarianaFileKind } from "./types";

export type MarianaImportStats = {
  members: number;
  sessions: number;
  checkIns: number;
  frequencyUpdates: number;
  birthdayUpdates: number;
  sessionsSkippedFuture: number;
  orderRowsIgnored: number;
  legacySessionsMerged: number;
};

type ParsedFile = {
  filename: string;
  kind: MarianaFileKind;
  rows: Record<string, string>[];
};

export async function runMarianaImport(
  tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">,
  files: ParsedFile[]
): Promise<MarianaImportStats> {
  const stats: MarianaImportStats = {
    members: 0,
    sessions: 0,
    checkIns: 0,
    frequencyUpdates: 0,
    birthdayUpdates: 0,
    sessionsSkippedFuture: 0,
    orderRowsIgnored: 0,
    legacySessionsMerged: 0,
  };

  const blocklistedIds = new Set(
    (await tx.nameBlocklist.findMany({ select: { memberId: true } })).map(
      (row) => row.memberId
    )
  );
  const isBlocklisted = (memberId: string) => blocklistedIds.has(memberId);

  const knownMemberIds = new Set(
    (await tx.member.findMany({ select: { id: true } })).map((row) => row.id)
  );

  const byKind = (k: MarianaFileKind) =>
    files.filter((f) => f.kind === k).flatMap((f) => f.rows);

  // 1. Customers – Details
  for (const r of byKind("customers_details")) {
    const id = MT.customerId(r);
    const first = MT.firstName(r);
    if (!id || !first) continue;

    const lastName = MT.lastName(r);
    const lastInitial = lastName ? lastName[0].toUpperCase() : null;
    const blocklisted = isBlocklisted(id);

    await tx.member.upsert({
      where: { id },
      create: {
        id,
        firstName: first,
        lastInitial,
        email: MT.email(r) || null,
        memberSinceDate: parseMtDate(MT.joinDate(r)),
        birthday: parseMtDate(MT.birthDate(r)),
        optOutFlag: blocklisted,
        lifetimeClassCount: MT.checkInsAllTime(r),
        checkIns1Week: MT.checkIns1Week(r),
        checkIns1Month: MT.checkIns1Month(r),
        lastCheckInAt: parseMtDate(MT.lastCheckIn(r)),
        referralCount: MT.guestCheckInsAllTime(r),
      },
      update: {
        firstName: first,
        lastInitial,
        email: MT.email(r) || null,
        memberSinceDate: parseMtDate(MT.joinDate(r)),
        birthday: parseMtDate(MT.birthDate(r)),
        optOutFlag: blocklisted,
        lifetimeClassCount: MT.checkInsAllTime(r),
        checkIns1Week: MT.checkIns1Week(r),
        checkIns1Month: MT.checkIns1Month(r),
        lastCheckInAt: parseMtDate(MT.lastCheckIn(r)),
        referralCount: MT.guestCheckInsAllTime(r),
      },
    });
    knownMemberIds.add(id);
    stats.members++;
  }

  // 2. Customer Frequency (period check-ins for export window)
  for (const r of byKind("customer_frequency")) {
    const id = MT.freqCustomerId(r);
    if (!id || !knownMemberIds.has(id)) continue;

    const period = parseInt(MT.freqCheckIns(r), 10) || 0;
    const lastClass = parseMtDate(MT.freqLastClass(r));
    await tx.member.update({
      where: { id },
      data: {
        checkInsPeriod: period,
        ...(lastClass ? { lastCheckInAt: lastClass } : {}),
      },
    });
    stats.frequencyUpdates++;
  }

  // 3. Birthdays (merge when Details lacked birth date)
  for (const r of byKind("customer_birthdays")) {
    const id = MT.customerId(r);
    const bd = parseMtDate(MT.birthDate(r));
    if (!id || !bd) continue;
    const m = await tx.member.findUnique({ where: { id } });
    if (!m || m.birthday) continue;
    await tx.member.update({
      where: { id },
      data: { birthday: bd },
    });
    stats.birthdayUpdates++;
  }

  // 4. Reservations -> members (stubs), class sessions, check-ins.
  // The class session is created for EVERY valid reservation row (any status,
  // any date — including future bookings) so the calendar/lineup can be built
  // ahead of time. Check-ins are created only for actual "check in" rows.
  for (const r of byKind("reservations")) {
    const resId = MT.reservationId(r);
    const memberId = MT.reservationCustomerId(r);
    const classId = MT.classId(r);
    if (!resId || !memberId || !classId) continue;

    const startDate = MT.classStartDate(r);
    const startTime = MT.classStartTime(r);
    const start = combineClassDateTime(startDate, startTime);
    if (!start) continue;

    // Canonical session id: the natural key (location|date|time|type) shared
    // with the utilization report, so both sources resolve to ONE ClassSession
    // instead of a reservations `mt-class-NNNN` + a utilization `mt-powell|…`
    // duplicate pair.
    const sessionId = syntheticSessionId(
      MT.location(r) || "powell",
      startDate,
      startTime,
      MT.reservationClassType(r)
    );
    const capacity =
      parseInt(MT.reservationClassCapacity(r), 10) ||
      parseInt(MT.reservationLayoutCapacity(r), 10) ||
      null;

    // Note: "class cancelled" rows still create the session (a scheduled slot)
    // for v1 — could be filtered out later if cancelled classes shouldn't show.
    await tx.classSession.upsert({
      where: { id: sessionId },
      create: {
        id: sessionId,
        classType: MT.reservationClassType(r) || "Class",
        instructorName: MT.reservationInstructors(r).trim() || null,
        classroomName: MT.reservationClassroom(r) || null,
        startTime: start,
        capacity,
      },
      update: {
        classType: MT.reservationClassType(r) || "Class",
        instructorName: MT.reservationInstructors(r).trim() || null,
        classroomName: MT.reservationClassroom(r) || null,
        startTime: start,
        capacity,
      },
    });

    // Only "check in" rows become check-ins; pending/cancelled/no-show rows
    // contribute the session but no attendance.
    if (!isCheckedInStatus(MT.reservationStatus(r))) continue;

    if (isBlocklisted(memberId)) continue;

    if (!knownMemberIds.has(memberId)) {
      const { firstName, lastInitial } = parsePersonName(
        MT.reservationCustomerName(r) || "Friend"
      );
      await tx.member.create({
        data: {
          id: memberId,
          firstName,
          lastInitial,
          email: MT.reservationCustomerEmail(r) || null,
          optOutFlag: isBlocklisted(memberId),
        },
      });
      knownMemberIds.add(memberId);
      stats.members++;
    }

    const isGuest = parseBool(MT.reservationGuest(r));
    const guestName = isGuest
      ? parsePersonName(MT.reservationCustomerName(r)).firstName
      : null;

    await tx.checkIn.upsert({
      where: { id: resId },
      create: {
        id: resId,
        memberId,
        classSessionId: sessionId,
        checkedInAt: start,
        isGuest,
        guestFirstName: guestName,
      },
      update: {
        memberId,
        classSessionId: sessionId,
        checkedInAt: start,
        isGuest,
        guestFirstName: guestName,
      },
    });
    stats.checkIns++;
  }

  // 5. Class utilization (skip future class dates)
  for (const r of byKind("class_utilization")) {
    const classType = MT.classType(r);
    const dateStr = MT.classDate(r);
    const timeStr = MT.classTime(r);
    if (!classType || !dateStr) continue;

    const start = combineClassDateTime(dateStr, timeStr);
    if (!start) continue;
    if (!isOnOrBeforeToday(start)) {
      stats.sessionsSkippedFuture++;
      continue;
    }

    const id = syntheticSessionId(
      MT.location(r) || "powell",
      dateStr,
      timeStr,
      classType
    );
    const capacity =
      parseInt(MT.actualCapacity(r), 10) ||
      parseInt(MT.layoutCapacity(r), 10) ||
      null;
    const checkedIn = parseInt(MT.checkedInReservations(r), 10) || 0;
    const utilStr = MT.utilizationPct(r).replace("%", "");
    const utilization = parseFloat(utilStr) || null;
    const availableSpots =
      capacity != null ? Math.max(0, capacity - checkedIn) : null;

    await tx.classSession.upsert({
      where: { id },
      create: {
        id,
        classType,
        instructorName: MT.instructors(r).trim() || null,
        classroomName: MT.classroom(r) || null,
        startTime: start,
        capacity,
        availableSpots,
        checkedInCount: checkedIn,
        utilizationPercent: utilization,
      },
      update: {
        classType,
        instructorName: MT.instructors(r).trim() || null,
        classroomName: MT.classroom(r) || null,
        startTime: start,
        capacity,
        availableSpots,
        checkedInCount: checkedIn,
        utilizationPercent: utilization,
      },
    });
    stats.sessions++;
  }

  // 6. Orders — counted, not stored (retail noise for TV)
  stats.orderRowsIgnored = byKind("orders").length;

  // Generic legacy CSVs (if present)
  await importGenericMembers(tx, byKind("generic_members"), stats, isBlocklisted);
  await importGenericSessions(tx, byKind("generic_class_sessions"), stats);
  await importGenericCheckIns(tx, byKind("generic_check_ins"), stats);

  // 7. Reconcile legacy duplicates. Earlier builds keyed reservation sessions
  // as `mt-class-NNNN`, producing a second ClassSession for every class that
  // also had a utilization row (`mt-powell|…`). Move any check-ins off the
  // legacy row onto its canonical twin (same startTime + classType) and delete
  // the duplicate. No-op once the data is clean (legacy set is empty).
  await mergeLegacySessions(tx, stats);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await tx.studioConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      lastImportAt: new Date(),
      dataThroughDate: today,
    },
    update: {
      lastImportAt: new Date(),
      dataThroughDate: today,
    },
  });

  return stats;
}

type SessionTx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

/**
 * Collapse legacy `mt-class-NNNN` reservation sessions into their canonical
 * `mt-powell|…` twin (matched on identical startTime + classType). Check-ins
 * are re-pointed at the twin, then the duplicate session is deleted (its
 * lineups cascade). Idempotent: once there are no `mt-class-` rows it does
 * nothing. A legacy row with no twin (e.g. a class that never got a utilization
 * row) is left untouched.
 */
async function mergeLegacySessions(tx: SessionTx, stats: MarianaImportStats) {
  const legacy = await tx.classSession.findMany({
    where: { id: { startsWith: "mt-class-" } },
    select: { id: true, startTime: true, classType: true },
  });
  if (legacy.length === 0) return;

  const canonical = await tx.classSession.findMany({
    where: { id: { startsWith: "mt-powell|" } },
    select: { id: true, startTime: true, classType: true },
  });
  const twinByKey = new Map(
    canonical.map((s) => [`${s.startTime.getTime()}|${s.classType}`, s.id])
  );

  for (const ls of legacy) {
    const twinId = twinByKey.get(`${ls.startTime.getTime()}|${ls.classType}`);
    if (!twinId || twinId === ls.id) continue;
    await tx.checkIn.updateMany({
      where: { classSessionId: ls.id },
      data: { classSessionId: twinId },
    });
    await tx.classSession.delete({ where: { id: ls.id } });
    stats.legacySessionsMerged++;
  }
}

async function importGenericMembers(
  tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">,
  rows: Record<string, string>[],
  stats: MarianaImportStats,
  isBlocklisted: (memberId: string) => boolean
) {
  for (const r of rows) {
    const id = pick(r, "id", "customer_id");
    const first = pick(r, "first_name", "firstName");
    if (!id || !first) continue;
    let lastInitial = pick(r, "last_initial", "lastInitial");
    const lastName = pick(r, "last_name", "lastName");
    if (!lastInitial && lastName) lastInitial = lastName[0]?.toUpperCase() ?? "";
    const blocklisted =
      parseBool(pick(r, "opt_out", "optOut")) || isBlocklisted(id);
    await tx.member.upsert({
      where: { id },
      create: {
        id,
        firstName: first,
        lastInitial: lastInitial || null,
        email: pick(r, "email") || null,
        memberSinceDate: parseDate(pick(r, "member_since", "memberSince")),
        birthday: parseDate(pick(r, "birthday", "birth_date")),
        optOutFlag: blocklisted,
        lifetimeClassCount:
          parseInt(pick(r, "lifetime_class_count", "lifetimeClassCount"), 10) || 0,
      },
      update: {
        firstName: first,
        lastInitial: lastInitial || null,
        email: pick(r, "email") || null,
        memberSinceDate: parseDate(pick(r, "member_since", "memberSince")),
        birthday: parseDate(pick(r, "birthday", "birth_date")),
        optOutFlag: blocklisted,
        lifetimeClassCount:
          parseInt(pick(r, "lifetime_class_count", "lifetimeClassCount"), 10) || 0,
      },
    });
    stats.members++;
  }
}

async function importGenericSessions(
  tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">,
  rows: Record<string, string>[],
  stats: MarianaImportStats
) {
  for (const r of rows) {
    const id = pick(r, "id");
    const classType = pick(r, "class_type", "classType", "class_name");
    const start = parseDate(pick(r, "start_time", "startTime"));
    if (!id || !classType || !start) continue;
    if (!isOnOrBeforeToday(start)) {
      stats.sessionsSkippedFuture++;
      continue;
    }
    await tx.classSession.upsert({
      where: { id },
      create: {
        id,
        classType,
        instructorName: pick(r, "instructor_name", "instructorName") || null,
        classroomName: pick(r, "classroom_name", "classroomName") || null,
        startTime: start,
        capacity: parseInt(pick(r, "capacity"), 10) || null,
        availableSpots: parseInt(pick(r, "available_spots", "availableSpots"), 10) || null,
      },
      update: {
        classType,
        instructorName: pick(r, "instructor_name", "instructorName") || null,
        classroomName: pick(r, "classroom_name", "classroomName") || null,
        startTime: start,
        capacity: parseInt(pick(r, "capacity"), 10) || null,
        availableSpots: parseInt(pick(r, "available_spots", "availableSpots"), 10) || null,
      },
    });
    stats.sessions++;
  }
}

async function importGenericCheckIns(
  tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">,
  rows: Record<string, string>[],
  stats: MarianaImportStats
) {
  for (const r of rows) {
    const id = pick(r, "id");
    const memberId = pick(r, "member_id", "memberId", "user_id");
    const sessionId = pick(r, "class_session_id", "classSessionId");
    const at = parseDate(pick(r, "checked_in_at", "checkedInAt"));
    if (!id || !memberId || !sessionId || !at) continue;
    await tx.checkIn.upsert({
      where: { id },
      create: {
        id,
        memberId,
        classSessionId: sessionId,
        checkedInAt: at,
        isGuest: parseBool(pick(r, "is_guest", "isGuest")),
        guestFirstName: pick(r, "guest_first_name", "guestFirstName") || null,
      },
      update: {
        memberId,
        classSessionId: sessionId,
        checkedInAt: at,
        isGuest: parseBool(pick(r, "is_guest", "isGuest")),
        guestFirstName: pick(r, "guest_first_name", "guestFirstName") || null,
      },
    });
    stats.checkIns++;
  }
}
