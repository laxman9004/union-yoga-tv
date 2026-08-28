import type { Metadata } from "next";
import { AutoRefresh } from "../schedule-change/AutoRefresh";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "September Promotions — Union Yoga",
  description:
    "September 1–15 at Union Yoga: $10 intro month, class packs with free classes, and $10 off your first six months of membership.",
};

const PACKS = [
  { buy: "4", free: "1" },
  { buy: "10", free: "5" },
  { buy: "20", free: "10" },
];

function ColLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-sans text-[0.95vw] font-medium tracking-[0.22em] text-clay-soft uppercase">
      {children}
    </p>
  );
}

export default function PromotionsPage() {
  return (
    <div
      className="fixed inset-0 overflow-hidden text-cream"
      style={{
        background:
          "radial-gradient(120% 120% at 82% 10%, #35493B 0%, #2A3A30 44%, #1C2721 100%)",
      }}
    >
      <AutoRefresh />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/union-yoga-mark-cream.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute right-[-8vw] bottom-[-16vh] h-[62vh] w-auto opacity-[0.05]"
      />

      <div className="relative flex h-full flex-col px-[5.5vw] pt-[6vh] pb-[4.5vh]">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="font-serif text-[1.6vw] font-medium text-clay-soft">
              September at Union · The deals start on the 1st!
            </p>
            <h1 className="mt-[1.8vh] font-serif text-[5vw] leading-[1.0] font-semibold tracking-[-0.02em] text-cream">
              Let&apos;s keep this going!
            </h1>
          </div>
          <p className="max-w-[27vw] pb-[0.8vh] text-right font-sans text-[1.1vw] leading-[1.55] font-light text-cream/70">
            Every class is free through{" "}
            <span className="text-cream whitespace-nowrap">Friday, September&nbsp;4.</span>{" "}
            Then these kick in, September&nbsp;1–15. They apply automatically, no
            code needed!
          </p>
        </div>

        {/* Offers */}
        <div className="mt-[5vh] grid flex-1 grid-cols-[1fr_1.25fr_1fr] gap-[4vw]">
          {/* Intro Month */}
          <div className="flex flex-col border-t border-cream/15 pt-[2.6vh]">
            <ColLabel>Intro Month</ColLabel>
            <p className="mt-[2.2vh] font-serif text-[6vw] leading-[0.9] font-semibold text-cream">
              $10
            </p>
            <p className="mt-[2.4vh] font-sans text-[1.2vw] leading-[1.5] font-light text-cream/75">
              A whole month of unlimited classes, for anyone new to Union!
            </p>
          </div>

          {/* Class Packs */}
          <div className="flex flex-col border-t border-cream/15 pt-[2.6vh]">
            <ColLabel>Class Packs · Buy more, get more</ColLabel>
            <ul className="mt-[2.2vh] space-y-[2.2vh]">
              {PACKS.map((p) => (
                <li
                  key={p.buy}
                  className="flex items-baseline justify-between border-b border-cream/10 pb-[2vh]"
                >
                  <span className="font-serif text-[2.4vw] font-medium text-cream">
                    Buy {p.buy}
                    <span className="font-sans text-[1.1vw] font-light text-cream/60">
                      {" "}
                      classes
                    </span>
                  </span>
                  <span className="font-serif text-[2.4vw] font-medium text-clay-soft">
                    {p.free} free
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Membership */}
          <div className="flex flex-col border-t border-cream/15 pt-[2.6vh]">
            <ColLabel>Auto-Renew Membership</ColLabel>
            <p className="mt-[2.2vh] font-serif text-[6vw] leading-[0.9] font-semibold text-cream">
              $89
              <span className="font-sans text-[1.3vw] font-light text-cream/60">
                {" "}
                / mo
              </span>
            </p>
            <p className="mt-[2.4vh] font-sans text-[1.2vw] leading-[1.5] font-light text-cream/75">
              Sign up and take{" "}
              <span className="text-clay-soft">$10 off your first six months!</span>{" "}
              Regular discounts apply too.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-[3vh] flex items-end justify-between border-t border-cream/15 pt-[2.6vh]">
          <p className="font-serif text-[1.4vw] font-light text-cream/90">
            A better <span className="brand-mark-hl--on-dark">YOU</span> at{" "}
            <span className="brand-mark-hl--on-dark">U</span>nion.
          </p>
          <p className="font-sans text-[0.95vw] font-light tracking-[0.18em] text-cream/45 uppercase">
            Union Yoga Studio · Powell, OH
          </p>
        </div>
      </div>
    </div>
  );
}
