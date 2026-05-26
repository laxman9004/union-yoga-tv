import type { FrameSnapshot } from "@/lib/data/snapshot-types";
import { SceneShell } from "../_core/SceneShell";

export function StudioAnniversaryScene({ snapshot }: { snapshot: FrameSnapshot }) {
  const a = snapshot.studioAnniversary;
  if (!a) return null;

  return (
    <SceneShell snapshot={snapshot}>
      <p className="mb-6 font-sans text-[clamp(12px,1.1vw,16px)] font-semibold tracking-[0.2em] text-clay uppercase">
        Union Yoga
      </p>
      <h2 className="font-serif text-[clamp(44px,5.5vw,88px)] leading-[1.05] text-forest-deep">
        {a.label}
      </h2>
      <p className="mt-10 max-w-3xl font-serif text-[clamp(26px,3vw,48px)] leading-snug text-moss">
        {a.detail}
      </p>
    </SceneShell>
  );
}
