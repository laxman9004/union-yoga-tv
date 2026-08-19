import type { Metadata } from "next";
import { studioDayKey } from "@/lib/data/dates";
import { AutoRefresh } from "../schedule-change/AutoRefresh";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Free Classes for Two Weeks — Union Yoga",
  description:
    "From August 24 to September 4, every class at Union Yoga is free. Bring someone with you.",
};

const START = "2026-08-24";
const END = "2026-09-04";

/** Warm, minimal notes for the friend you bring, one line each. */
const NOTES: Array<{ label: string; text: string }> = [
  { label: "When", text: "Every class, August 24 to September 4." },
  { label: "Bring them", text: "To any class, any time, right alongside you." },
  { label: "For them", text: "Mats and towels are on us. New? Come 15 min early." },
];

export default function FreeWeeksPage() {
  const today = studioDayKey(new Date());
  let status: string;
  if (today < START) status = "Starts Monday, August 24";
  else if (today > END) status = "Thank you for sharing the room";
  else status = "Happening now";

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
        className="pointer-events-none absolute top-1/2 right-[-13vw] w-[46vw] -translate-y-1/2 opacity-[0.06]"
      />

      <div className="relative flex h-full flex-col justify-between px-[6vw] pt-[6.5vh] pb-[5vh]">
        {/* Kicker */}
        <div className="flex items-center justify-between">
          <p className="font-serif text-[1.15vw] font-normal tracking-[0.02em] text-clay-soft">
            Free classes · August 24 – September 4
          </p>
          <p className="font-sans text-[1vw] font-light tracking-[0.14em] text-cream/55">
            {status}
          </p>
        </div>

        {/* Hero + invitation */}
        <div className="grid grid-cols-[1.15fr_0.85fr] items-center gap-[5vw]">
          <div>
            <h1 className="font-serif text-[7.4vw] leading-[0.95] font-semibold tracking-[-0.02em] text-cream">
              Bring someone
              <br />
              with you.
            </h1>
            <p className="mt-[3.4vh] max-w-[40vw] font-sans text-[1.55vw] leading-[1.5] font-light text-cream/80">
              For two weeks, every class at Union is free. If there&apos;s someone
              who&apos;s been meaning to try, this is the time. Bring them in with
              you and practice together.
            </p>
          </div>

          {/* Practical note, one line each */}
          <div className="border-l border-cream/15 pl-[2.6vw]">
            <ul className="space-y-[3.4vh]">
              {NOTES.map((n) => (
                <li key={n.label}>
                  <p className="font-sans text-[0.9vw] font-medium tracking-[0.16em] text-clay-soft uppercase">
                    {n.label}
                  </p>
                  <p className="mt-[0.5vh] font-serif text-[1.75vw] leading-[1.2] font-normal text-cream">
                    {n.text}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Close + brand line */}
        <div className="flex items-end justify-between border-t border-cream/15 pt-[3vh]">
          <div className="flex items-center gap-[1.1vw]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/union-yoga-mark-cream.svg"
              alt="Union Yoga"
              className="h-[5vh] w-auto opacity-90"
            />
            <p className="font-serif text-[1.6vw] font-normal text-cream">
              We&apos;d love to meet whoever you bring.
            </p>
          </div>
          <p className="font-serif text-[1.4vw] font-light text-cream/90">
            A better <span className="brand-mark-hl--on-dark">YOU</span> at{" "}
            <span className="brand-mark-hl--on-dark">U</span>nion.
          </p>
        </div>
      </div>
    </div>
  );
}
