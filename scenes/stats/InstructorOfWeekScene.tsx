import type { FrameSnapshot } from "@/lib/data/snapshot-types";
import { SceneShell } from "../_core/SceneShell";

export function InstructorOfWeekScene({ snapshot }: { snapshot: FrameSnapshot }) {
  const i = snapshot.instructorOfWeek;
  if (!i || i.sessionCount < 2) return null;

  return (
    <SceneShell snapshot={snapshot}>
      <p className="mb-6 font-sans text-[clamp(12px,1.1vw,16px)] font-semibold tracking-[0.2em] text-clay uppercase">
        On the schedule
      </p>
      <h2 className="font-serif text-[clamp(48px,6vw,96px)] leading-[1.02] text-forest-deep">
        {i.name}
      </h2>
      <p className="mt-10 font-serif text-[clamp(28px,3.2vw,52px)] leading-snug text-moss">
        {i.sessionCount} classes this week in the room.
      </p>
    </SceneShell>
  );
}
