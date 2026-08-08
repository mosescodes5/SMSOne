"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import DigitReel from "@/components/DigitReel";
import { Button, Card, Field, Input, Select, Pill } from "@/components/ui";
import * as api from "@/lib/api";
import { supabase } from "@/lib/supabase";

const SERVICES = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "google", label: "Google" },
  { id: "facebook", label: "Facebook" },
  { id: "telegram", label: "Telegram" },
];

const STATUS_MAP = {
  pending: ["amber", "Waiting for code…"],
  received: ["mint", "Code received"],
  expired: ["red", "Timed out — refunded"],
  cancelled: ["neutral", "Cancelled — refunded"],
};

function formatNgn(amount) {
  return `₦${Number(amount).toLocaleString("en-NG")}`;
}

export default function DashboardPage() {
  // `undefined` = not checked yet, `null` = logged out, object = logged in.
  // Supabase's session check is inherently async (it may need to hit the
  // network to refresh a token), so unlike the token-in-localStorage version
  // this can't be read synchronously via useSyncExternalStore — this
  // effect+subscribe pattern is Supabase's own documented approach for
  // tracking auth state in React.
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    // Initial session check requires an async call; setSession here (inside
    // .then, not the effect body directly) mirrors Supabase's documented
    // getSession()+onAuthStateChange pattern for tracking auth in React.
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null; // avoid an auth-screen flash while checking

  return session ? (
    <DashboardShell />
  ) : (
    <Suspense fallback={null}>
      <AuthScreen />
    </Suspense>
  );
}

// ---------- Auth screen ----------

