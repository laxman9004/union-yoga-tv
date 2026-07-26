import type { Metadata } from "next";
import { fetchClassesForRange, type ClassRow } from "@/lib/mariana-api/fetch-classes";
import { studioDayKey, STUDIO_TIME_ZONE } from "@/lib/data/dates";
import { AutoRefresh } from "./AutoRefresh";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Schedule Update — Union Yoga",
  description:
    "New class times at Union Yoga Studio: 26 & 2 moves to mornings, new evening classes, weekend time changes. Effective August 1.",
};

/** First day of the new pattern (studio-local). */
const CHANGE_DATE = "2026-08-01";

type DayEntry = {
  weekday: string;
  date: string;
  classes: Array<{ time: string; label: string | null }>;
};

/** "26 & 2 Hot Yoga" → null (the column's default), variants keep a short tag. */
function shortLabel(classType: string): string | null {
  const t = classType.toLowerCase();
  if (t.startsWith("express")) return "Express 26";
  if (t.startsWith("intro")) return "Intro to 26 & 2";
  if (t === "26 & 2 hot yoga") return null;
  return classType;
}

function is26Series(classType: string): boolean {
  return classType.includes("26");
}

function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

const weekdayFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: STUDIO_TIME_ZONE,
  weekday: "long",
});
const dateFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: STUDIO_TIME_ZONE,
  month: "short",
  day: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: STUDIO_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

function buildWeek(rows: ClassRow[], startYmd: string): DayEntry[] {
  const byDay = new Map<string, ClassRow[]>();
  for (const r of rows) {
    if (!is26Series(r.classType) || r.isCancelled) continue;
    const key = studioDayKey(r.startTime);
    (byDay.get(key) ?? byDay.set(key, []).get(key)!).push(r);
  }
  const days: DayEntry[] = [];
  for (let i = 0; i < 7; i++) {
    const ymd = addDays(startYmd, i);
    // Noon with the studio's standard offset lands on the right local day
    // year-round (EDT/EST both keep noon inside the same calendar day).
    const noon = new Date(`${ymd}T12:00:00-05:00`);
    const classes = (byDay.get(ymd) ?? [])
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      .map((r) => ({
        time: timeFmt.format(r.startTime),
        label: shortLabel(r.classType),
      }));
    days.push({
      weekday: weekdayFmt.format(noon),
      date: dateFmt.format(noon),
      classes,
    });
  }
  return days;
}

/** The confirmed week of Aug 2, used when the live fetch fails. */
const FALLBACK_WEEK: DayEntry[] = [
  { weekday: "Sunday", date: "Aug 2", classes: [{ time: "9:30 AM", label: null }] },
  { weekday: "Monday", date: "Aug 3", classes: [{ time: "9:30 AM", label: null }] },
  { weekday: "Tuesday", date: "Aug 4", classes: [{ time: "9:30 AM", label: "Express 26" }] },
  { weekday: "Wednesday", date: "Aug 5", classes: [{ time: "9:30 AM", label: null }] },
  {
    weekday: "Thursday",
    date: "Aug 6",
    classes: [
      { time: "7:00 AM", label: null },
      { time: "9:30 AM", label: null },
    ],
  },
  { weekday: "Friday", date: "Aug 7", classes: [{ time: "9:30 AM", label: null }] },
  { weekday: "Saturday", date: "Aug 8", classes: [{ time: "9:30 AM", label: null }] },
];

/** From the studio's announcement, confirmed against Mariana bookings. */
const NEW_EVENING_CLASSES = [
  { day: "Monday", time: "5:30 PM", name: "Hot Flow Yoga", teacher: "Kathy" },
  { day: "Monday", time: "7:00 PM", name: "Hot Power Yoga", teacher: "Gina" },
  { day: "Tuesday", time: "7:00 PM", name: "Hot Fusion", teacher: "Simi" },
  { day: "Wednesday", time: "5:30 PM", name: "Hot Power Yoga", teacher: "Cheryl" },
];

const WEEKEND_CHANGES = [
  { name: "26 & 2", time: "9:30 AM", note: "Sundays move from 8:00 AM" },
  { name: "Sculpt", time: "11:30 AM", note: null },
  { name: "Sculpt", time: "8:00 AM", note: "begins August 8" },
];

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-cream/20 pb-[1.4vh] font-sans text-[0.95vw] font-medium tracking-[0.28em] text-cream/60 uppercase">
      {children}
    </h2>
  );
}

