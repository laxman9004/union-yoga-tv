import type { FrameSnapshot } from "@/lib/data/snapshot-types";
import { SceneShell } from "../_core/SceneShell";

export function SweatForecastScene({ snapshot }: { snapshot: FrameSnapshot }) {
  const line = snapshot.publishedCopy.sweatForecast;
  if (!line) return null;

  return (
    <SceneShell snapshot={snapshot}>
      <p className="mb-6 font-sans text-[clamp(12px,1.1vw,16px)] font-semibold tracking-[0.2em] text-clay uppercase">
        Sweat forecast
      </p>
      <h2 className="max-w-4xl font-serif text-[clamp(40px,5vw,80px)] leading-[1.08] text-forest-deep">
        {line}
      </h2>
    </SceneShell>
  );
}
