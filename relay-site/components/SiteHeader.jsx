"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "./ui";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#contact", label: "Contact" },
];

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 bg-[color-mix(in_srgb,var(--bg)_75%,transparent)] backdrop-blur-md border-b border-line">
      <div className="max-w-[1320px] mx-auto px-6 flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2 font-display font-bold text-[1.15rem]">
          <span className="w-2.5 h-2.5 rounded-full bg-mint shadow-[0_0_10px_var(--mint)]" />
          SMSOne
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[0.92rem] font-medium text-ink-soft hover:text-ink transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 md:gap-2.5">
          <ThemeToggle />
          <Button as={Link} href="/dashboard" variant="ghost" className="hidden sm:inline-flex">
            Log in
          </Button>
          <Button as={Link} href="/dashboard?signup=1" variant="primary" className="!px-3.5 sm:!px-5">
            Get started
          </Button>
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-line text-ink-soft hover:bg-surface-hover shrink-0"
          >
            {menuOpen ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M1.5 4H14.5M1.5 8H14.5M1.5 12H14.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-line px-6 py-4 flex flex-col gap-1 bg-bg">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="text-[0.95rem] font-medium text-ink-soft hover:text-ink py-2.5"
            >
              {l.label}
            </a>
          ))}
          <div className="sm:hidden pt-2 mt-1 border-t border-line">
            <Link
              href="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="block text-[0.95rem] font-medium text-ink-soft hover:text-ink py-2.5"
            >
              Log in
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
