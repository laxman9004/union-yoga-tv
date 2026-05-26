import type { FrameSnapshot } from "@/lib/data/snapshot-types";
import { SceneShell } from "../_core/SceneShell";

export function WelcomeFirstTimerScene({ snapshot }: { snapshot: FrameSnapshot }) {
  const c = snapshot.firstTimersToday[0];
  if (!c) return null;

  return (
    <SceneShell snapshot={snapshot}>
      <p className="mb-6 font-sans text-[clamp(12px,1.1vw,16px)] font-semibold tracking-[0.2em] text-clay uppercase">
        First class
      </p>
      <h2 className="font-serif text-[clamp(56px,7vw,110px)] leading-[1.02] text-forest-deep">
        {c.firstName}
        {c.lastInitial ? ` ${c.lastInitial}.` : ""}
      </h2>
      <p className="mt-10 font-serif text-[clamp(26px,3vw,48px)] leading-snug text-moss">
        {c.lifetimeClassCount === 0 ? "Welcome in." : "Class one — you made it."}
      </p>
      <p className="mt-4 font-sans text-[clamp(18px,1.6vw,26px)] text-moss/90">{c.classType}</p>
    </SceneShell>
  );
}
