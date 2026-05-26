import type { FrameSnapshot } from "@/lib/data/snapshot-types";
import { SceneShell } from "../_core/SceneShell";

export function MilestoneScene({ snapshot }: { snapshot: FrameSnapshot }) {
  const m = snapshot.nearMilestones[0];
  if (!m) return null;

  const hitting = m.classesUntil === 0;

  return (
    <SceneShell snapshot={snapshot}>
      <p className="mb-6 font-sans text-[clamp(12px,1.1vw,16px)] font-semibold tracking-[0.2em] text-clay uppercase">
        {hitting ? "Milestone" : "Almost there"}
      </p>
      <h2 className="font-serif text-[clamp(48px,6vw,96px)] leading-[1.02] tracking-tight text-forest-deep">
        {m.firstName}
        {m.lastInitial ? ` ${m.lastInitial}.` : ""}
      </h2>
      <p className="mt-8 max-w-3xl font-serif text-[clamp(28px,3.2vw,52px)] leading-snug text-moss">
        {hitting
          ? `Class #${m.target}. That's the one.`
          : `${m.classesUntil} more to class #${m.target}.`}
      </p>
      <p className="mt-6 font-sans text-[clamp(16px,1.4vw,22px)] text-moss">
        {m.lifetimeClassCount} classes and counting.
      </p>
    </SceneShell>
  );
}
