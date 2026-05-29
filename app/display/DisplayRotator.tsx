"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FrameSnapshot } from "@/lib/data/snapshot-types";
import { ClayOrbScene } from "@/scenes/ambient/ClayOrb";
import { HorizonDiagonalScene } from "@/scenes/ambient/HorizonDiagonal";
import { ReverseTestimonialScene } from "@/scenes/copy/ReverseTestimonialScene";
import { SweatForecastScene } from "@/scenes/copy/SweatForecastScene";
import { LineupItemScene } from "@/scenes/lineup/LineupItemScene";

type SceneItem = {
  id: string;
  duration: number;
  render: () => React.ReactNode;
};

function ambientScenes(snapshot: FrameSnapshot): SceneItem[] {
  const list: SceneItem[] = [
    { id: "ambient-clay", duration: 18, render: () => <ClayOrbScene /> },
    { id: "ambient-horizon", duration: 16, render: () => <HorizonDiagonalScene /> },
  ];
  if (snapshot.publishedCopy.sweatForecast) {
    list.push({
      id: "sweat-forecast",
      duration: 14,
      render: () => <SweatForecastScene snapshot={snapshot} />,
    });
  }
  if (snapshot.publishedCopy.reverseTestimonials.length > 0) {
    list.push({
      id: "reverse-testimonial",
      duration: 20,
      render: () => <ReverseTestimonialScene snapshot={snapshot} />,
    });
  }
  return list;
}

export function DisplayRotator({ snapshot }: { snapshot: FrameSnapshot }) {
  const router = useRouter();
  const lineup = snapshot.displayLineup;

  const scenes = useMemo(() => {
    if (lineup.mode === "class" && lineup.items.length > 0) {
      return lineup.items.map((item) => ({
        id: item.itemKey,
        duration: item.sceneKey === "room-overview" ? 20 : 16,
        render: () => <LineupItemScene snapshot={snapshot} item={item} />,
      }));
    }
    return ambientScenes(snapshot);
  }, [snapshot, lineup]);

  const [index, setIndex] = useState(0);
  const scene = scenes[index] ?? scenes[0];

  useEffect(() => {
    setIndex(0);
  }, [lineup.mode, lineup.activeClass?.classSessionId, scenes.length]);

  useEffect(() => {
    if (!scene) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % scenes.length);
    }, scene.duration * 1000);
    return () => clearInterval(t);
  }, [scene, scenes.length]);

  useEffect(() => {
    const t = setInterval(() => router.refresh(), 90_000);
    return () => clearInterval(t);
  }, [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "f") document.documentElement.requestFullscreen?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!scene) {
    return (
      <div className="flex h-full items-center justify-center bg-cream">
        <ClayOrbScene />
      </div>
    );
  }

  return (
    <main className="fixed inset-0 h-[100dvh] w-[100dvw] overflow-hidden bg-cream">
      <AnimatePresence mode="wait">
        <motion.div
          key={scene.id}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.75, ease: "easeInOut" }}
        >
          {scene.render()}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