export default async function ScheduleChangePage() {
  const today = studioDayKey(new Date());
  // Show the first full new week (Sun Aug 2) until it arrives, then roll.
  const startYmd = today < "2026-08-02" ? "2026-08-02" : today;

  let week: DayEntry[];
  try {
    const rows = await fetchClassesForRange({
      minDate: startYmd,
      maxDate: addDays(startYmd, 6),
    });
    week = buildWeek(rows, startYmd);
    if (week.every((d) => d.classes.length === 0)) week = FALLBACK_WEEK;
  } catch {
    week = FALLBACK_WEEK;
  }

  const showFinalClassNote = today <= "2026-07-29";

  return (
    <div
      className="fixed inset-0 overflow-hidden text-cream"
      style={{
        background:
          "radial-gradient(130% 100% at 18% 0%, #2E4034 0%, #24322A 45%, #1F2A22 100%)",
      }}
    >
      <AutoRefresh />

      {/* Watermark: the seated figure, barely there */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/union-yoga-mark-cream.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -right-[5vw] -bottom-[16vh] w-[38vw] opacity-[0.05]"
      />

      <div className="relative flex h-full flex-col px-[5vw] pt-[6vh] pb-[4.5vh]">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="font-sans text-[1vw] font-medium tracking-[0.28em] text-clay-soft uppercase">
              Schedule update · Effective August 1
            </p>
            <h1 className="mt-[1.8vh] font-serif text-[4.4vw] leading-[1.05] font-semibold tracking-[-0.01em] text-cream">
              26&nbsp;&amp;&nbsp;2 is moving to mornings.
            </h1>
          </div>
          <p className="max-w-[24vw] pb-[1vh] text-right font-sans text-[1.1vw] font-light leading-[1.55] text-cream/70">
            Weekend times shift, and four new evening classes join the week.
          </p>
        </div>

        {/* Three columns */}
        <div className="mt-[5.5vh] grid flex-1 grid-cols-[5fr_4fr_4fr] gap-[4vw]">
          {/* Col 1: the 26 & 2 week */}
          <div>
            <Kicker>Your 26 &amp; 2 week</Kicker>
            <ul>
              {week.map((day) => (
                <li
                  key={day.weekday}
                  className="flex items-baseline justify-between border-b border-cream/10 py-[1.75vh]"
                >
                  <span className="font-sans text-[1.15vw] font-light text-cream/75">
                    {day.weekday}
                  </span>
                  <span className="text-right font-serif text-[1.5vw] font-medium text-cream">
                    {day.classes.length === 0 ? (
                      <span className="text-cream/30">rest day</span>
                    ) : (
                      day.classes.map((c, i) => (
                        <span key={i}>
                          {i > 0 && (
                            <span className="text-cream/35">&thinsp;&amp;&thinsp;</span>
                          )}
                          {c.time.replace(" AM", "").replace(" PM", "")}
                          <span className="font-sans text-[0.95vw] font-normal text-clay-soft">
                            {" "}
                            {c.time.endsWith("AM") ? "AM" : "PM"}
                            {c.label ? ` ${c.label}` : ""}
                          </span>
                        </span>
                      ))
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-[2vh] font-sans text-[0.95vw] font-light text-cream/50">
              All 26 &amp; 2 classes are now mornings. No Express 26 on weekends.
            </p>
          </div>

          {/* Col 2: new evening classes */}
          <div>
            <Kicker>New evening classes</Kicker>
            <ul>
              {NEW_EVENING_CLASSES.map((c) => (
                <li
                  key={`${c.day}-${c.time}`}
                  className="border-b border-cream/10 py-[2.2vh]"
                >
                  <p className="font-sans text-[1vw] font-light text-cream/60">
                    {c.day} ·{" "}
                    <span className="text-clay-soft">{c.time}</span>
                  </p>
                  <p className="mt-[0.5vh] font-serif text-[1.6vw] font-medium leading-[1.15] text-cream">
                    {c.name}
                    <span className="font-sans text-[1vw] font-light text-cream/60">
                      {"  "}with {c.teacher}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
            {showFinalClassNote && (
              <p className="mt-[2vh] font-sans text-[0.95vw] font-light text-cream/50">
                Evening 26 &amp; 2 bows out this week: final classes Mon July 27
                (5:30 PM) and Wed July 29 (Express, 5:30 PM).
              </p>
            )}
          </div>

          {/* Col 3: weekend time changes */}
          <div>
            <Kicker>Weekends · Sat &amp; Sun</Kicker>
            <ul>
              {WEEKEND_CHANGES.map((c, i) => (
                <li key={i} className="border-b border-cream/10 py-[2.2vh]">
                  <p className="font-serif text-[2.1vw] font-medium text-cream">
                    {c.time.replace(" AM", "")}
                    <span className="font-sans text-[1vw] font-normal text-clay-soft">
                      {" "}
                      AM
                    </span>
                    <span className="font-sans text-[1.2vw] font-light text-cream/75">
                      {"  "}
                      {c.name}
                    </span>
                  </p>
                  {c.note && (
                    <p className="mt-[0.4vh] font-sans text-[0.95vw] font-light text-cream/50">
                      {c.note}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-[2vh] font-sans text-[0.95vw] font-light text-cream/50">
              Book as usual in the app. Same heat, same room, new rhythm.
            </p>
          </div>
        </div>

        {/* Footer: brand line */}
        <div className="mt-[4vh] flex items-end justify-between">
          <div className="flex items-center gap-[1.1vw]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/union-yoga-mark-cream.svg"
              alt="Union Yoga"
              className="h-[5vh] w-auto opacity-90"
            />
            <p className="font-serif text-[1.35vw] font-light text-cream">
              A better <span className="brand-mark-hl--on-dark">YOU</span> at{" "}
              <span className="brand-mark-hl--on-dark">U</span>nion.
            </p>
          </div>
          <p className="font-sans text-[0.9vw] font-light tracking-[0.18em] text-cream/45 uppercase">
            Union Yoga Studio · Powell, OH
          </p>
        </div>
      </div>
    </div>
  );
}
