"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { FrameSnapshot } from "@/lib/data/snapshot-types";
import { ClayOrbScene } from "@/scenes/ambient/ClayOrb";
import { HorizonDiagonalScene } from "@/scenes/ambient/HorizonDiagonal";
import { ReverseTestimonialScene } from "@/scenes/copy/ReverseTestimonialScene";
import { SweatForecastScene } from "@/scenes/copy/SweatForecastScene";
import { ClassCompositionScene } from "@/scenes/stats/ClassCompositionScene";
import { InstructorOfWeekScene } from "@/scenes/stats/InstructorOfWeekScene";
import { MilestoneScene } from "@/scenes/stats/MilestoneScene";
import { PopularClassScene } from "@/scenes/stats/PopularClassScene";
import { StudioAnniversaryScene } from "@/scenes/stats/StudioAnniversaryScene";
import { WhiteboardScene } from "@/scenes/stats/WhiteboardScene";
import { BirthdayScene } from "@/scenes/welcome/BirthdayScene";
import { BringAFriendScene } from "@/scenes/welcome/BringAFriendScene";
import { StreakScene } from "@/scenes/welcome/StreakScene";
import { WelcomeFirstTimerScene } from "@/scenes/welcome/WelcomeFirstTimerScene";
import { WelcomeReturningScene } from "@/scenes/welcome/WelcomeReturningScene";

type SceneItem = {
  id: string;
  duration: number;
  priority: number;
  render: () => React.ReactNode;
};

export function DisplayRotator({ snapshot }: { snapshot: FrameSnapshot }) {
  const scenes = useMemo(() => {
    const list: SceneItem[] = [
      {
        id: "ambient-clay",
        duration: 18,
        priority: 0,
        render: () => <ClayOrbScene />,
      },
      {
        id: "ambient-horizon",
        duration: 16,
        priority: 0,
        render: () => <HorizonDiagonalScene />,
      },
    ];

    if (snapshot.publishedCopy.sweatForecast) {
      list.push({
        id: "sweat-forecast",
        duration: 14,
        priority: 5,
        render: () => <SweatForecastScene snapshot={snapshot} />,
      });
    }
    if (snapshot.publishedCopy.reverseTestimonials.length > 0) {
      list.push({
        id: "reverse-testimonial",
        duration: 20,
        priority: 5,
        render: () => <ReverseTestimonialScene snapshot={snapshot} />,
      });
    }
    if (snapshot.studioAnniversary) {
      list.push({
        id: "studio-anniversary",
        duration: 16,
        priority: 15,
        render: () => <StudioAnniversaryScene snapshot={snapshot} />,
      });
    }
    if (snapshot.firstTimersToday.length > 0) {
      list.push({
        id: "welcome-first",
        duration: 18,
        priority: 95,
        render: () => <WelcomeFirstTimerScene snapshot={snapshot} />,
      });
    }
    if (snapshot.todaysCheckIns.length > 0) {
      list.push({
        id: "welcome-returning",
        duration: 18,
        priority: 90,
        render: () => <WelcomeReturningScene snapshot={snapshot} />,
      });
    }
    if (snapshot.birthdaysToday.length > 0) {
      list.push({
        id: "birthday",
        duration: 16,
        priority: 88,
        render: () => <BirthdayScene snapshot={snapshot} />,
      });
    }
    if (snapshot.guestCheckInsToday.length > 0) {
      list.push({
        id: "bring-a-friend",
        duration: 16,
        priority: 85,
        render: () => <BringAFriendScene snapshot={snapshot} />,
      });
    }
    if (snapshot.weekStreakHonorees.length > 0) {
      list.push({
        id: "streak",
        duration: 15,
        priority: 82,
        render: () => <StreakScene snapshot={snapshot} />,
      });
    }
    const milestone =
      snapshot.milestonesHitToday[0] ?? snapshot.nearMilestones[0];
    if (milestone) {
      list.push({
        id: "milestone",
        duration: 15,
        priority: 80,
        render: () => <MilestoneScene snapshot={snapshot} />,
      });
    }
    if (snapshot.upcomingClass) {
      list.push({
        id: "class-composition",
        duration: 18,
        priority: 12,
        render: () => <ClassCompositionScene snapshot={snapshot} />,
      });
    }
    if (snapshot.instructorOfWeek) {
      list.push({
        id: "instructor-week",
        duration: 16,
        priority: 8,
        render: () => <InstructorOfWeekScene snapshot={snapshot} />,
      });
    }
    if (snapshot.topThisWeek.length > 0) {
      list.push({
        id: "whiteboard",
        duration: 22,
        priority: 10,
        render: () => <WhiteboardScene snapshot={snapshot} />,
      });
    }
    if (snapshot.popularClassThisWeek) {
      list.push({
        id: "popular-class",
        duration: 18,
        priority: 10,
        render: () => <PopularClassScene snapshot={snapshot} />,
      });
    }

    return list.sort((a, b) => b.priority - a.priority);
  }, [snapshot]);

  const [index, setIndex] = useState(0);
  const scene = scenes[index] ?? scenes[0];

  useEffect(() => {
    if (!scene) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % scenes.length);
    }, scene.duration * 1000);
    return () => clearInterval(t);
  }, [scene, scenes.length]);

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
