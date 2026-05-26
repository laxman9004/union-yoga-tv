import type { ReactNode } from "react";
import { formatAsOfLine, type FrameSnapshot } from "@/lib/data/snapshot-types";

type Props = {
  snapshot: FrameSnapshot;
  children: ReactNode;
  whisper?: boolean;
};

export function SceneShell({ snapshot, children, whisper = true }: Props) {
  return (
    <div className="flex h-full w-full flex-col justify-center bg-cream px-[8%] py-[10%] text-ink">
      <div className="flex-1 flex flex-col justify-center">{children}</div>
      {whisper && (
        <p className="mt-auto font-sans text-[clamp(11px,1vw,14px)] tracking-[0.12em] text-moss/70 uppercase">
          {formatAsOfLine(snapshot)}
        </p>
      )}
    </div>
  );
}
