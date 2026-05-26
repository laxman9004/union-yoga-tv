import type { FrameSnapshot } from "@/lib/data/snapshot-types";
import { SceneShell } from "../_core/SceneShell";

export function ClassCompositionScene({ snapshot }: { snapshot: FrameSnapshot }) {
  const u = snapshot.upcomingClass;
  if (!u) return null;

  const personality = snapshot.publishedCopy.classPersonality;
  const time = new Date(u.startTime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <SceneShell snapshot={snapshot}>
      <p className="mb-6 font-sans text-[clamp(12px,1.1vw,16px)] font-semibold tracking-[0.2em] text-clay uppercase">
        Tonight&apos;s room
      </p>
      <h2 className="font-serif text-[clamp(36px,4.5vw,72px)] leading-tight text-forest-deep">
        {u.classType}
      </h2>
      <p className="mt-6 font-sans text-[clamp(20px,1.8vw,28px)] text-moss">
        {time}
        {u.instructorName ? ` · ${u.instructorName}` : ""}
      </p>
      <div className="mt-10 flex flex-wrap gap-10 font-serif text-[clamp(28px,3vw,48px)] text-moss">
        <span>{u.regularCount} regulars</span>
        <span>{u.firstTimerCount} newer</span>
        <span>{u.checkedInCount} checked in</span>
      </div>
      {personality && (
        <p className="mt-12 max-w-3xl font-serif text-[clamp(22px,2.4vw,36px)] leading-snug text-ink/90">
          {personality}
        </p>
      )}
    </SceneShell>
  );
}
