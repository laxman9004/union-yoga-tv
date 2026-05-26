"use client";

import { motion } from "framer-motion";

export function HorizonDiagonalScene() {
  return (
    <div className="relative flex h-full w-full items-end justify-center overflow-hidden bg-cream pb-[12%]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #F4EFE6 0%, #EFE7D8 42%, #5C7060 42.2%, #2E4034 100%)",
        }}
      />
      <motion.p
        className="relative z-10 font-serif text-[clamp(22px,2.4vw,40px)] tracking-[0.25em] text-cream/90 uppercase"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 2.2 }}
      >
        Powell · Hot yoga
      </motion.p>
    </div>
  );
}
