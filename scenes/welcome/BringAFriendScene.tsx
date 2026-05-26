import type { FrameSnapshot } from "@/lib/data/snapshot-types";
import { SceneShell } from "../_core/SceneShell";

export function BringAFriendScene({ snapshot }: { snapshot: FrameSnapshot }) {
  const g = snapshot.guestCheckInsToday[0];
  if (!g) return null;

  const guest = g.guestFirstName ?? "A guest";
  const host = g.hostFirstName
    ? `${g.hostFirstName}${g.hostLastInitial ? ` ${g.hostLastInitial}.` : ""}`
    : "A member";

  return (
    <SceneShell snapshot={snapshot}>
      <p className="mb-6 font-sans text-[clamp(12px,1.1vw,16px)] font-semibold tracking-[0.2em] text-clay uppercase">
        Bring a friend
      </p>
      <h2 className="font-serif text-[clamp(44px,5.5vw,88px)] leading-[1.05] text-forest-deep">
        {guest}
      </h2>
      <p className="mt-10 font-serif text-[clamp(26px,3vw,48px)] leading-snug text-moss">
        showed up with {host}.
      </p>
      <p className="mt-6 font-sans text-[clamp(16px,1.4vw,22px)] text-moss/90">
        First class free · then $20 intro month.
      </p>
    </SceneShell>
  );
}
