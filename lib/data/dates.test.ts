import { describe, expect, it } from "vitest";
import {
  combineClassDateTime,
  isOnOrBeforeToday,
  isSameMonthDayLocal,
  parseMtDate,
  studioDayEnd,
  studioDayStart,
  studioMonthDay,
  syntheticSessionId,
} from "./dates";

describe("syntheticSessionId (canonical class key)", () => {
  it("produces the same id from reservation and utilization field values", () => {
    // Reservations report: Location "Powell", date "5/13/2025", time "7:00 AM".
    const fromReservation = syntheticSessionId(
      "Powell",
      "5/13/2025",
      "7:00 AM",
      "Express 26 Hot Yoga"
    );
    // Utilization report: identical natural-key fields for the same class.
    const fromUtilization = syntheticSessionId(
      "Powell",
      "5/13/2025",
      "7:00 AM",
      "Express 26 Hot Yoga"
    );
    expect(fromReservation).toBe(fromUtilization);
    expect(fromReservation).toBe("mt-powell|5-13-2025|7-00-am|express-26-hot-yoga");
  });

  it("distinguishes different times / types on the same day", () => {
    const a = syntheticSessionId("Powell", "5/13/2025", "7:00 AM", "Barre");
    const b = syntheticSessionId("Powell", "5/13/2025", "9:30 AM", "Barre");
    const c = syntheticSessionId("Powell", "5/13/2025", "7:00 AM", "Yin");
    expect(new Set([a, b, c]).size).toBe(3);
  });
});

