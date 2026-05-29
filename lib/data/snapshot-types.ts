export type LeaderboardEntry = {
  memberId: string;
  firstName: string;
  lastInitial: string | null;
  count: number;
};

export type MilestoneEntry = {
  memberId: string;
  firstName: string;
  lastInitial: string | null;
  lifetimeClassCount: number;
  target: number;
  classesUntil: number;
};

export type PublishedCopy = {
  sweatForecast: string | null;
  classPersonality: string | null;
  reverseTestimonials: string[];
};

export type UpcomingClass = {
  sessionId: string;
  classType: string;
  instructorName: string | null;
  startTime: string;
  checkedInCount: number;
  firstTimerCount: number;
  regularCount: number;
};

export type StreakHonoree = {
  firstName: string;
  lastInitial: string | null;
  checkIns1Week: number;
};

export type BirthdayToday = {
  firstName: string;
  lastInitial: string | null;
};

export type GuestCheckIn = {
  guestFirstName: string | null;
  hostFirstName: string | null;
  hostLastInitial: string | null;
};

export type FirstTimerToday = {
  firstName: string;
  lastInitial: string | null;
  classType: string;
  lifetimeClassCount: number;
};

export type InstructorOfWeek = {
  name: string;
  sessionCount: number;
};

export type StudioAnniversary = {
  label: string;
  detail: string;
};

import type { DisplayLineupState } from "@/lib/data/lineup/types";

export type { DisplayLineupState };

export type FrameSnapshot = {
  asOf: string;
  dataThrough: string | null;
  topThisWeek: LeaderboardEntry[];
  nearMilestones: MilestoneEntry[];
  popularClassThisWeek: { classType: string; count: number } | null;
  todaysCheckIns: Array<{
    firstName: string;
    lastInitial: string | null;
    classType: string;
    instructorName: string | null;
    lifetimeClassCount: number;
  }>;
  memberCount: number;
  checkInCount: number;
  publishedCopy: PublishedCopy;
  upcomingClass: UpcomingClass | null;
  weekStreakHonorees: StreakHonoree[];
  birthdaysToday: BirthdayToday[];
  guestCheckInsToday: GuestCheckIn[];
  firstTimersToday: FirstTimerToday[];
  instructorOfWeek: InstructorOfWeek | null;
  studioAnniversary: StudioAnniversary | null;
  milestonesHitToday: MilestoneEntry[];
  displayLineup: DisplayLineupState;
};

export function formatAsOfLine(snapshot: FrameSnapshot): string {
  if (snapshot.dataThrough) {
    return `As of ${snapshot.dataThrough}`;
  }
  return `As of ${new Date(snapshot.asOf).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}
