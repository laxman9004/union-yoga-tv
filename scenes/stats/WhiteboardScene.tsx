import type { FrameSnapshot } from "@/lib/data/snapshot-types";
import { SceneShell } from "../_core/SceneShell";

export function WhiteboardScene({ snapshot }: { snapshot: FrameSnapshot }) {
  const rows = snapshot.topThisWeek.slice(0, 8);
  return (
    <SceneShell snapshot={snapshot}>
      <p className="mb-6 font-sans text-[clamp(12px,1.1vw,16px)] font-semibold tracking-[0.2em] text-clay uppercase">
        This week
      </p>
      <h2 className="font-serif text-[clamp(40px,4.5vw,72px)] leading-[1.05] tracking-tight text-forest-deep">
        The whiteboard.
      </h2>
      <ul className="mt-12 space-y-5">
        {rows.length === 0 ? (
          <li className="font-sans text-moss text-xl">Import data to see leaders.</li>
        ) : (
          rows.map((r, i) => (
            <li
              key={r.memberId}
              className="flex items-baseline gap-6 font-sans text-[clamp(22px,2.2vw,36px)] text-ink"
            >
              <span className="w-10 font-serif text-clay">{i + 1}</span>
              <span className="font-serif text-[clamp(28px,3vw,48px)] text-forest-deep">
                {r.firstName}
                {r.lastInitial ? ` ${r.lastInitial}.` : ""}
              </span>
              <span className="ml-auto text-moss tabular-nums">{r.count}</span>
            </li>
          ))
        )}
      </ul>
    </SceneShell>
  );
}
