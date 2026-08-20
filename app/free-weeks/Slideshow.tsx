"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Seconds each slide holds before crossfading to the next. */
const HOLD_MS = 9000;

function SlideForest() {
  return (
    <div
      className="absolute inset-0 text-cream"
      style={{
        background:
          "radial-gradient(120% 120% at 80% 10%, #35493B 0%, #2A3A30 45%, #1C2721 100%)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/union-yoga-mark-cream.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-[-6vw] h-[60vh] w-auto -translate-y-1/2 opacity-[0.06]"
      />
      <div className="absolute top-1/2 left-[6.25vw] max-w-[66vw] -translate-y-1/2">
        <p className="font-serif text-[3.2vw] leading-none font-medium text-clay-soft">
          Free classes for two weeks
        </p>
        <h1 className="mt-[2.6vh] font-serif text-[8.6vw] leading-[0.9] font-semibold tracking-[-0.02em] text-cream">
          Who are you
          <br />
          bringing?
        </h1>
        <p className="mt-[3.4vh] font-sans text-[2.05vw] font-light text-cream/70">
          Every class at Union, on us. August 24 – September 4.
        </p>
      </div>
    </div>
  );
}

function SlideCream() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-cream text-center text-forest">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/union-yoga-mark-forest.svg"
        alt=""
        aria-hidden
        className="h-[10vh] w-auto opacity-90"
      />
      <h1 className="mt-[4.2vh] font-serif text-[7.2vw] leading-[0.98] font-medium tracking-[-0.02em] text-ink">
        There&apos;s room
        <br />
        for one more.
      </h1>
      <p className="mt-[4.8vh] font-serif text-[3.3vw] font-medium text-clay">
        Two weeks of free classes
      </p>
      <p className="mt-[1.8vh] font-sans text-[1.75vw] font-normal tracking-[0.02em] text-moss">
        August 24 – September 4 · Union Yoga, Powell
      </p>
    </div>
  );
}

function SlideClay() {
  return (
    <div
      className="absolute inset-0 text-cream"
      style={{
        background:
          "radial-gradient(130% 120% at 20% 15%, #C98A5E 0%, #B5764B 48%, #8C4A2A 100%)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/union-yoga-mark-cream.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute bottom-[-11vh] left-[-4.7vw] h-[52vh] w-auto opacity-[0.10]"
      />
      <div className="absolute top-1/2 right-[6.25vw] left-[6.25vw] -translate-y-1/2 text-right">
        <p className="font-serif text-[3.1vw] leading-none font-medium text-cream">
          Free classes for two weeks
        </p>
        <h1 className="mt-[2.4vh] font-serif text-[8.1vw] leading-[0.9] font-semibold tracking-[-0.02em] text-cream">
          Bring someone
          <br />
          to the mat.
        </h1>
        <p className="mt-[3.4vh] font-sans text-[2.05vw] font-light text-cream/85">
          Every class at Union, on us. August 24 – September 4.
        </p>
      </div>
    </div>
  );
}

const SLIDES: ReactNode[] = [<SlideForest key="f" />, <SlideCream key="c" />, <SlideClay key="y" />];

export function Slideshow() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setActive((i) => (i + 1) % SLIDES.length);
    }, HOLD_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-cream">
      {SLIDES.map((slide, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-[1200ms] ease-in-out"
          style={{ opacity: i === active ? 1 : 0 }}
        >
          {slide}
        </div>
      ))}
    </div>
  );
}
