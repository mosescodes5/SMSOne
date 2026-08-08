"use client";

import { ShieldCheck, CreditCard } from "lucide-react";

/**
 * Honest trust signals, not vanity metrics. Deliberately not "500,000+
 * numbers sold" style stats — those would be fabricated for a new product
 * with no real numbers yet, which is a bad look on a site handling real
 * naira payments. Swap in real numbers here once they exist.
 */
export default function StatsRow() {
  const items = [
    { icon: ShieldCheck, label: "Refunded automatically on timeout" },
    { icon: CreditCard, label: "Pay with card, bank, or USSD" },
  ];
  return (
    <div className="flex gap-6 text-[0.85rem] text-ink-faint flex-wrap">
      {items.map(({ icon: Icon, label }) => (
        <span key={label} className="flex items-center gap-2">
          <Icon size={15} className="text-mint" />
          {label}
        </span>
      ))}
    </div>
  );
}
