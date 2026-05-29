export const LINEUP_SCENE_KEYS = [
  "room-overview",
  "welcome-returning",
  "welcome-first",
  "birthday",
  "bring-a-friend",
  "streak",
  "milestone",
] as const;

export type LineupSceneKey = (typeof LINEUP_SCENE_KEYS)[number];

export type LineupItemCategory = "class" | "student";

export type LineupCandidateItem = {
  itemKey: string;
  sceneKey: LineupSceneKey;
  category: LineupItemCategory;
  headline: string;
  subline: string;
  defaultEnabled: boolean;
  sortOrder: number;
  payload: Record<string, unknown>;
};

export type ClassLineupCandidate = {
  classSessionId: string;
  classType: string;
  instructorName: string | null;
  startTime: string;
  endTime: string | null;
  checkedInCount: number;
  firstTimerCount: number;
  regularCount: number;
  items: LineupCandidateItem[];
};

export type LineupAdminItem = LineupCandidateItem & { enabled: boolean };

export type LineupAdminClass = Omit<ClassLineupCandidate, "items"> & {
  lineupId: string | null;
  status: "draft" | "published" | "new";
  items: LineupAdminItem[];
};

export type LineupAdminDay = {
  validFor: string;
  classes: LineupAdminClass[];
  lastPublishedAt: string | null;
};

export type LineupDisplayItem = {
  itemKey: string;
  sceneKey: LineupSceneKey;
  headline: string;
  subline: string;
  payload: Record<string, unknown>;
};

export type DisplayLineupState = {
  mode: "class" | "ambient";
  activeClass: {
    classSessionId: string;
    classType: string;
    instructorName: string | null;
    startTime: string;
    windowLabel: string;
  } | null;
  items: LineupDisplayItem[];
};

/** Minutes before class start when lobby scenes begin. */
export const PRE_CLASS_MINUTES = 45;
/** Default class length when end time is unknown. */
export const DEFAULT_CLASS_MINUTES = 60;
/** Minutes after class end (or estimated end) to keep class scenes. */
export const POST_CLASS_MINUTES = 10;

export const SCENE_LABELS: Record<LineupSceneKey, string> = {
  "room-overview": "Room snapshot",
  "welcome-returning": "Welcome back",
  "welcome-first": "First class",
  birthday: "Birthday",
  "bring-a-friend": "Guest / bring a friend",
  streak: "Weekly streak",
  milestone: "Milestone",
};
