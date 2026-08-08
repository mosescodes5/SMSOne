"use client";

import { motion } from "framer-motion";

/**
 * One orchestrated entrance for the hero content — staggered fade+slide,
 * plays once on mount. This is the single "big motion moment" for the page;
 * everything else below uses the quieter scroll-triggered Reveal.
 */
export default function HeroEntrance({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
