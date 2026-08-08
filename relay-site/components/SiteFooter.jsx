import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-line py-10 mt-10">
      <div className="max-w-[1120px] mx-auto px-6 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center text-[0.85rem] text-ink-faint">
        <span>Relay — verification numbers for Nigeria</span>
        <span className="flex gap-4.5">
          <Link href="/terms" className="hover:text-ink">Terms</Link>
          <Link href="/terms#privacy" className="hover:text-ink">Privacy</Link>
          <Link href="/terms#refunds" className="hover:text-ink">Refunds</Link>
        </span>
      </div>
    </footer>
  );
}
