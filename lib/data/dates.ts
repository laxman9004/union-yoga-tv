/** Studio-local date helpers (America/New_York assumed for MT exports). */

export function startOfTodayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}

export function endOfTodayLocal(): Date {
  return startOfTodayLocal();
}

export function isOnOrBeforeToday(d: Date): boolean {
  const t = new Date();
  const todayEnd = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59, 999);
  return d.getTime() <= todayEnd.getTime();
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
    const month = parseInt(m[1], 10) - 1;
    const day = parseInt(m[2], 10);
    const d = new Date(year, month, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (fmt === "%Y-%m-%d") {
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  }
  return null;
}

/** Combine MT `4/3/2026` + `7:00 AM` into one Date (local). */
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

  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    hours,
    minutes,
    0,
    0
  );
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
