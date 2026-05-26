import { prisma } from "@/lib/db/client";
import { brand, milestones } from "@/lib/brand/tokens";
import { getPublishedCopyForDisplay } from "./published-copy";
import type {
  FrameSnapshot,
  LeaderboardEntry,
  MilestoneEntry,
  StreakHonoree,
  StudioAnniversary,
  UpcomingClass,
} from "./snapshot-types";

export type {
  FrameSnapshot,
  LeaderboardEntry,
  MilestoneEntry,
  PublishedCopy,
} from "./snapshot-types";
export { formatAsOfLine } from "./snapshot-types";

const STREAK_WEEKS = [4, 8, 12, 26, 52];

function displayName(
  firstName: string,
  lastInitial: string | null,
  optOut: boolean
): { firstName: string; lastInitial: string | null } {
  if (optOut) return { firstName: "A member", lastInitial: null };
  return { firstName, lastInitial };
}

function isBirthdayToday(birthday: Date | null, now: Date): boolean {
  if (!birthday) return false;
  return (
    birthday.getUTCMonth() === now.getUTCMonth() &&
    birthday.getUTCDate() === now.getUTCDate()
  );
}

function buildStudioAnniversary(now: Date): StudioAnniversary | null {
  const open = brand.studioAnniversary;
  const thisYear = new Date(now.getFullYear(), open.getMonth(), open.getDate());
  const msDay = 86400000;
  const diffDays = Math.round((now.getTime() - thisYear.getTime()) / msDay);

  if (diffDays >= 0 && diffDays <= 6) {
    return {
      label: diffDays === 0 ? "Studio anniversary" : "Anniversary week",
      detail:
        diffDays === 0
          ? "One year in Powell — still heating the room."
          : `Day ${diffDays + 1} of anniversary week.`,
    };
  }
  const daysSinceOpen = Math.floor(
    (now.getTime() - open.getTime()) / msDay
  );
  if (daysSinceOpen > 0 && daysSinceOpen % 100 < 7) {
    return {
      label: `${daysSinceOpen} days`,
      detail: "Since we opened the doors on Jan 3.",
    };
  }
  return null;
}

