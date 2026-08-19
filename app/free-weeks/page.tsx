import type { Metadata } from "next";
import { fetchClassesForRange, type ClassRow } from "@/lib/mariana-api/fetch-classes";
import { studioDayKey, STUDIO_TIME_ZONE } from "@/lib/data/dates";
import { AutoRefresh } from "../schedule-change/AutoRefresh";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Two Free Weeks — Union Yoga",
  description:
    "August 24 to September 4, every class at Union Yoga is free. No membership, no booking. Walk in, unroll a mat, breathe.",
};

const START = "2026-08-24";
const END = "2026-09-04";

/** Distinct class styles we count for the "styles" stat, in reading order. */
const STYLE_ORDER: Array<{ match: (t: string) => boolean; name: string }> = [
  { match: (t) => t === "26 & 2 Hot Yoga", name: "26 & 2" },
  { match: (t) => t.startsWith("Express 26"), name: "Express 26" },
  { match: (t) => t === "Hot Flow Yoga", name: "Hot Flow" },
  { match: (t) => t === "Hot Power Yoga", name: "Hot Power" },
  { match: (t) => t.includes("Classical Sculpt"), name: "Hot Classical Sculpt" },
  { match: (t) => t === "Hot Power Sculpt", name: "Hot Power Sculpt" },
  { match: (t) => t === "Hot Fusion", name: "Hot Fusion" },
  { match: (t) => t === "Barre", name: "Barre" },
  { match: (t) => t.includes("Restore") || t === "Yin", name: "Slow Flow + Restore" },
];

const FALLBACK_TOTAL = 56;

function summarize(rows: ClassRow[]): { total: number; styleCount: number } {
  const seen = new Set<string>();
  let total = 0;
  for (const r of rows) {
    if (r.isCancelled) continue;
    total++;
    for (const s of STYLE_ORDER) {
      if (s.match(r.classType)) {
        seen.add(s.name);
        break;
      }
    }
  }
  return { total, styleCount: seen.size };
}

const dayFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: STUDIO_TIME_ZONE,
  weekday: "long",
  month: "long",
  day: "numeric",
});

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-serif text-[4.6vw] leading-[0.95] font-semibold text-cream">
        {value}
      </span>
      <span className="mt-[0.8vh] font-sans text-[0.95vw] font-medium tracking-[0.2em] text-clay-soft uppercase">
        {label}
      </span>
    </div>
  );
}

export default async function FreeWeeksPage() {
  let total = FALLBACK_TOTAL;
  let styleCount = STYLE_ORDER.length;

  try {
    const rows = await fetchClassesForRange({ minDate: START, maxDate: END });
    const s = summarize(rows);
    if (s.total > 0) {
      total = s.total;
      styleCount = s.styleCount;
    }
  } catch {
    // keep fallbacks
  }

  // Live status line: before → countdown, during → today, after → thank-you.
  const today = studioDayKey(new Date());
  let status: string;
  if (today < START) status = "Doors open Monday, August 24";
  else if (today > END) status = "Thank you for two beautiful weeks";
  else status = `Today, ${dayFmt.format(new Date())} — every class free`;

  return (
    <div
      className="fixed inset-0 overflow-hidden text-cream"
      style={{
        background:
          "radial-gradient(120% 120% at 82% 12%, #35493B 0%, #2A3A30 42%, #1C2721 100%)",
      }}
    >
      <AutoRefresh />

      {/* Oversized seated-figure mark, bleeding off the right edge */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/union-yoga-mark-cream.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-[-14vw] w-[52vw] -translate-y-1/2 opacity-[0.06]"
      />

      <div className="relative flex h-full flex-col justify-between px-[6vw] pt-[6.5vh] pb-[5vh]">
        {/* Kicker */}
        <div className="flex items-center justify-between">
          <p className="font-sans text-[1.05vw] font-medium tracking-[0.32em] text-clay-soft uppercase">
            A gift to Powell · August 24 – September 4
          </p>
          <p className="font-sans text-[1.05vw] font-light tracking-[0.14em] text-cream/55">
            {status}
          </p>
        </div>

        {/* Hero */}
        <div className="max-w-[70%]">
          <p className="font-serif text-[2.6vw] leading-[1.1] font-light text-cream/85">
            Every body. Any body.
          </p>
          <h1 className="mt-[1vh] font-serif text-[9vw] leading-[0.9] font-semibold tracking-[-0.02em] text-cream">
            Two weeks,
            <br />
            <span className="text-clay-soft">on us.</span>
          </h1>
          <p className="mt-[3.5vh] max-w-[46vw] font-sans text-[1.5vw] leading-[1.5] font-light text-cream/75">
            Every class in the studio is free. No membership, no booking, no
            catch. Walk in, unroll a mat, and see what the whole town&apos;s been
            warming up to.
          </p>
        </div>

        {/* Stats — one editorial row, not cards */}
        <div className="flex items-end gap-[5vw] border-t border-cream/15 pt-[3.2vh]">
          <Stat value="14" label="Days" />
          <Stat value={String(total)} label="Classes" />
          <Stat value={String(styleCount)} label="Styles" />
          <Stat value="$0" label="Every one" />
          <div className="ml-auto max-w-[26vw] pb-[0.6vh]">
            <p className="font-sans text-[1.1vw] leading-[1.5] font-light text-cream/70">
              <span className="text-cream">Just walk in.</span>{" "}
              No reservation needed. Bring a mat and a towel, or borrow ours,
              free. New to hot yoga? Arrive 15 minutes early and we&apos;ll show
              you the room.
            </p>
          </div>
        </div>

        {/* Footer: brand line */}
        <div className="mt-[1vh] flex items-end justify-between border-t border-cream/15 pt-[2.6vh]">
          <div className="flex items-center gap-[1.1vw]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/union-yoga-mark-cream.svg"
              alt="Union Yoga"
              className="h-[5vh] w-auto opacity-90"
            />
            <p className="font-serif text-[1.4vw] font-light text-cream">
              A better <span className="brand-mark-hl--on-dark">YOU</span> at{" "}
              <span className="brand-mark-hl--on-dark">U</span>nion.
            </p>
          </div>
          <p className="font-sans text-[0.95vw] font-light tracking-[0.18em] text-cream/45 uppercase">
            Union Yoga Studio · Powell, OH
          </p>
        </div>
      </div>
    </div>
  );
}
