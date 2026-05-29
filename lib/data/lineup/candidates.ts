import { milestones } from "@/lib/brand/tokens";
import { isSameMonthDayLocal } from "../dates";
import type { LineupCandidateItem } from "./types";

const STREAK_WEEKS = [4, 8, 12, 26, 52];

function name(first: string, last: string | null) {
  return `${first}${last ? ` ${last}.` : ""}`;
}

function itemKey(classSessionId: string, sceneKey: string, suffix: string) {
  return `${classSessionId}:${sceneKey}:${suffix}`;
}

type MemberRow = {
  id: string;
  firstName: string;
  lastInitial: string | null;
  lifetimeClassCount: number;
  birthday: Date | null;
  checkIns1Week: number | null;
  optOutFlag: boolean;
};

type CheckInRow = {
  isGuest: boolean;
  guestFirstName: string | null;
  member: MemberRow;
};

export function buildClassLineupItems(opts: {
  classSessionId: string;
  classType: string;
  instructorName: string | null;
  checkIns: CheckInRow[];
  now: Date;
}): LineupCandidateItem[] {
  const items: LineupCandidateItem[] = [];
  let order = 0;

  const members = opts.checkIns.filter((c) => !c.isGuest && !c.member.optOutFlag);
  const guests = opts.checkIns.filter((c) => c.isGuest);
  let firstTimerCount = 0;
  let regularCount = 0;
  for (const c of members) {
    if (c.member.lifetimeClassCount <= 3) firstTimerCount++;
    else regularCount++;
  }

  items.push({
    itemKey: itemKey(opts.classSessionId, "room-overview", "class"),
    sceneKey: "room-overview",
    category: "class",
    headline: "Room snapshot",
    subline: `${regularCount} regulars · ${firstTimerCount} newer · ${members.length} checked in`,
    defaultEnabled: true,
    sortOrder: order++,
    payload: {
      classType: opts.classType,
      instructorName: opts.instructorName,
      regularCount,
      firstTimerCount,
      checkedInCount: members.length,
    },
  });

  for (const c of members) {
    const m = c.member;
    const display = name(m.firstName, m.lastInitial);

    if (m.lifetimeClassCount <= 1) {
      items.push({
        itemKey: itemKey(opts.classSessionId, "welcome-first", m.id),
        sceneKey: "welcome-first",
        category: "student",
        headline: `First class — ${display}`,
        subline:
          m.lifetimeClassCount === 0
            ? "Brand new to the studio"
            : "Early visits — still finding their mat",
        defaultEnabled: true,
        sortOrder: order++,
        payload: {
          firstName: m.firstName,
          lastInitial: m.lastInitial,
          lifetimeClassCount: m.lifetimeClassCount,
          classType: opts.classType,
        },
      });
      continue;
    }

    items.push({
      itemKey: itemKey(opts.classSessionId, "welcome-returning", m.id),
      sceneKey: "welcome-returning",
      category: "student",
      headline: `Welcome back — ${display}`,
      subline: `Class #${m.lifetimeClassCount}${opts.instructorName ? ` · ${opts.instructorName}` : ""}`,
      defaultEnabled: m.lifetimeClassCount >= 2,
      sortOrder: order++,
      payload: {
        firstName: m.firstName,
        lastInitial: m.lastInitial,
        lifetimeClassCount: m.lifetimeClassCount,
        classType: opts.classType,
        instructorName: opts.instructorName,
      },
    });

    if (isSameMonthDayLocal(m.birthday, opts.now)) {
      items.push({
        itemKey: itemKey(opts.classSessionId, "birthday", m.id),
        sceneKey: "birthday",
        category: "student",
        headline: `Birthday — ${display}`,
        subline: "In the room today",
        defaultEnabled: true,
        sortOrder: order++,
        payload: {
          firstName: m.firstName,
          lastInitial: m.lastInitial,
        },
      });
    }

    if (m.checkIns1Week && STREAK_WEEKS.includes(m.checkIns1Week)) {
      items.push({
        itemKey: itemKey(opts.classSessionId, "streak", m.id),
        sceneKey: "streak",
        category: "student",
        headline: `Streak — ${display}`,
        subline: `${m.checkIns1Week} classes this week`,
        defaultEnabled: true,
        sortOrder: order++,
        payload: {
          firstName: m.firstName,
          lastInitial: m.lastInitial,
          checkIns1Week: m.checkIns1Week,
        },
      });
    }

    for (const target of milestones) {
      const until = target - m.lifetimeClassCount;
      if (until >= 0 && until <= 2) {
        items.push({
          itemKey: itemKey(opts.classSessionId, "milestone", `${m.id}-${target}`),
          sceneKey: "milestone",
          category: "student",
          headline:
            until === 0
              ? `Milestone — ${display}`
              : `Almost there — ${display}`,
          subline:
            until === 0
              ? `Hit class #${target} today`
              : `${until} away from class #${target} (${m.lifetimeClassCount} so far)`,
          defaultEnabled: true,
          sortOrder: order++,
          payload: {
            firstName: m.firstName,
            lastInitial: m.lastInitial,
            lifetimeClassCount: m.lifetimeClassCount,
            target,
            classesUntil: until,
          },
        });
        break;
      }
    }
  }

  for (const g of guests) {
    const host = g.member.optOutFlag
      ? "A member"
      : name(g.member.firstName, g.member.lastInitial);
    const guest = g.guestFirstName ?? "Guest";
    items.push({
      itemKey: itemKey(opts.classSessionId, "bring-a-friend", guest),
      sceneKey: "bring-a-friend",
      category: "student",
      headline: `Guest — ${guest}`,
      subline: `Checked in with ${host}`,
      defaultEnabled: true,
      sortOrder: order++,
      payload: {
        guestFirstName: g.guestFirstName,
        hostFirstName: g.member.optOutFlag ? "A member" : g.member.firstName,
        hostLastInitial: g.member.optOutFlag ? null : g.member.lastInitial,
      },
    });
  }

  return items;
}