export async function buildFrameSnapshot(): Promise<FrameSnapshot> {
  const config = await prisma.studioConfig.findUnique({ where: { id: 1 } });
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const inFourHours = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  const [
    memberCount,
    checkInCount,
    weekGroups,
    members,
    sessionsWeek,
    todayCheckIns,
    publishedCopy,
    upcomingSession,
    birthdayMembers,
    weekSessions,
  ] = await Promise.all([
    prisma.member.count(),
    prisma.checkIn.count(),
    prisma.checkIn.groupBy({
      by: ["memberId"],
      where: {
        checkedInAt: { gte: weekAgo, lte: now },
        member: { optOutFlag: false },
      },
      _count: { id: true },
    }),
    prisma.member.findMany({
      where: { optOutFlag: false, lifetimeClassCount: { gt: 0 } },
      select: {
        id: true,
        firstName: true,
        lastInitial: true,
        lifetimeClassCount: true,
        optOutFlag: true,
        birthday: true,
        checkIns1Week: true,
      },
    }),
    prisma.classSession.findMany({
      where: { startTime: { gte: weekAgo, lte: now } },
      select: { classType: true, instructorName: true },
    }),
    prisma.checkIn.findMany({
      where: { checkedInAt: { gte: todayStart } },
      include: { member: true, classSession: true },
      orderBy: { checkedInAt: "desc" },
      take: 40,
    }),
    getPublishedCopyForDisplay(),
    prisma.classSession.findFirst({
      where: { startTime: { gte: now, lte: inFourHours } },
      orderBy: { startTime: "asc" },
    }),
    prisma.member.findMany({
      where: { optOutFlag: false, birthday: { not: null } },
      select: { firstName: true, lastInitial: true, birthday: true, optOutFlag: true },
    }),
    prisma.classSession.findMany({
      where: {
        startTime: { gte: weekAgo, lte: now },
        instructorName: { not: null },
      },
      select: { instructorName: true },
    }),
  ]);

  const topGroups = [...weekGroups]
    .sort((a, b) => b._count.id - a._count.id)
    .slice(0, 10);
  const topMemberIds = topGroups.map((g) => g.memberId);
  const topMembers = await prisma.member.findMany({
    where: { id: { in: topMemberIds }, optOutFlag: false },
  });
  const topMemberMap = new Map(topMembers.map((m) => [m.id, m]));

  const topThisWeek: LeaderboardEntry[] = [];
  for (const g of topGroups) {
    const m = topMemberMap.get(g.memberId);
    if (!m) continue;
    topThisWeek.push({
      memberId: g.memberId,
      firstName: m.firstName,
      lastInitial: m.lastInitial,
      count: g._count.id,
    });
  }

  const nearMilestones: MilestoneEntry[] = [];
  for (const m of members) {
    for (const target of milestones) {
      const until = target - m.lifetimeClassCount;
      if (until >= 0 && until <= 2) {
        const d = displayName(m.firstName, m.lastInitial, m.optOutFlag);
        nearMilestones.push({
          memberId: m.id,
          firstName: d.firstName,
          lastInitial: d.lastInitial,
          lifetimeClassCount: m.lifetimeClassCount,
          target,
          classesUntil: until,
        });
        break;
      }
    }
  }
  nearMilestones.sort((a, b) => a.classesUntil - b.classesUntil);
  nearMilestones.splice(8);

  const milestonesHitToday = nearMilestones.filter((m) => m.classesUntil === 0);

  const classCounts = new Map<string, number>();
  for (const s of sessionsWeek) {
    classCounts.set(s.classType, (classCounts.get(s.classType) ?? 0) + 1);
  }
  let popularClassThisWeek: { classType: string; count: number } | null = null;
  for (const [classType, count] of classCounts) {
    if (!popularClassThisWeek || count > popularClassThisWeek.count) {
      popularClassThisWeek = { classType, count };
    }
  }

  const todaysCheckIns = todayCheckIns
    .filter((c) => !c.member.optOutFlag && !c.isGuest)
    .map((c) => {
      const d = displayName(c.member.firstName, c.member.lastInitial, false);
      return {
        firstName: d.firstName,
        lastInitial: d.lastInitial,
        classType: c.classSession.classType,
        instructorName: c.classSession.instructorName,
        lifetimeClassCount: c.member.lifetimeClassCount,
      };
    });

  const todayMemberIds = new Set(
    todayCheckIns.filter((c) => !c.isGuest).map((c) => c.memberId)
  );

  const weekStreakHonorees: StreakHonoree[] = [];
  for (const m of members) {
    if (!m.checkIns1Week || !STREAK_WEEKS.includes(m.checkIns1Week)) continue;
    if (!todayMemberIds.has(m.id)) continue;
    const d = displayName(m.firstName, m.lastInitial, m.optOutFlag);
    weekStreakHonorees.push({
      firstName: d.firstName,
      lastInitial: d.lastInitial,
      checkIns1Week: m.checkIns1Week,
    });
  }

  const birthdaysToday = birthdayMembers
    .filter((m) => isBirthdayToday(m.birthday, now))
    .map((m) => {
      const d = displayName(m.firstName, m.lastInitial, m.optOutFlag);
      return { firstName: d.firstName, lastInitial: d.lastInitial };
    });

  const guestCheckInsToday = todayCheckIns
    .filter((c) => c.isGuest)
    .map((c) => {
      const host = displayName(
        c.member.firstName,
        c.member.lastInitial,
        c.member.optOutFlag
      );
      return {
        guestFirstName: c.guestFirstName,
        hostFirstName: host.firstName,
        hostLastInitial: host.lastInitial,
      };
    });

  const firstTimersToday = todayCheckIns
    .filter((c) => !c.isGuest && !c.member.optOutFlag && c.member.lifetimeClassCount <= 1)
    .map((c) => {
      const d = displayName(c.member.firstName, c.member.lastInitial, false);
      return {
        firstName: d.firstName,
        lastInitial: d.lastInitial,
        classType: c.classSession.classType,
        lifetimeClassCount: c.member.lifetimeClassCount,
      };
    });

  let upcomingClass: UpcomingClass | null = null;
  if (upcomingSession) {
    const sessionCheckIns = todayCheckIns.filter(
      (c) => c.classSessionId === upcomingSession.id && !c.isGuest
    );
    let firstTimerCount = 0;
    let regularCount = 0;
    for (const c of sessionCheckIns) {
      if (c.member.lifetimeClassCount <= 3) firstTimerCount++;
      else regularCount++;
    }
    upcomingClass = {
      sessionId: upcomingSession.id,
      classType: upcomingSession.classType,
      instructorName: upcomingSession.instructorName,
      startTime: upcomingSession.startTime.toISOString(),
      checkedInCount: sessionCheckIns.length,
      firstTimerCount,
      regularCount,
    };
  }

  const instructorCounts = new Map<string, number>();
  for (const s of weekSessions) {
    const name = s.instructorName?.trim();
    if (!name) continue;
    instructorCounts.set(name, (instructorCounts.get(name) ?? 0) + 1);
  }
  let instructorOfWeek: { name: string; sessionCount: number } | null = null;
  for (const [name, sessionCount] of instructorCounts) {
    if (!instructorOfWeek || sessionCount > instructorOfWeek.sessionCount) {
      instructorOfWeek = { name, sessionCount };
    }
  }

  return {
    asOf: now.toISOString(),
    dataThrough: config?.dataThroughDate?.toISOString().slice(0, 10) ?? null,
    topThisWeek,
    nearMilestones,
    popularClassThisWeek,
    todaysCheckIns,
    memberCount,
    checkInCount,
    publishedCopy,
    upcomingClass,
    weekStreakHonorees,
    birthdaysToday,
    guestCheckInsToday,
    firstTimersToday,
    instructorOfWeek,
    studioAnniversary: buildStudioAnniversary(now),
    milestonesHitToday,
  };
}