function AuthScreen() {
  const params = useSearchParams();
  const [mode, setMode] = useState(params.get("signup") === "1" ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const result = await api.register(email, password);
        if (result.needsEmailConfirmation) {
          // No session yet — Supabase project has email confirmation on.
          // onAuthStateChange in the parent won't fire until they click the
          // link, so show that state explicitly rather than looking stuck.
          setConfirmSent(true);
        }
        // If confirmation isn't required, signUp already returned a session
        // and onAuthStateChange in the parent picks it up automatically.
      } else {
        await api.login(email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (confirmSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-[380px] text-center">
          <h3 className="text-[1.1rem] mb-2">Check your email</h3>
          <p>We sent a confirmation link to <strong className="text-ink">{email}</strong>. Click it to finish creating your account.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-[380px]">
        <div className="flex gap-1 bg-bg-elevated p-1 rounded-[10px] mb-6">
          {["login", "signup"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 py-2.5 rounded-[7px] font-semibold text-[0.88rem] transition-colors ${
                mode === m ? "bg-surface text-ink shadow-sm" : "text-ink-soft"
              }`}
            >
              {m === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit}>
          <Field label="Email">
            <Input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && (
            <div className="bg-red-soft text-red text-[0.85rem] px-3 py-2.5 rounded-lg mb-3.5">
              {error}
            </div>
          )}
          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

// ---------- Dashboard shell ----------

function DashboardShell() {
  const [view, setView] = useState("buy");
  const [balance, setBalance] = useState(null);
  const [topupOpen, setTopupOpen] = useState(false);

  const refreshBalance = useCallback(async () => {
    try {
      const data = await api.getBalance();
      setBalance(data.wallet_balance_ngn);
    } catch (err) {
      if (String(err.message).includes("validate credentials") || String(err.message).includes("Not logged in")) {
        api.logout();
      }
    }
  }, []);

  // Standard "fetch on mount" pattern: refreshBalance calls setState from
  // inside an async function's .then, not synchronously in the effect body,
  // which is the pattern React's own data-fetching docs recommend.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshBalance();
  }, [refreshBalance]);

  function handleLogout() {
    api.logout();
  }

  return (
    <div className="grid md:grid-cols-[220px_1fr] min-h-screen">
      <aside className="border-r border-line p-6 flex md:flex-col justify-between md:justify-start gap-6 items-center md:items-stretch">
        <div className="flex items-center gap-2 font-display font-bold text-[1.1rem]">
          <span className="w-2.5 h-2.5 rounded-full bg-mint" />
          Relay
        </div>
        <nav className="hidden md:flex flex-col gap-1 flex-1">
          <button
            onClick={() => setView("buy")}
            className={`text-left px-3 py-2.5 rounded-lg text-[0.9rem] font-medium transition-colors ${
              view === "buy" ? "gradient-signal text-white" : "text-ink-soft hover:bg-surface-hover hover:text-ink"
            }`}
          >
            Buy a number
          </button>
          <button
            onClick={() => setView("ledger")}
            className={`text-left px-3 py-2.5 rounded-lg text-[0.9rem] font-medium transition-colors ${
              view === "ledger" ? "gradient-signal text-white" : "text-ink-soft hover:bg-surface-hover hover:text-ink"
            }`}
          >
            Wallet history
          </button>
        </nav>
        <Button variant="ghost" onClick={handleLogout} className="w-auto md:w-full">
          Log out
        </Button>
      </aside>

      <main className="p-6 md:p-10">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <div className="text-[0.8rem] text-ink-faint font-semibold uppercase tracking-wide mb-1">
              Wallet balance
            </div>
            <div className="font-mono text-[1.8rem] font-semibold">
              {balance === null ? "₦ —" : formatNgn(balance)}
            </div>
          </div>
          <Button variant="green" onClick={() => setTopupOpen(true)}>
            Top up
          </Button>
        </div>

        {view === "buy" ? (
          <BuyView onBalanceChange={refreshBalance} />
        ) : (
          <LedgerView />
        )}
      </main>

      {topupOpen && (
        <TopupModal onClose={() => setTopupOpen(false)} />
      )}
    </div>
  );
}

// ---------- Buy view ----------

function BuyView({ onBalanceChange }) {
  const [service, setService] = useState(SERVICES[0].id);
  const [country] = useState("nigeria");
  const [priceState, setPriceState] = useState({ price: null, error: null });
  const [order, setOrder] = useState(null);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState(null);

  // Poll the active order until it's no longer pending.
  useEffect(() => {
    if (!order || order.status !== "pending") return;
    const interval = setInterval(async () => {
      try {
        const updated = await api.checkOrder(order.id);
        setOrder(updated);
        if (updated.status !== "pending") {
          onBalanceChange();
        }
      } catch (_) {
        clearInterval(interval);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [order, onBalanceChange]);

  async function handleBuy() {
    setBuying(true);
    setBuyError(null);
    try {
      const newOrder = await api.buyNumber(service, country);
      setOrder(newOrder);
      onBalanceChange();
    } catch (err) {
      setBuyError(err.message);
    } finally {
      setBuying(false);
    }
  }

  async function handleCancel() {
    try {
      const updated = await api.cancelOrder(order.id);
      setOrder(updated);
      onBalanceChange();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-6 items-start">
      <Card>
        <h3 className="text-[1.1rem] mb-1.5">Buy a number</h3>
        <p className="mb-5">Pick a service, see the price, then reserve a number.</p>

        <Field label="Service">
          <Select value={service} onChange={(e) => setService(e.target.value)}>
            {SERVICES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Country">
          <Select value={country} disabled>
            <option value="nigeria">Nigeria</option>
          </Select>
        </Field>

        <div className="text-[0.9rem] text-ink-soft my-3.5">
          <PricePreview key={`${service}-${country}`} service={service} country={country} onChange={setPriceState} />
        </div>

        <Button
          variant="primary"
          className="w-full"
          onClick={handleBuy}
          disabled={buying || !!priceState.error}
        >
          {buying ? "Reserving…" : "Reserve number"}
        </Button>

        {buyError && (
          <div className="bg-red-soft text-red text-[0.85rem] px-3 py-2.5 rounded-lg mt-3.5">
            {buyError}
          </div>
        )}
      </Card>

      {order && (
        <Card>
          <h3 className="text-[1.1rem] mb-1.5">Your number</h3>
          <div className="font-mono text-[1.3rem] font-semibold my-2 mb-4.5">{order.phone_number}</div>
          <div className="text-[0.72rem] text-ink-faint uppercase tracking-wide mb-2">
            Verification code
          </div>
          <DigitReel code={order.sms_code} arrived={order.status === "received"} />
          <div className="mt-3.5">
            {(() => {
              const [tone, label] = STATUS_MAP[order.status] || ["neutral", order.status];
              return <Pill tone={tone}>{label}</Pill>;
            })()}
          </div>
          {order.status === "pending" && (
            <Button variant="ghost" className="w-full mt-4" onClick={handleCancel}>
              Cancel &amp; refund
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}

// Remounted via `key={service+country}` in the parent, so switching services
// naturally resets to a fresh "loading" state instead of an effect resetting
// state synchronously (which the react-hooks lint rule flags).
function PricePreview({ service, country, onChange }) {
  const [price, setPrice] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .previewPrice(service, country)
      .then((data) => {
        if (cancelled) return;
        setPrice(data.price_ngn);
        onChange({ price: data.price_ngn, error: null });
      })
      .catch(() => {
        if (cancelled) return;
        const msg = "No numbers currently available for this service.";
        setError(msg);
        onChange({ price: null, error: msg });
      });
    return () => {
      cancelled = true;
    };
  }, [service, country, onChange]);

  if (error) return error;
  if (price === null) return "Checking price…";
  return (
    <>
      Price: <strong className="text-ink font-mono">{formatNgn(price)}</strong>
    </>
  );
}

// ---------- Ledger view ----------

const REASON_LABELS = {
  topup_dev: "Wallet top-up (test)",
  topup_korapay: "Wallet top-up",
  order_charge: "Number purchase",
  order_refund_timeout: "Refund — timed out",
  order_refund_cancelled: "Refund — cancelled",
};

function LedgerView() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getLedger().then(setRows).catch((err) => setError(err.message));
  }, []);

  return (
    <Card className="col-span-full">
      <h3 className="text-[1.1rem] mb-4">Wallet history</h3>
      {error && <p className="text-red">{error}</p>}
      {!error && rows === null && <p>Loading…</p>}
      {!error && rows && rows.length === 0 && <p>No transactions yet.</p>}
      {!error && rows && rows.length > 0 && (
        <table className="w-full border-collapse text-[0.88rem]">
          <thead>
            <tr>
              {["Date", "Reason", "Amount", "Balance after"].map((h) => (
                <th
                  key={h}
                  className="text-left text-ink-faint font-semibold text-[0.75rem] uppercase tracking-wide px-2.5 py-2 border-b border-line"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-2.5 py-2.5 border-b border-line">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="px-2.5 py-2.5 border-b border-line">
                  {REASON_LABELS[r.reason] || r.reason}
                </td>
                <td
                  className={`px-2.5 py-2.5 border-b border-line font-mono ${
                    r.amount_ngn >= 0 ? "text-mint" : "text-red"
                  }`}
                >
                  {r.amount_ngn >= 0 ? "+" : ""}
                  {formatNgn(r.amount_ngn)}
                </td>
                <td className="px-2.5 py-2.5 border-b border-line font-mono">
                  {formatNgn(r.balance_after_ngn)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

// ---------- Top-up modal ----------

function TopupModal({ onClose }) {
  const [amount, setAmount] = useState(2000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.initializeTopup(amount);
      if (res.checkout_url) {
        window.location.href = res.checkout_url;
      } else {
        throw new Error("No checkout URL returned — check your Korapay keys are configured.");
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-[rgba(16,23,40,0.4)] flex items-center justify-center z-50 p-5"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <Card className="w-full max-w-[380px]">
        <h3 className="text-[1.1rem] mb-1.5">Top up wallet</h3>
        <p className="mb-4.5">You&apos;ll be redirected to Korapay to complete payment.</p>
        <Field label="Amount (NGN)">
          <Input
            type="number"
            min={100}
            step={100}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="font-mono"
          />
        </Field>
        {error && (
          <div className="bg-red-soft text-red text-[0.85rem] px-3 py-2.5 rounded-lg mb-3.5">
            {error}
          </div>
        )}
        <div className="flex gap-2.5">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="green" className="flex-1" onClick={handleConfirm} disabled={loading}>
            {loading ? "Starting…" : "Continue to payment"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
