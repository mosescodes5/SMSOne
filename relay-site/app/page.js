import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import HeroDemoReel from "@/components/HeroDemoReel";
import GradientMesh from "@/components/GradientMesh";
import Reveal from "@/components/Reveal";
import HeroEntrance from "@/components/HeroEntrance";
import StatsRow from "@/components/StatsRow";
import AnimatedCounter from "@/components/AnimatedCounter";
import { Button, Card } from "@/components/ui";

const PRICES = [
  { service: "WhatsApp", country: "Nigeria", price: 700 },
  { service: "Google", country: "Nigeria", price: 450 },
  { service: "Facebook", country: "Nigeria", price: 380 },
  { service: "Telegram", country: "Nigeria", price: 300 },
];

const STEPS = [
  {
    num: "01",
    title: "Fund your wallet",
    body: "Top up in naira via card, bank transfer, or USSD — settles in seconds through Korapay.",
  },
  {
    num: "02",
    title: "Pick a service",
    body: "Choose the platform and country. See the exact naira price before you commit — no surprises after.",
  },
  {
    num: "03",
    title: "Receive your code",
    body: "Your number is reserved instantly. The code lands in your dashboard the moment it arrives — you're only charged once it does.",
  },
];

const FAQS = [
  {
    q: "How fast will I get my SMS?",
    a: "Usually within seconds — it works the same way a real SIM does. If nothing arrives before the order times out, you're refunded automatically, no request needed.",
  },
  {
    q: "What if no code ever arrives?",
    a: "You're only charged once a code lands. If your order times out or you cancel it, the full amount goes straight back to your wallet.",
  },
  {
    q: "Does my wallet balance expire?",
    a: "No. Funds sit in your wallet until you use them — there's no time limit.",
  },
  {
    q: "How do I pay?",
    a: "Card or bank transfer via Korapay, settled in naira in seconds.",
  },
  {
    q: "What if a service I need isn't listed?",
    a: "Reach out via the contact section below and we'll look into adding it.",
  },
];

