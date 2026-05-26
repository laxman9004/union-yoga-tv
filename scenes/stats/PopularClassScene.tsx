import type { FrameSnapshot } from "@/lib/data/snapshot-types";
import { SceneShell } from "../_core/SceneShell";

export function PopularClassScene({ snapshot }: { snapshot: FrameSnapshot }) {
  const p = snapshot.popularClassThisWeek;
  if (!p) return null;

  return (
    <SceneShell snapshot={snapshot}>
      <p className="mb-6 font-sans text-[clamp(12px,1.1vw,16px)] font-semibold tracking-[0.2em] text-clay uppercase">
        This week at Union
      </p>
      <h2 className="max-w-5xl font-serif text-[clamp(40px,5vw,80px)] leading-[1.08] tracking-tight text-forest-deep">
        {p.classType} won.
      </h2>
      <p className="mt-10 font-serif text-[clamp(24px,2.8vw,44px)] italic text-moss">
        {p.count} classes on the schedule.
      </p>
    </SceneShell>
  );
}
