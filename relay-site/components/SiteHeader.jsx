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
  return (
    <header className="sticky top-0 z-20 bg-[color-mix(in_srgb,var(--bg)_75%,transparent)] backdrop-blur-md border-b border-line">
      <div className="max-w-[1120px] mx-auto px-6 flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2 font-display font-bold text-[1.15rem]">
          <span className="w-2.5 h-2.5 rounded-full bg-mint shadow-[0_0_10px_var(--mint)]" />
          Relay
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
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <Button as={Link} href="/dashboard" variant="ghost">
            Log in
          </Button>
          <Button as={Link} href="/dashboard?signup=1" variant="primary">
            Get started
          </Button>
        </div>
      </div>
    </header>
  );
}
