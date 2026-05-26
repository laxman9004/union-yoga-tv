"use client";

import { useEffect, useState } from "react";
import type { FrameSnapshot } from "@/lib/data/snapshot-types";
import { SceneShell } from "../_core/SceneShell";

export function ReverseTestimonialScene({ snapshot }: { snapshot: FrameSnapshot }) {
  const lines = snapshot.publishedCopy.reverseTestimonials;
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (lines.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % lines.length), 8000);
    return () => clearInterval(t);
  }, [lines.length]);

  if (!lines.length) return null;
  const line = lines[idx % lines.length];

  return (
    <SceneShell snapshot={snapshot}>
      <p className="mb-8 font-sans text-[clamp(12px,1.1vw,16px)] font-semibold tracking-[0.2em] text-clay uppercase">
        What people say
      </p>
      <blockquote className="max-w-4xl font-serif text-[clamp(32px,3.8vw,64px)] leading-snug text-forest-deep">
        &ldquo;{line}&rdquo;
      </blockquote>
    </SceneShell>
  );
}
