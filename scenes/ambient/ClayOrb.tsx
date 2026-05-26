"use client";

import { motion } from "framer-motion";

export const clayOrbScene = {
  id: "ambient-clay-orb",
  displayDuration: 20,
  priority: 0 as const,
};

export function ClayOrbScene() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-cream">
      <motion.div
        className="ambient-breathe absolute h-[min(55vw,55vh)] w-[min(55vw,55vh)] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, #d9a47a 0%, #b5764b 45%, rgba(181,118,75,0.15) 70%, transparent 100%)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
      />
      <p
        className="absolute bottom-[8%] font-serif text-[clamp(14px,1.2vw,22px)] tracking-[0.35em] text-moss/40 uppercase"
        aria-hidden
      >
        Union
      </p>
    </div>
  );
}
