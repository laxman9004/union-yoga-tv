/**
 * Fetch the studio's class schedule from the Mariana Customer API.
 *
 * Why Customer API and not Admin? The Customer API exposes a documented
 * `min_start_date` / `max_start_date` filter that actually narrows the result
 * set. The Admin API (`/api/class_sessions`) silently drops unknown filter
 * params and we couldn't discover a working date filter via the public schema.
 * Customer API is sufficient for Stage 1 (schedule visibility) — capacity is
 * masked there (always 0), so callers that need real capacity should enrich
 * per-class via fetchAdminClassSession.
 */
import { combineClassDateTime, syntheticSessionId } from "../data/dates";
import { paginate, marianaFetch } from "./client";

export type ApiClass = {
  /** Mariana class instance id, e.g. "12118" — STRING in the API. */
  id: string;
  start_date: string; // "2026-05-29"
  start_time: string; // "07:00:00"
  start_datetime: string; // ISO instant, "2026-05-29T11:00:00Z"
  name: string;
  class_type: { id: string; name: string; duration: number };
  classroom_name: string | null;
  capacity: number; // masked in Customer API (often 0)
  is_cancelled: boolean;
  waitlist_count: number;
  status: string | null;
  instructors: Array<{ id: string; name: string }>;
  location: { id: string; name: string; timezone: string };
};

export type FetchClassesRange = {
  /** YYYY-MM-DD (studio-local). */
  minDate: string;
  /** YYYY-MM-DD (studio-local). */
  maxDate: string;
  /** Optional Mariana location id (filters server-side when provided). */
  locationId?: string;
  /** Include cancelled classes too (default: no). */
  includeCancelled?: boolean;
};

/**
 * Normalized shape ready for ClassSession upsert. Mirrors the columns the CSV
 * importer populates, so API-sourced rows merge cleanly with CSV-sourced rows.
 */
export type ClassRow = {
  /** Stable synthetic id; same key used by the CSV importer. */
  sessionId: string;
  classType: string;
  instructorName: string | null;
  classroomName: string | null;
  startTime: Date;
  endTime: Date | null;
  /** Source label, useful for logs / dual-running. */
  source: "mariana-api";
  /** Pass-through of the raw Mariana id for cross-referencing. */
  marianaId: string;
  isCancelled: boolean;
};

function parseHMS(t: string): { hours: number; minutes: number } {
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return { hours: 0, minutes: 0 };
  return { hours: parseInt(m[1], 10), minutes: parseInt(m[2], 10) };
}

function formatMDY(date: string): string {
  // "2026-05-29" -> "5/29/2026" (no leading zeros — matches CSV importer
  // shape so syntheticSessionId yields identical keys).
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return date;
  return `${parseInt(m[2], 10)}/${parseInt(m[3], 10)}/${m[1]}`;
}

function formatHMA(time: string): string {
  // "07:00:00" -> "7:00 AM". The synthetic ID slugifier collapses to "7-00-am".
  const { hours, minutes } = parseHMS(time);
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${String(minutes).padStart(2, "0")} ${ampm}`;
}

function instructorString(instructors: ApiClass["instructors"]): string | null {
  const names = instructors.map((i) => i.name.trim()).filter(Boolean);
  return names.length ? names.join(", ") : null;
}

/**
 * Convert a Customer API class row to the normalized ClassRow shape we upsert.
 * Returns null for cancelled classes when `includeCancelled === false`.
 */
export function toClassRow(c: ApiClass, includeCancelled: boolean): ClassRow | null {
  if (c.is_cancelled && !includeCancelled) return null;

  const dateStr = formatMDY(c.start_date);
  const timeStr = formatHMA(c.start_time);
  const start = combineClassDateTime(dateStr, timeStr);
  if (!start) return null;

  const durationMin = c.class_type?.duration ?? 0;
  const end = durationMin > 0 ? new Date(start.getTime() + durationMin * 60_000) : null;

  // Use the *generic* class type name (e.g. "Hot Union Power"), matching the
  // CSV importer's `MT.reservationClassType` — keeps lineup/copy matching
  // identical regardless of source. Variant names like "with Weights" are in
  // `name` but the CSV importer doesn't use them.
  const classType = c.class_type?.name?.trim() || c.name || "Class";
  const locationSlug = c.location?.name?.trim() || "powell";

  return {
    sessionId: syntheticSessionId(locationSlug, dateStr, timeStr, classType),
    classType,
    instructorName: instructorString(c.instructors),
    classroomName: c.classroom_name ?? null,
    startTime: start,
    endTime: end,
    source: "mariana-api",
    marianaId: c.id,
    isCancelled: c.is_cancelled,
  };
}

/**
 * Fetch every class in `[minDate, maxDate]`, paginated. Yields normalized rows
 * suitable for direct ClassSession upsert.
 */
export async function fetchClassesForRange(
  range: FetchClassesRange
): Promise<ClassRow[]> {
  const query: Record<string, string> = {
    min_start_date: range.minDate,
    max_start_date: range.maxDate,
  };
  if (range.locationId) query.location = range.locationId;

  const out: ClassRow[] = [];
  for await (const c of paginate<ApiClass>("/classes", {
    surface: "customer",
    query,
    pageSize: 100,
  })) {
    const row = toClassRow(c, range.includeCancelled ?? false);
    if (row) out.push(row);
  }
  return out;
}

/**
 * Optional: fetch a single class via the Admin API for fields the Customer API
 * masks (real `capacity`, `checked_in_user_count`, etc.). The Admin date filter
 * is unresolved, but `filter[id]` IS supported, so per-class enrichment works.
 */
export async function fetchAdminClassSession(marianaId: string): Promise<{
  capacity: number | null;
  checkedInCount: number | null;
  firstTimeCount: number | null;
  waitlistCount: number;
} | null> {
  type Resp = {
    data?: Array<{ id: string; attributes: Record<string, unknown> }>;
  };
  const res = await marianaFetch<Resp>("/class_sessions", {
    surface: "admin",
    query: { "filter[id]": marianaId },
  });
  const node = res.data?.[0];
  if (!node) return null;
  const a = node.attributes;
  return {
    capacity: typeof a.capacity === "number" ? a.capacity : null,
    checkedInCount:
      typeof a.checked_in_user_count === "number" ? a.checked_in_user_count : null,
    firstTimeCount:
      typeof a.first_time_user_count === "number" ? a.first_time_user_count : null,
    waitlistCount:
      typeof a.public_waitlist_count === "number" ? a.public_waitlist_count : 0,
  };
}
