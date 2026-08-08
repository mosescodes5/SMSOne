"use client";

import { motion } from "framer-motion";

const CHARS = ["-", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const SLOT_HEIGHT = 46;

/**
 * Odometer-style digit tumbler — the signature element. Each digit sits in
 * its own glass slot and slides into place. On arrival, slots pulse mint
 * once to mark the moment the code actually landed.
 */
export default function DigitReel({ code, length = 6, arrived = false }) {
  const digits = (code || "-".repeat(length)).split("").slice(0, length);
  while (digits.length < length) digits.push("-");

  const isEmpty = !code;

  return (
    <div
      className="inline-flex gap-1.5"
      aria-label={code ? `Code ${code}` : "Waiting for code"}
    >
      {digits.map((d, i) => {
        const idx = Math.max(CHARS.indexOf(d), 0);
        return (
          <motion.div
            key={i}
            initial={false}
            animate={
              arrived && !isEmpty
                ? { boxShadow: "0 0 0 1px rgba(52,216,166,0.5), 0 0 18px rgba(52,216,166,0.35)" }
                : { boxShadow: "0 0 0 1px var(--line)" }
            }
            transition={{ duration: 0.4, delay: i * 0.04 }}
            className={`relative w-[34px] h-[46px] overflow-hidden rounded-lg ${
              isEmpty ? "bg-bg-elevated" : "bg-surface"
            }`}
          >
            <div
              className="absolute top-0 left-0 w-full flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              style={{ transform: `translateY(-${idx * SLOT_HEIGHT}px)` }}
            >
              {CHARS.map((c) => (
                <span
                  key={c}
                  className={`h-[46px] flex items-center justify-center font-mono text-2xl font-semibold ${
                    isEmpty ? "text-ink-faint" : arrived ? "text-mint" : "text-ink"
                  }`}
                >
                  {c}
                </span>
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