describe("studio timezone day boundaries", () => {
  it("anchors the day to America/New_York regardless of server tz (Netlify bug)", () => {
    // 8:00pm EDT on May 27 — the instant that, on a UTC server, wrongly rolled
    // the calendar day to May 28 and produced the 'only one class' lineup.
    const eveningEdt = new Date("2026-05-28T00:00:00.000Z");
    // The studio day is still May 27, so day-start is midnight EDT = 04:00Z.
    expect(studioDayStart(eveningEdt).toISOString()).toBe("2026-05-27T04:00:00.000Z");
    expect(studioDayEnd(eveningEdt).toISOString()).toBe("2026-05-28T03:59:59.999Z");
  });

  it("computes day-start for a midday instant", () => {
    const middayEdt = new Date("2026-05-27T16:00:00.000Z"); // noon EDT
    expect(studioDayStart(middayEdt).toISOString()).toBe("2026-05-27T04:00:00.000Z");
  });

  it("uses a 5h offset in winter (EST)", () => {
    const winterNoon = new Date("2026-01-15T17:00:00.000Z"); // noon EST
    expect(studioDayStart(winterNoon).toISOString()).toBe("2026-01-15T05:00:00.000Z");
  });

  it("a late-night class and the studio day-start agree", () => {
    // 8:30pm EDT May 27 class, stored as 00:30Z May 28.
    const lateClass = new Date("2026-05-28T00:30:00.000Z");
    const start = studioDayStart(lateClass);
    const end = studioDayEnd(lateClass);
    // The class falls inside its own studio day window.
    expect(lateClass.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(lateClass.getTime()).toBeLessThanOrEqual(end.getTime());
    expect(start.toISOString()).toBe("2026-05-27T04:00:00.000Z");
  });
});

describe("studioMonthDay", () => {
  it("reports the studio calendar day for an evening instant", () => {
    // 11pm EDT May 27 = 03:00Z May 28; studio day is still 27.
    const md = studioMonthDay(new Date("2026-05-28T03:00:00.000Z"));
    expect(md).toEqual({ month: 5, day: 27 });
  });
});

describe("isSameMonthDayLocal", () => {
  it("returns false for a null birthday", () => {
    expect(isSameMonthDayLocal(null, new Date(2026, 4, 27))).toBe(false);
  });

  it("matches when local month and day are equal", () => {
    const birthday = new Date(1999, 4, 28); // local May 28
    const now = new Date(2026, 4, 28, 14, 0); // local May 28 2pm
    expect(isSameMonthDayLocal(birthday, now)).toBe(true);
  });

  it("does NOT match the day before (Greg N regression)", () => {
    // Birthday stored by parseMtDate as local-midnight May 28.
    const birthday = parseMtDate("05/28/1999")!;
    // Evening of May 27 — the old UTC comparison flipped this to true.
    const now = new Date(2026, 4, 27, 20, 0); // local May 27 8pm
    expect(isSameMonthDayLocal(birthday, now)).toBe(false);
  });

  it("does not match a different month with the same day-of-month", () => {
    const birthday = new Date(1990, 5, 27); // June 27
    const now = new Date(2026, 4, 27); // May 27
    expect(isSameMonthDayLocal(birthday, now)).toBe(false);
  });

  it("matches a leap-day birthday only on Feb 29", () => {
    const birthday = new Date(2000, 1, 29); // Feb 29
    expect(isSameMonthDayLocal(birthday, new Date(2024, 1, 29))).toBe(true);
    expect(isSameMonthDayLocal(birthday, new Date(2026, 1, 28))).toBe(false);
  });
});

describe("parseMtDate", () => {
  it("parses M/D/YYYY at local midnight", () => {
    const d = parseMtDate("5/28/1999")!;
    expect(d.getFullYear()).toBe(1999);
    expect(d.getMonth()).toBe(4);
    expect(d.getDate()).toBe(28);
    expect(d.getHours()).toBe(0);
  });

  it("expands two-digit years to 2000s", () => {
    expect(parseMtDate("01/02/26")!.getFullYear()).toBe(2026);
  });

  it("parses ISO yyyy-mm-dd", () => {
    const d = parseMtDate("2026-05-27")!;
    expect(d.getMonth()).toBe(4);
    expect(d.getDate()).toBe(27);
  });

  it("returns null for blank input", () => {
    expect(parseMtDate("")).toBeNull();
    expect(parseMtDate("   ")).toBeNull();
  });
});

describe("combineClassDateTime", () => {
  it("combines a date and 12-hour time into local Date", () => {
    const d = combineClassDateTime("5/27/2026", "7:00 AM")!;
    expect(d.getHours()).toBe(7);
    expect(d.getMinutes()).toBe(0);
    expect(d.getDate()).toBe(27);
  });

  it("handles 12 PM and 12 AM correctly", () => {
    expect(combineClassDateTime("5/27/2026", "12:00 PM")!.getHours()).toBe(12);
    expect(combineClassDateTime("5/27/2026", "12:30 AM")!.getHours()).toBe(0);
  });

  it("falls back to date-only when time is missing", () => {
    const d = combineClassDateTime("5/27/2026", "")!;
    expect(d.getHours()).toBe(0);
  });

  it("produces studio-anchored UTC instants matching stored class times", () => {
    // 5:30 AM EDT on 5/27 is stored as 09:30Z (matches Turso data), regardless
    // of which timezone the import runs in.
    expect(combineClassDateTime("5/27/2026", "5:30 AM")!.toISOString()).toBe(
      "2026-05-27T09:30:00.000Z"
    );
    // 8:30 PM EDT is stored as 00:30Z the next UTC day.
    expect(combineClassDateTime("5/27/2026", "8:30 PM")!.toISOString()).toBe(
      "2026-05-28T00:30:00.000Z"
    );
    // Winter class uses the EST (-5h) offset.
    expect(combineClassDateTime("1/15/2026", "7:00 AM")!.toISOString()).toBe(
      "2026-01-15T12:00:00.000Z"
    );
  });
});

describe("isOnOrBeforeToday", () => {
  it("accepts a moment earlier today", () => {
    const now = new Date();
    expect(isOnOrBeforeToday(new Date(now.getTime() - 60_000))).toBe(true);
  });

  it("accepts the very end of today", () => {
    const now = new Date();
    const endOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      0
    );
    expect(isOnOrBeforeToday(endOfToday)).toBe(true);
  });

  it("rejects tomorrow", () => {
    const now = new Date();
    const tomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      9,
      0
    );
    expect(isOnOrBeforeToday(tomorrow)).toBe(false);
  });
});
