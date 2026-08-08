import Link from "next/link";
import { Button } from "@/components/ui";

export const metadata = {
  title: "SMSOne — Terms, Privacy & Refund Policy",
};

const NAV = [
  { group: "Terms" },
  { href: "#acceptance", label: "Acceptance" },
  { href: "#service", label: "The service" },
  { href: "#account", label: "Accounts & wallet" },
  { href: "#acceptable-use", label: "Acceptable use" },
  { href: "#payments", label: "Payments" },
  { href: "#refunds", label: "Refund policy" },
  { href: "#delivery", label: "Delivery policy" },
  { href: "#liability", label: "Liability" },
  { group: "Privacy" },
  { href: "#privacy", label: "Privacy policy" },
  { group: "More" },
  { href: "#changes", label: "Changes" },
  { href: "#contact", label: "Contact" },
];

function Section({ id, title, children }) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2 className="text-[1.3rem] mb-3.5">{title}</h2>
      <div className="text-ink-soft text-[0.95rem] leading-relaxed space-y-2.5 [&_h3]:text-ink [&_h3]:font-display [&_h3]:font-semibold [&_h3]:text-[1.05rem] [&_h3]:mt-5 [&_h3]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-signal [&_a]:underline">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <>
      <header className="sticky top-0 z-20 bg-[rgba(243,246,251,0.9)] backdrop-blur-sm border-b border-line">
        <div className="max-w-[1320px] mx-auto px-6 flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-2 font-display font-bold text-[1.1rem]">
            <span className="w-2.5 h-2.5 rounded-full bg-mint" />
            SMSOne
          </Link>
          <Button as={Link} href="/" variant="ghost">
            Back to home
          </Button>
        </div>
      </header>

      <div className="max-w-[1320px] mx-auto px-6 grid md:grid-cols-[220px_1fr] gap-12 py-12 pb-24">
        <nav className="hidden md:flex flex-col gap-1 sticky top-24 self-start">
          {NAV.map((item, i) =>
            item.group ? (
              <span
                key={i}
                className="text-[0.75rem] font-bold uppercase tracking-wider text-ink-faint mt-3.5 first:mt-0"
              >
                {item.group}
              </span>
            ) : (
              <a
                key={item.href}
                href={item.href}
                className="text-[0.88rem] text-ink-soft hover:text-ink py-1.5"
              >
                {item.label}
              </a>
            )
          )}
        </nav>

        <div>
          <h1 className="text-[2rem] mb-2">Terms, Privacy &amp; Policies</h1>
          <p className="text-[0.85rem] text-ink-faint mb-10">
            Last updated: [DATE] · SMSOne (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is operated from Nigeria.
          </p>

          <div className="bg-amber-soft border-l-[3px] border-amber px-4.5 py-3.5 rounded-r-lg mb-8">
            <p className="text-[0.9rem] text-ink">
              <strong>Before publishing:</strong> replace bracketed placeholders (company name, registration
              details, dates, contact info) and have this reviewed by a Nigerian lawyer before it goes live,
              particularly the sections on wallet funds and personal data.
            </p>
          </div>

          <Section id="acceptance" title="1. Acceptance of terms">
            <p>
              By creating an account or using SMSOne (&quot;the Service&quot;), you agree to these Terms. If you
              don&apos;t agree, don&apos;t use the Service. We may update these Terms from time to time — see{" "}
              <a href="#changes">Section 12</a>.
            </p>
          </Section>

          <Section id="service" title="2. What the Service does">
            <p>
              SMSOne provides temporary virtual phone numbers for the purpose of receiving one-time SMS
              verification codes (&quot;OTPs&quot;) from third-party platforms. You fund a wallet in Nigerian
              Naira (₦), select a service and country, and are assigned a number. If an SMS arrives within
              the order window, your wallet is charged the listed price. If nothing arrives before the order
              expires, you are automatically refunded in full.
            </p>
            <h3>2.1 Not affiliated with third-party platforms</h3>
            <p>
              SMSOne is not affiliated with, endorsed by, or connected to WhatsApp, Google, Facebook, Telegram,
              or any other platform referenced on this site. Those names are used only to describe which
              services a number can be used to verify.
            </p>
          </Section>

          <Section id="account" title="3. Accounts & wallet">
            <ul>
              <li>You must provide a valid email address and are responsible for keeping your login credentials secure.</li>
              <li>One account per person. We reserve the right to suspend accounts used to circumvent this.</li>
              <li>Your wallet balance does not expire and is not transferable to another user or convertible to cash except via a refund we issue directly.</li>
              <li>You are responsible for reviewing your wallet balance and order history; keep records for your own purposes as needed.</li>
            </ul>
          </Section>

          <Section id="acceptable-use" title="4. Acceptable use">
            <p>You agree to use the Service only for lawful purposes. Without limiting the above, you agree not to:</p>
            <ul>
              <li>Use SMSOne to facilitate fraud, harassment, spam, or any illegal activity;</li>
              <li>Use SMSOne in a way that violates the terms of service of the platform you&apos;re verifying with — compliance with those third-party terms is your responsibility, not ours;</li>
              <li>Attempt to resell, automate abuse of, or circumvent rate limits on the Service outside of any officially provided API access;</li>
              <li>Use another person&apos;s payment details or identity without authorization.</li>
            </ul>
            <p>
              We may suspend or terminate accounts we reasonably believe are being used to violate this
              section, without refund of any balance obtained through fraudulent means.
            </p>
          </Section>

          <Section id="payments" title="5. Payments">
            <p>
              Wallet top-ups are processed by Korapay, a third-party licensed payment processor. SMSOne does
              not store your card or bank details — that information is handled entirely by Korapay under
              its own security standards and terms. We only receive confirmation that a payment succeeded
              and the amount paid.
            </p>
            <p>
              Prices for verification numbers are shown in Naira before you confirm a purchase. The price
              shown at the time of purchase is the price charged if an SMS is received.
            </p>
          </Section>

          <Section id="refunds" title="6. Refund policy">
            <h3>6.1 Automatic refunds</h3>
            <p>
              You are only charged if an SMS code is successfully delivered to your assigned number within
              the order window (currently 10 minutes from purchase). If no code arrives before the order
              expires, the full amount is automatically returned to your wallet — no request needed.
            </p>
            <h3>6.2 Cancelling manually</h3>
            <p>You may cancel a pending order at any time before a code arrives. Cancelling refunds the order in full immediately.</p>
            <h3>6.3 What isn&apos;t refundable</h3>
            <p>
              Once a code has been successfully delivered to your number and your wallet charged, that
              specific order is final — the number performed as intended. If a code arrives but doesn&apos;t
              work with the platform you&apos;re verifying (e.g. it was entered incorrectly, or the platform
              itself rejected it for reasons unrelated to number delivery), contact support and we&apos;ll
              review it, but it isn&apos;t an automatic refund.
            </p>
            <h3>6.4 Wallet top-ups</h3>
            <p>
              Wallet top-ups themselves are non-refundable to your original payment method once completed,
              since the balance remains available in your wallet indefinitely for future orders. Contact
              support for exceptional circumstances.
            </p>
          </Section>

          <Section id="delivery" title="7. Delivery policy">
            <p>&quot;Delivery&quot; here refers to assignment of a virtual number and receipt of an SMS code, not a physical product.</p>
            <ul>
              <li>Numbers are typically assigned instantly upon purchase.</li>
              <li>SMS delivery time depends on the upstream carrier and the platform sending the code, and can range from seconds to several minutes.</li>
              <li>Number availability varies by service, country, and real-time carrier supply — a service may occasionally show as unavailable if no numbers are currently in stock.</li>
              <li>We do not guarantee that every order will receive a code; that&apos;s exactly why unfulfilled orders are refunded automatically (see <a href="#refunds">Section 6</a>).</li>
            </ul>
          </Section>

          <Section id="liability" title="8. Limitation of liability">
            <p>
              The Service is provided &quot;as is.&quot; To the fullest extent permitted by Nigerian law, SMSOne
              is not liable for indirect, incidental, or consequential damages arising from use of the
              Service, including account restrictions imposed by third-party platforms as a result of using
              a virtual number. Our total liability for any claim is limited to the amount you paid us in
              the 30 days preceding the claim.
            </p>
          </Section>

          <Section id="privacy" title="9. Privacy policy">
            <h3>9.1 What we collect</h3>
            <ul>
              <li><strong>Account data:</strong> email address, hashed password (we never store your plaintext password).</li>
              <li><strong>Transaction data:</strong> wallet top-ups, order history, ledger entries — kept for accounting and dispute-resolution purposes.</li>
              <li><strong>Payment data:</strong> handled by Korapay directly; we receive only confirmation of success/failure and amount, never your card or bank details.</li>
              <li><strong>Technical data:</strong> basic request logs (IP address, timestamps) for security and abuse prevention.</li>
            </ul>
            <h3>9.2 What we don&apos;t collect</h3>
            <p>We don&apos;t request government ID, phone number, or physical address to create an account. We don&apos;t sell your data to advertisers.</p>
            <h3>9.3 How we use it</h3>
            <p>To operate your account and wallet, process orders, prevent fraud/abuse, and respond to support requests. We may use your email to send order- or account-related notices; you can opt out of anything non-essential.</p>
            <h3>9.4 Your rights</h3>
            <p>
              You can request a copy of your data or request account deletion by contacting us (see{" "}
              <a href="#contact">Section 11</a>). We&apos;ll retain transaction records as required for
              accounting/legal purposes even after account deletion, per applicable Nigerian recordkeeping
              requirements.
            </p>
            <h3>9.5 Data protection</h3>
            <p>
              [Add your specific NDPR (Nigeria Data Protection Regulation) compliance details here — this
              typically requires appointing a Data Protection Officer or Compliance Organisation once
              you&apos;re processing personal data at scale. Confirm current requirements with a lawyer.]
            </p>
          </Section>

          <Section id="changes" title="10. Changes to these terms">
            <p>
              We may update these Terms as the Service evolves. Material changes will be posted here with
              an updated &quot;Last updated&quot; date. Continued use of the Service after changes take
              effect constitutes acceptance.
            </p>
          </Section>

          <Section id="contact" title="11. Contact">
            <p>Questions about these terms, a refund, or your data: [support email] or [Telegram handle].</p>
          </Section>
        </div>
      </div>
    </>
  );
}
