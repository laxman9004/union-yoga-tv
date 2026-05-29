import type { PrismaClient } from "@/app/generated/prisma/client";

/** How much check-in / class history to replicate to Turso (TV + admin). */
const SYNC_WINDOW_DAYS = 14;
const CONCURRENCY = 4;
const MAX_RETRIES = 5;

function syncWindowStart(): Date {
  const d = new Date();
  d.setDate(d.getDate() - SYNC_WINDOW_DAYS);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt === MAX_RETRIES) throw err;
      const wait = attempt * 2000;
      console.warn(`\n  ${label}: retry ${attempt}/${MAX_RETRIES} (${msg}) — waiting ${wait / 1000}s`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error("unreachable");
}

async function runPool<T>(
  label: string,
  items: T[],
  fn: (item: T) => Promise<unknown>
): Promise<void> {
  if (!items.length) {
    console.log(`  ${label}: none`);
    return;
  }

  let index = 0;
  let done = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      await withRetry(label, () => fn(items[i]) as Promise<unknown>);
      done++;
      if (done % 50 === 0 || done === items.length) {
        process.stdout.write(`\r  ${label}: ${done}/${items.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  process.stdout.write("\n");
}

export async function pushImportedDataToTurso(
  local: PrismaClient,
  remote: PrismaClient
): Promise<void> {
  const since = syncWindowStart();
  console.log(`Pushing to Turso (members + last ${SYNC_WINDOW_DAYS} days) …`);

  const members = await local.member.findMany();
  await runPool("members", members, (m) =>
    remote.member.upsert({
      where: { id: m.id },
      create: {
        id: m.id,
        firstName: m.firstName,
        lastInitial: m.lastInitial,
        email: m.email,
        memberSinceDate: m.memberSinceDate,
        birthday: m.birthday,
        optOutFlag: m.optOutFlag,
        lifetimeClassCount: m.lifetimeClassCount,
        checkInsPeriod: m.checkInsPeriod,
        checkIns1Week: m.checkIns1Week,
        checkIns1Month: m.checkIns1Month,
        lastCheckInAt: m.lastCheckInAt,
        referralCount: m.referralCount,
      },
      update: {
        firstName: m.firstName,
        lastInitial: m.lastInitial,
        email: m.email,
        memberSinceDate: m.memberSinceDate,
        birthday: m.birthday,
        optOutFlag: m.optOutFlag,
        lifetimeClassCount: m.lifetimeClassCount,
        checkInsPeriod: m.checkInsPeriod,
        checkIns1Week: m.checkIns1Week,
        checkIns1Month: m.checkIns1Month,
        lastCheckInAt: m.lastCheckInAt,
        referralCount: m.referralCount,
      },
    })
  );

  const sessions = await local.classSession.findMany({
    where: { startTime: { gte: since } },
  });
  await runPool("classes", sessions, (s) =>
    remote.classSession.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        classType: s.classType,
        instructorName: s.instructorName,
        classroomName: s.classroomName,
        startTime: s.startTime,
        endTime: s.endTime,
        capacity: s.capacity,
        availableSpots: s.availableSpots,
        waitlistCount: s.waitlistCount,
        checkedInCount: s.checkedInCount,
        utilizationPercent: s.utilizationPercent,
      },
      update: {
        classType: s.classType,
        instructorName: s.instructorName,
        classroomName: s.classroomName,
        startTime: s.startTime,
        endTime: s.endTime,
        capacity: s.capacity,
        availableSpots: s.availableSpots,
        waitlistCount: s.waitlistCount,
        checkedInCount: s.checkedInCount,
        utilizationPercent: s.utilizationPercent,
      },
    })
  );

  const checkIns = await local.checkIn.findMany({
    where: { checkedInAt: { gte: since } },
  });
  await runPool("check-ins", checkIns, (c) =>
    remote.checkIn.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        memberId: c.memberId,
        classSessionId: c.classSessionId,
        checkedInAt: c.checkedInAt,
        isGuest: c.isGuest,
        guestFirstName: c.guestFirstName,
      },
      update: {
        memberId: c.memberId,
        classSessionId: c.classSessionId,
        checkedInAt: c.checkedInAt,
        isGuest: c.isGuest,
        guestFirstName: c.guestFirstName,
      },
    })
  );

  const config = await local.studioConfig.findUnique({ where: { id: 1 } });
  if (config) {
    await withRetry("studio config", () =>
      remote.studioConfig.upsert({
        where: { id: 1 },
        create: {
          id: 1,
          studioAnniversaryDate: config.studioAnniversaryDate,
          lastImportAt: config.lastImportAt,
          dataThroughDate: config.dataThroughDate,
        },
        update: {
          lastImportAt: config.lastImportAt,
          dataThroughDate: config.dataThroughDate,
        },
      })
    );
    console.log("  studio config: updated");
  }
}
