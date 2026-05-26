import { buildFrameSnapshot } from "@/lib/data/snapshot";
import type { FrameSnapshot } from "@/lib/data/snapshot-types";
import { DisplayRotator } from "./DisplayRotator";

export const dynamic = "force-dynamic";

function emptySnapshot(): FrameSnapshot {
  const now = new Date().toISOString();
  return {
    asOf: now,
    dataThrough: null,
    topThisWeek: [],
    nearMilestones: [],
    popularClassThisWeek: null,
    todaysCheckIns: [],
    memberCount: 0,
    checkInCount: 0,
    publishedCopy: {
      sweatForecast: null,
      classPersonality: null,
      reverseTestimonials: [],
    },
    upcomingClass: null,
    weekStreakHonorees: [],
    birthdaysToday: [],
    guestCheckInsToday: [],
    firstTimersToday: [],
    instructorOfWeek: null,
    studioAnniversary: null,
    milestonesHitToday: [],
  };
}

export default async function DisplayPage() {
  let snapshot: FrameSnapshot;
  try {
    snapshot = await buildFrameSnapshot();
  } catch {
    snapshot = emptySnapshot();
  }
  return <DisplayRotator snapshot={snapshot} />;
}

