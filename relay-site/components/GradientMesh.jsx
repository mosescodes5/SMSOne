"use client";

import { motion } from "framer-motion";

/**
 * Ambient background glow for the hero — two soft, slowly-drifting radial
 * blobs in the signal gradient colors. Pure decoration, sits behind content
 * with pointer-events disabled, respects reduced-motion via CSS media query.
 */
export default function GradientMesh() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      <motion.div
        className="absolute w-[560px] h-[560px] rounded-full opacity-30 blur-[110px]"
        style={{ background: "var(--signal-from)", top: "-160px", left: "-120px" }}
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-[480px] h-[480px] rounded-full opacity-25 blur-[110px]"
        style={{ background: "var(--signal-to)", top: "40px", right: "-140px" }}
        animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
