import type { PrismaClient } from "@/app/generated/prisma/client";
import { parseBool, parseCsv, parseDate, pick } from "../csv";
import {
  combineClassDateTime,
  isOnOrBeforeToday,
  parseMtDate,
  syntheticSessionId,
} from "../dates";
import {
  MT,
  isCheckedInStatus,
  marianaClassSessionId,
  parsePersonName,
} from "./fields";
import type { MarianaFileKind } from "./types";

export type MarianaImportStats = {
  members: number;
  sessions: number;
  checkIns: number;
  frequencyUpdates: number;
  birthdayUpdates: number;
  sessionsSkippedFuture: number;
  orderRowsIgnored: number;
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
  };

  const byKind = (k: MarianaFileKind) =>
    files.filter((f) => f.kind === k).flatMap((f) => f.rows);

  // 1. Customers – Details
  for (const r of byKind("customers_details")) {
    const id = MT.customerId(r);
    const first = MT.firstName(r);
    if (!id || !first) continue;

    const lastName = MT.lastName(r);
    const lastInitial = lastName ? lastName[0].toUpperCase() : null;
    const blocklisted = await tx.nameBlocklist.findUnique({
      where: { memberId: id },
    });

    await tx.member.upsert({
      where: { id },
      create: {
        id,
        firstName: first,
        lastInitial,
        email: MT.email(r) || null,
        memberSinceDate: parseMtDate(MT.joinDate(r)),
        birthday: parseMtDate(MT.birthDate(r)),
        optOutFlag: !!blocklisted,
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
        optOutFlag: !!blocklisted,
        lifetimeClassCount: MT.checkInsAllTime(r),
        checkIns1Week: MT.checkIns1Week(r),
        checkIns1Month: MT.checkIns1Month(r),
        lastCheckInAt: parseMtDate(MT.lastCheckIn(r)),
        referralCount: MT.guestCheckInsAllTime(r),
      },
    });
    stats.members++;
  }

  // 2. Customer Frequency (period check-ins for export window)
  for (const r of byKind("customer_frequency")) {
    const id = MT.freqCustomerId(r);
    if (!id) continue;
    const exists = await tx.member.findUnique({ where: { id } });
    if (!exists) continue;

    const period = parseInt(MT.freqCheckIns(r), 10) || 0;
    await tx.member.update({
      where: { id },
      data: {
        checkInsPeriod: period,
        lastCheckInAt:
          parseMtDate(MT.freqLastClass(r)) ?? exists.lastCheckInAt,
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

  // 4. Reservations -> members (stubs), class sessions, check-ins
  for (const r of byKind("reservations")) {
    if (!isCheckedInStatus(MT.reservationStatus(r))) continue;

    const resId = MT.reservationId(r);
    const memberId = MT.reservationCustomerId(r);
    const classId = MT.classId(r);
    if (!resId || !memberId || !classId) continue;

    const start = combineClassDateTime(
      MT.classStartDate(r),
      MT.classStartTime(r)
    );
    if (!start || !isOnOrBeforeToday(start)) continue;

    const sessionId = marianaClassSessionId(classId);
    const capacity =
      parseInt(MT.reservationClassCapacity(r), 10) ||
      parseInt(MT.reservationLayoutCapacity(r), 10) ||
      null;

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

    const existingMember = await tx.member.findUnique({ where: { id: memberId } });
    if (!existingMember) {
      const { firstName, lastInitial } = parsePersonName(
        MT.reservationCustomerName(r) || "Friend"
      );
      const blocklisted = await tx.nameBlocklist.findUnique({
        where: { memberId },
      });
      await tx.member.create({
        data: {
          id: memberId,
          firstName,
          lastInitial,
          email: MT.reservationCustomerEmail(r) || null,
          optOutFlag: !!blocklisted,
        },
      });
      stats.members++;
    }

    const isGuest = parseBool(MT.reservationGuest(r));
    const guestName = isGuest
      ? parsePersonName(MT.reservationCustomerName(r)).firstName
      : null;

    const blocklisted = await tx.nameBlocklist.findUnique({
      where: { memberId },
    });
    if (blocklisted) continue;

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
  await importGenericMembers(tx, byKind("generic_members"), stats);
  await importGenericSessions(tx, byKind("generic_class_sessions"), stats);
  await importGenericCheckIns(tx, byKind("generic_check_ins"), stats);

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

async function importGenericMembers(
  tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">,
  rows: Record<string, string>[],
  stats: MarianaImportStats
) {
  for (const r of rows) {
    const id = pick(r, "id", "customer_id");
    const first = pick(r, "first_name", "firstName");
    if (!id || !first) continue;
    let lastInitial = pick(r, "last_initial", "lastInitial");
    const lastName = pick(r, "last_name", "lastName");
    if (!lastInitial && lastName) lastInitial = lastName[0]?.toUpperCase() ?? "";
    const blocklisted = await tx.nameBlocklist.findUnique({
      where: { memberId: id },
    });
    await tx.member.upsert({
      where: { id },
      create: {
        id,
        firstName: first,
        lastInitial: lastInitial || null,
        email: pick(r, "email") || null,
        memberSinceDate: parseDate(pick(r, "member_since", "memberSince")),
        birthday: parseDate(pick(r, "birthday", "birth_date")),
        optOutFlag: parseBool(pick(r, "opt_out", "optOut")) || !!blocklisted,
        lifetimeClassCount:
          parseInt(pick(r, "lifetime_class_count", "lifetimeClassCount"), 10) || 0,
      },
      update: {
        firstName: first,
        lastInitial: lastInitial || null,
        email: pick(r, "email") || null,
        memberSinceDate: parseDate(pick(r, "member_since", "memberSince")),
        birthday: parseDate(pick(r, "birthday", "birth_date")),
        optOutFlag: parseBool(pick(r, "opt_out", "optOut")) || !!blocklisted,
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
