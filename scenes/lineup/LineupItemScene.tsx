import type { FrameSnapshot } from "@/lib/data/snapshot-types";
import type { LineupDisplayItem } from "@/lib/data/lineup/types";
import { SceneShell } from "../_core/SceneShell";

type Props = {
  snapshot: FrameSnapshot;
  item: LineupDisplayItem;
};

export function LineupItemScene({ snapshot, item }: Props) {
  const p = item.payload;

  switch (item.sceneKey) {
    case "room-overview":
      return (
        <SceneShell snapshot={snapshot}>
          <p className="mb-6 font-sans text-[clamp(12px,1.1vw,16px)] font-semibold tracking-[0.2em] text-clay uppercase">
            Tonight&apos;s room
          </p>
          <h2 className="font-serif text-[clamp(36px,4.5vw,72px)] leading-tight text-forest-deep">
            {String(p.classType ?? "")}
          </h2>
          {p.instructorName ? (
            <p className="mt-6 font-sans text-[clamp(20px,1.8vw,28px)] text-moss">
              {String(p.instructorName)}
            </p>
          ) : null}
          <div className="mt-10 flex flex-wrap gap-10 font-serif text-[clamp(28px,3vw,48px)] text-moss">
            <span>{Number(p.regularCount)} regulars</span>
            <span>{Number(p.firstTimerCount)} newer</span>
            <span>{Number(p.checkedInCount)} checked in</span>
          </div>
        </SceneShell>
      );

    case "welcome-returning":
      return (
        <SceneShell snapshot={snapshot}>
          <p className="mb-6 font-sans text-[clamp(12px,1.1vw,16px)] font-semibold tracking-[0.2em] text-clay uppercase">
            Welcome back
          </p>
          <h2 className="font-serif text-[clamp(56px,7vw,110px)] leading-[1.02] text-forest-deep">
            {String(p.firstName)}
            {p.lastInitial ? ` ${String(p.lastInitial)}.` : ""}
          </h2>
          <p className="mt-10 font-serif text-[clamp(26px,3vw,48px)] leading-snug text-moss">
            Class #{Number(p.lifetimeClassCount)}
            {p.instructorName ? ` · ${String(p.instructorName)}` : ""}
          </p>
        </SceneShell>
      );

    case "welcome-first":
      return (
        <SceneShell snapshot={snapshot}>
          <p className="mb-6 font-sans text-[clamp(12px,1.1vw,16px)] font-semibold tracking-[0.2em] text-clay uppercase">
            First class
          </p>
          <h2 className="font-serif text-[clamp(56px,7vw,110px)] leading-[1.02] text-forest-deep">
            {String(p.firstName)}
            {p.lastInitial ? ` ${String(p.lastInitial)}.` : ""}
          </h2>
          <p className="mt-10 font-serif text-[clamp(26px,3vw,48px)] leading-snug text-moss">
            {Number(p.lifetimeClassCount) === 0 ? "Welcome in." : "Class one — you made it."}
          </p>
        </SceneShell>
      );

    case "birthday":
      return (
        <SceneShell snapshot={snapshot}>
          <p className="mb-6 font-sans text-[clamp(12px,1.1vw,16px)] font-semibold tracking-[0.2em] text-clay uppercase">
            Birthday
          </p>
          <h2 className="font-serif text-[clamp(52px,6.5vw,100px)] leading-[1.02] text-forest-deep">
            {String(p.firstName)}
            {p.lastInitial ? ` ${String(p.lastInitial)}.` : ""}
          </h2>
          <p className="mt-10 font-serif text-[clamp(28px,3.2vw,52px)] leading-snug text-moss">
            Another lap around the sun. The room&apos;s glad you&apos;re here.
          </p>
        </SceneShell>
      );

    case "bring-a-friend":
      return (
        <SceneShell snapshot={snapshot}>
          <p className="mb-6 font-sans text-[clamp(12px,1.1vw,16px)] font-semibold tracking-[0.2em] text-clay uppercase">
            Bring a friend
          </p>
          <h2 className="font-serif text-[clamp(44px,5.5vw,88px)] leading-[1.05] text-forest-deep">
            {String(p.guestFirstName ?? "A guest")}
          </h2>
          <p className="mt-10 font-serif text-[clamp(26px,3vw,48px)] leading-snug text-moss">
            showed up with {String(p.hostFirstName)}
            {p.hostLastInitial ? ` ${String(p.hostLastInitial)}.` : ""}.
          </p>
        </SceneShell>
      );

    case "streak":
      return (
        <SceneShell snapshot={snapshot}>
          <p className="mb-6 font-sans text-[clamp(12px,1.1vw,16px)] font-semibold tracking-[0.2em] text-clay uppercase">
            Streak
          </p>
          <h2 className="font-serif text-[clamp(52px,6.5vw,100px)] leading-[1.02] text-forest-deep">
            {String(p.firstName)}
            {p.lastInitial ? ` ${String(p.lastInitial)}.` : ""}
          </h2>
          <p className="mt-10 font-serif text-[clamp(28px,3.2vw,52px)] leading-snug text-moss">
            {Number(p.checkIns1Week)} classes this week. That&apos;s a habit.
          </p>
        </SceneShell>
      );

    case "milestone": {
      const until = Number(p.classesUntil);
      const hitting = until === 0;
      return (
        <SceneShell snapshot={snapshot}>
          <p className="mb-6 font-sans text-[clamp(12px,1.1vw,16px)] font-semibold tracking-[0.2em] text-clay uppercase">
            {hitting ? "Milestone" : "Almost there"}
          </p>
          <h2 className="font-serif text-[clamp(48px,6vw,96px)] leading-[1.02] text-forest-deep">
            {String(p.firstName)}
            {p.lastInitial ? ` ${String(p.lastInitial)}.` : ""}
          </h2>
          <p className="mt-8 font-serif text-[clamp(28px,3.2vw,52px)] leading-snug text-moss">
            {hitting
              ? `Class #${Number(p.target)}. That's the one.`
              : `${until} more to class #${Number(p.target)}.`}
          </p>
        </SceneShell>
      );
    }

    default:
      return null;
  }
}
