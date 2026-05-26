import type { FrameSnapshot } from "@/lib/data/snapshot-types";
import { SceneShell } from "../_core/SceneShell";

export function BirthdayScene({ snapshot }: { snapshot: FrameSnapshot }) {
  const b = snapshot.birthdaysToday[0];
  if (!b) return null;

  return (
    <SceneShell snapshot={snapshot}>
      <p className="mb-6 font-sans text-[clamp(12px,1.1vw,16px)] font-semibold tracking-[0.2em] text-clay uppercase">
        Birthday
      </p>
      <h2 className="font-serif text-[clamp(52px,6.5vw,100px)] leading-[1.02] text-forest-deep">
        {b.firstName}
        {b.lastInitial ? ` ${b.lastInitial}.` : ""}
      </h2>
      <p className="mt-10 font-serif text-[clamp(28px,3.2vw,52px)] leading-snug text-moss">
        Another lap around the sun. The room&apos;s glad you&apos;re here.
      </p>
    </SceneShell>
  );
}
