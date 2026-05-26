import type { FrameSnapshot } from "@/lib/data/snapshot-types";
import { SceneShell } from "../_core/SceneShell";

export function StreakScene({ snapshot }: { snapshot: FrameSnapshot }) {
  const s = snapshot.weekStreakHonorees[0];
  if (!s) return null;

  return (
    <SceneShell snapshot={snapshot}>
      <p className="mb-6 font-sans text-[clamp(12px,1.1vw,16px)] font-semibold tracking-[0.2em] text-clay uppercase">
        Streak
      </p>
      <h2 className="font-serif text-[clamp(52px,6.5vw,100px)] leading-[1.02] text-forest-deep">
        {s.firstName}
        {s.lastInitial ? ` ${s.lastInitial}.` : ""}
      </h2>
      <p className="mt-10 font-serif text-[clamp(28px,3.2vw,52px)] leading-snug text-moss">
        {s.checkIns1Week} classes this week. That&apos;s a habit.
      </p>
    </SceneShell>
  );
}
