import type { Metadata } from "next";
import { AutoRefresh } from "../schedule-change/AutoRefresh";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "September Promotions — Union Yoga",
  description:
    "September 1–15 at Union Yoga: $10 intro month, class packs with free classes, and $10 off your first six months of membership.",
};

const CARD_SHADOW =
  "0 1px 2px rgba(31,42,34,.06), 0 24px 48px -12px rgba(31,42,34,.22)";

/** The clay-soft highlighter block (brand-site.css .swipe). */
function Swipe({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-[3px] bg-clay-soft px-[0.1em] text-ink">
      {children}
    </span>
  );
}

/** The clay-dot eyebrow (brand-site.css .eyebrow). */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-[0.55vw] font-sans text-[1vw] font-semibold tracking-[0.18em] text-clay uppercase">
      <span className="h-[0.5vw] w-[0.5vw] rounded-full bg-clay" />
      {children}
    </span>
  );
}

function OfferRule({ children }: { children: React.ReactNode }) {
  return <div className="border-t-[3px] border-clay pt-[1.5vh]">{children}</div>;
}

function OfferLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-sans text-[0.92vw] font-semibold tracking-[0.16em] text-terra uppercase">
      {children}
    </p>
  );
}

const PACKS = [
  { buy: "4", free: "1" },
  { buy: "10", free: "5" },
  { buy: "20", free: "10" },
];

export default function PromotionsPage() {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-cream text-ink">
      <AutoRefresh />

      {/* Announce bar — evergreen brand line (brand-site.css .announce) */}
      <div className="bg-forest px-[5vw] py-[1.5vh] text-center font-sans text-[1.1vw] font-normal text-cream">
        <span className="font-medium text-clay-soft">Come as you are.</span>{" "}
        Book anytime at unionyogastudio.com
      </div>

      {/* Body */}
      <div className="grid flex-1 grid-cols-[1.7fr_1fr] gap-[3.5vw] px-[5vw] pt-[5vh] pb-[3.5vh]">
        {/* Left — offer content */}
        <div className="flex flex-col">
          <Eyebrow>September at Union</Eyebrow>
          <h1 className="mt-[1.8vh] font-serif text-[4.4vw] leading-[1.0] font-semibold tracking-[-0.02em] text-forest">
            Let&apos;s keep this going.
          </h1>

          {/* Artsy date lockup */}
          <div className="mt-[2.8vh] flex items-baseline gap-[1vw]">
            <span className="font-serif text-[2.9vw] leading-none font-semibold text-forest">
              Promotions
            </span>
            <span className="font-serif text-[2.9vw] leading-none font-semibold">
              <Swipe>Sept&nbsp;1–15</Swipe>
            </span>
          </div>
          <p className="mt-[1.3vh] font-sans text-[1.05vw] text-moss">
            Applied automatically at checkout. No code needed.
          </p>

          <div className="mt-[3.6vh] flex flex-col gap-[3vh]">
            {/* Intro Month */}
            <OfferRule>
              <div className="grid grid-cols-[10vw_1fr] items-start gap-[2vw]">
                <p className="font-serif text-[3.6vw] leading-none font-semibold text-forest">
                  $10
                </p>
                <div>
                  <OfferLabel>Intro Month</OfferLabel>
                  <p className="mt-[0.8vh] font-sans text-[1.05vw] leading-[1.5] text-moss">
                    A whole month of unlimited classes, for anyone new to Union.
                  </p>
                </div>
              </div>
            </OfferRule>

            {/* Class Packs */}
            <OfferRule>
              <div className="grid grid-cols-[10vw_1fr] items-start gap-[2vw]">
                <OfferLabel>Class Packs</OfferLabel>
                <div className="flex gap-[3.2vw]">
                  {PACKS.map((p) => (
                    <div key={p.buy}>
                      <p className="font-serif text-[2.2vw] leading-none font-semibold text-forest">
                        Buy {p.buy}
                      </p>
                      <p className="mt-[0.7vh] font-sans text-[1.1vw] font-medium text-clay">
                        + {p.free} free
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </OfferRule>

            {/* Membership */}
            <OfferRule>
              <div className="grid grid-cols-[10vw_1fr] items-start gap-[2vw]">
                <p className="font-serif text-[3.6vw] leading-none font-semibold text-forest">
                  $89
                  <span className="font-sans text-[1.1vw] font-normal text-moss">
                    /mo
                  </span>
                </p>
                <div>
                  <OfferLabel>Auto-Renew Membership</OfferLabel>
                  <p className="mt-[0.8vh] font-sans text-[1.05vw] leading-[1.5] text-moss">
                    Sign up and take <Swipe>$10 off your first six months.</Swipe>{" "}
                    Regular discounts apply too.
                  </p>
                </div>
              </div>
            </OfferRule>
          </div>

          {/* Footer brand line */}
          <div className="mt-auto flex items-end justify-between pt-[3vh]">
            <p className="font-serif text-[1.4vw] font-semibold text-forest">
              A better <Swipe>YOU</Swipe> at <Swipe>U</Swipe>nion.
            </p>
            <p className="font-sans text-[0.95vw] tracking-[0.14em] text-moss uppercase">
              Union Yoga Studio · Powell, OH
            </p>
          </div>
        </div>

        {/* Right — warm studio photo */}
        <div
          className="relative overflow-hidden rounded-[22px] bg-forest"
          style={{ boxShadow: CARD_SHADOW }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/studio-poses.jpg"
            alt="The backlit yoga-pose figures on the feature wall at Union Yoga, Powell"
            className="h-full w-full object-cover"
            style={{ objectPosition: "center" }}
          />
        </div>
      </div>
    </div>
  );
}
