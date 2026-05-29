/** Studio-local date helpers (America/New_York for MT exports). */

/**
 * The studio's wall-clock timezone. ALL "what day is it" math must be anchored
 * here, not the server's local timezone — the player PC runs in EDT but Netlify
 * runs in UTC, and a server-local day window on Netlify is shifted 4–5h and
 * only catches late-night classes (the "only one class on Turso" bug).
 */
export const STUDIO_TIME_ZONE = "America/New_York";

type WallClockParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
};

/** Decompose an instant into its wall-clock parts in `timeZone`. */
function partsInTimeZone(date: Date, timeZone: string): WallClockParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0; // some runtimes emit "24" for midnight
  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour,
    minute: parseInt(map.minute, 10),
    second: parseInt(map.second, 10),
  };
}

/** Offset (ms) of `timeZone` relative to UTC at the given instant. */
function tzOffsetMs(date: Date, timeZone: string): number {
  const p = partsInTimeZone(date, timeZone);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUTC - date.getTime();
}

/**
 * UTC instant for a wall-clock time interpreted in the studio timezone.
 * Use this anywhere import code would otherwise call `new Date(y, m, d, ...)`,
 * so parsed dates are correct no matter which timezone the server runs in.
 */
export function studioLocalDate(
  year: number,
  month: number, // 1-12
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0
): Date {
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  // Probe the offset with a millisecond-free instant: Intl only resolves to
  // whole seconds, so subtracting against a value carrying ms skews the result.
  const probe = Date.UTC(year, month - 1, day, hour, minute, second, 0);
  const offset = tzOffsetMs(new Date(probe), STUDIO_TIME_ZONE);
  return new Date(naiveUtc - offset);
}

/** Start of "today" in the studio timezone, as a UTC instant. */
export function studioDayStart(now: Date = new Date()): Date {
  const p = partsInTimeZone(now, STUDIO_TIME_ZONE);
  return studioLocalDate(p.year, p.month, p.day, 0, 0, 0, 0);
}

/** End of "today" (23:59:59.999) in the studio timezone, as a UTC instant. */
export function studioDayEnd(now: Date = new Date()): Date {
  const p = partsInTimeZone(now, STUDIO_TIME_ZONE);
  return studioLocalDate(p.year, p.month, p.day, 23, 59, 59, 999);
}

/** Calendar month (1-12) and day for an instant, in the studio timezone. */
export function studioMonthDay(date: Date): { month: number; day: number } {
  const p = partsInTimeZone(date, STUDIO_TIME_ZONE);
  return { month: p.month, day: p.day };
}

/** Calendar year, month (1-12), and day for an instant, in the studio timezone. */
export function studioYmd(date: Date): { year: number; month: number; day: number } {
  const p = partsInTimeZone(date, STUDIO_TIME_ZONE);
  return { year: p.year, month: p.month, day: p.day };
}

/** YYYY-MM-DD key for an instant's studio-local calendar day. */
export function studioDayKey(date: Date): string {
  const { year, month, day } = studioYmd(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function isOnOrBeforeToday(d: Date): boolean {
  return d.getTime() <= studioDayEnd().getTime();
}

/**
 * True when `birthday` falls on the same calendar month/day as `now`, compared
 * in the studio timezone. Birthdays are stored as studio-midnight Dates by
 * parseMtDate; a UTC (or server-local on Netlify) comparison shifts the day and
 * lights up a birthday a day early/late.
 */
export function isSameMonthDayLocal(birthday: Date | null, now: Date): boolean {
  if (!birthday) return false;
  const b = studioMonthDay(birthday);
  const n = studioMonthDay(now);
  return b.month === n.month && b.day === n.day;
}

export function parseMtDate(value: string): Date | null {
  if (!value?.trim()) return null;
  const s = value.trim();
  for (const fmt of ["%m/%d/%Y", "%m/%d/%y", "%Y-%m-%d"] as const) {
    const d = parseWithFormat(s, fmt);
    if (d) return d;
  }
  const fallback = new Date(s);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function parseWithFormat(s: string, fmt: string): Date | null {
  if (fmt === "%m/%d/%Y" || fmt === "%m/%d/%y") {
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (!m) return null;
    let year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
    const month = parseInt(m[1], 10); // 1-12
    const day = parseInt(m[2], 10);
    const d = studioLocalDate(year, month, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (fmt === "%Y-%m-%d") {
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return studioLocalDate(parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10));
  }
  return null;
}

/** Combine MT `4/3/2026` + `7:00 AM` into one studio-local Date. */
export function combineClassDateTime(dateStr: string, timeStr: string): Date | null {
  const base = parseMtDate(dateStr);
  if (!base) return null;
  const t = timeStr?.trim();
  if (!t) return base;

  const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return base;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  const { month, day } = studioMonthDay(base);
  const year = partsInTimeZone(base, STUDIO_TIME_ZONE).year;
  return studioLocalDate(year, month, day, hours, minutes, 0, 0);
}

export function syntheticSessionId(
  location: string,
  dateStr: string,
  timeStr: string,
  classType: string
): string {
  const slug = [location, dateStr, timeStr, classType]
    .join("|")
    .toLowerCase()
    .replace(/[^a-z0-9|]+/g, "-")
    .replace(/-+/g, "-");
  return `mt-${slug}`.slice(0, 120);
}