export default function LandingPage() {
  return (
    <>
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <GradientMesh />
          <div className="max-w-[1320px] mx-auto px-6 pt-16 pb-16 md:pt-24 md:pb-20">
          <HeroEntrance>
            <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-14 items-center">
              <div>
                <span className="inline-flex items-center gap-2 text-[0.8rem] font-semibold text-mint bg-mint-soft px-3 py-1.5 rounded-full mb-5">
                  ● Live in Nigeria — naira wallet, instant top-up
                </span>
                <h1 className="text-[clamp(2.4rem,4.4vw,3.6rem)] mb-5">
                  Verification numbers that <span className="text-gradient">arrive</span>, priced like they should be.
                </h1>
                <p className="text-[1.1rem] text-ink-soft max-w-[46ch] mb-8 leading-relaxed">
                  Rent a number, get your code, done. SMSOne charges only when a code actually lands — no waiting on shared inboxes, no guessing what you&apos;ll pay.
                </p>
                <div className="flex gap-3 mb-9 flex-wrap">
                  <Button as={Link} href="/dashboard?signup=1" variant="primary">
                    Create free account
                  </Button>
                  <Button as="a" href="#pricing" variant="ghost">
                    See pricing
                  </Button>
                </div>
                <StatsRow />
              </div>

              <div className="glass rounded-[28px] p-5 shadow-[var(--shadow-soft)] max-w-[340px] mx-auto w-full">
                <div className="flex justify-between items-center px-2 pb-4">
                  <span className="text-[0.8rem] font-semibold text-ink-soft">9:41</span>
                  <span className="text-[0.8rem] font-semibold text-ink-soft">●●●</span>
                </div>
                <div className="bg-bg-elevated rounded-2xl p-4 border border-line">
                  <div className="text-[0.75rem] font-semibold text-ink-faint uppercase tracking-wide mb-2">
                    WhatsApp
                  </div>
                  <div className="text-[0.9rem] text-ink mb-3">
                    Your code is below. Don&apos;t share it with anyone.
                  </div>
                  <div className="text-[0.72rem] text-ink-faint uppercase tracking-wide mb-2">
                    Verification code
                  </div>
                  <HeroDemoReel />
                </div>
              </div>
            </div>
          </HeroEntrance>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="max-w-[1320px] mx-auto px-6 py-16">
          <Reveal className="max-w-[60ch] mb-11">
            <span className="block text-[0.8rem] font-bold text-signal uppercase tracking-wider mb-2.5">
              How it works
            </span>
            <h2 className="text-[clamp(1.7rem,3vw,2.3rem)] mb-3">Three steps, no account juggling</h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <Reveal key={s.num} delay={i * 0.08} className="pt-2">
                <span className="block font-mono text-[0.85rem] text-mint font-semibold mb-2.5">
                  {s.num}
                </span>
                <h3 className="text-[1.15rem] mb-2">{s.title}</h3>
                <p>{s.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="max-w-[1320px] mx-auto px-6 py-16">
          <Reveal className="max-w-[60ch] mb-11">
            <span className="block text-[0.8rem] font-bold text-signal uppercase tracking-wider mb-2.5">
              Pricing
            </span>
            <h2 className="text-[clamp(1.7rem,3vw,2.3rem)] mb-3">What you&apos;ll actually pay</h2>
          </Reveal>
          <Reveal className="border border-line rounded-2xl overflow-hidden bg-surface">
            <div className="grid grid-cols-3 items-center px-5 py-3.5 bg-bg-elevated text-[0.78rem] font-bold uppercase tracking-wide text-ink-faint">
              <div>Service</div>
              <div>Country</div>
              <div>Price</div>
            </div>
            {PRICES.map((p, i) => (
              <div
                key={p.service}
                className={`grid grid-cols-3 items-center px-5 py-4 ${
                  i !== PRICES.length - 1 ? "border-b border-line" : ""
                }`}
              >
                <div className="font-semibold">{p.service}</div>
                <div className="text-ink-soft">{p.country}</div>
                <div className="font-mono font-semibold text-amber">
                  <AnimatedCounter value={p.price} prefix="₦" />
                </div>
              </div>
            ))}
          </Reveal>
          <p className="text-[0.85rem] mt-3.5 text-ink-soft">
            Live prices are pulled per order and can shift with wholesale supply — what you see at checkout is what you pay.
          </p>
        </section>

        {/* Compare */}
        <section id="compare" className="max-w-[1320px] mx-auto px-6 py-16">
          <Reveal className="max-w-[60ch] mb-11">
            <span className="block text-[0.8rem] font-bold text-signal uppercase tracking-wider mb-2.5">
              Why SMSOne
            </span>
            <h2 className="text-[clamp(1.7rem,3vw,2.3rem)] mb-3">
              Built around the moments that actually cost you money
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-5">
            <Reveal>
              <Card>
                <h4 className="text-[0.95rem] font-semibold text-ink-faint mb-3.5">SHARED / FREE POOLS</h4>
                <ul className="flex flex-col gap-2.5 text-[0.92rem] text-ink-soft">
                  <li>✕ Codes are visible to everyone using the number</li>
                  <li>✕ No refund — a used number is just gone</li>
                  <li>✕ No way to know if it&apos;ll work before you try</li>
                </ul>
              </Card>
            </Reveal>
            <Reveal delay={0.08}>
              <Card className="border-mint shadow-[0_0_0_1px_var(--mint)]">
                <h4 className="text-[0.95rem] font-semibold text-mint mb-3.5">RELAY</h4>
                <ul className="flex flex-col gap-2.5 text-[0.92rem]">
                  <li>✓ Private number, only your code</li>
                  <li>✓ Auto-refunded if nothing arrives in time</li>
                  <li>✓ Exact naira price shown before you buy</li>
                </ul>
              </Card>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="max-w-[1320px] mx-auto px-6 py-16">
          <Reveal className="max-w-[60ch] mb-11">
            <span className="block text-[0.8rem] font-bold text-signal uppercase tracking-wider mb-2.5">
              FAQ
            </span>
            <h2 className="text-[clamp(1.7rem,3vw,2.3rem)] mb-3">Questions people actually ask</h2>
          </Reveal>
          <div className="flex flex-col gap-2.5 max-w-[640px]">
            {FAQS.map((f, i) => (
              <Reveal key={f.q} delay={i * 0.04}>
                <details className="bg-surface border border-line rounded-lg px-5 py-4 group">
                  <summary className="font-semibold cursor-pointer list-none flex justify-between items-center">
                    {f.q}
                    <span className="text-ink-faint text-xl group-open:hidden">+</span>
                    <span className="text-ink-faint text-xl hidden group-open:inline">−</span>
                  </summary>
                  <p className="mt-3 text-ink-soft">{f.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="max-w-[1320px] mx-auto px-6 py-16">
          <Reveal className="max-w-[60ch] mb-11">
            <span className="block text-[0.8rem] font-bold text-signal uppercase tracking-wider mb-2.5">
              Contact
            </span>
            <h2 className="text-[clamp(1.7rem,3vw,2.3rem)] mb-3">Get in touch</h2>
          </Reveal>
          <Reveal>
            <Card className="max-w-[420px]">
              <p className="mb-2 text-ink-soft">Questions about an order, a refund, or anything else — we usually reply within a day.</p>
              <p><strong className="text-ink">Email:</strong> <span className="text-ink-soft">[support@yourdomain.com]</span></p>
              <p><strong className="text-ink">Telegram:</strong> <span className="text-ink-soft">[@yourhandle]</span></p>
            </Card>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
