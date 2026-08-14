"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, Field, Input, Pill } from "@/components/ui";
import * as api from "@/lib/api";
import { supabase } from "@/lib/supabase";

function formatNgn(amount) {
  return `₦${Number(amount).toLocaleString("en-NG")}`;
}

export default function AdminPage() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(undefined); // undefined = checking, null = not admin

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    api
      .getMyProfile()
      .then((p) => setProfile(p.is_admin ? p : null))
      .catch(() => setProfile(null));
  }, [session]);

  if (session === undefined || (session && profile === undefined)) return null;

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <Card className="max-w-[380px]">
          <h3 className="text-[1.1rem] mb-2">Log in required</h3>
          <p className="mb-4">You need to be logged in as an admin to view this page.</p>
          <Button as={Link} href="/dashboard" variant="primary" className="w-full">
            Go to login
          </Button>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <Card className="max-w-[380px]">
          <h3 className="text-[1.1rem] mb-2">Access denied</h3>
          <p className="mb-4">This account doesn&apos;t have admin access.</p>
          <Button as={Link} href="/dashboard" variant="ghost" className="w-full">
            Back to dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return <AdminShell />;
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "pricing", label: "Pricing" },
  { id: "links", label: "Site Links" },
  { id: "users", label: "Users" },
  { id: "orders", label: "Orders" },
];

function AdminShell() {
  const [tab, setTab] = useState("overview");

  return (
    <div className="md:grid md:grid-cols-[220px_1fr] min-h-screen">
      <aside className="border-r border-line p-6 hidden md:flex md:flex-col gap-6 items-stretch">
        <div>
          <div className="flex items-center gap-2 font-display font-bold text-[1.1rem] mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-signal" />
            Admin
          </div>
          <Link href="/dashboard" className="text-[0.78rem] text-ink-faint hover:text-ink-soft">
            ← Back to dashboard
          </Link>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-left px-3 py-2.5 rounded-lg text-[0.9rem] font-medium transition-colors ${
                tab === t.id ? "gradient-signal text-white" : "text-ink-soft hover:bg-surface-hover hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile header + horizontally-scrollable tab bar — the sidebar
          above is desktop-only, so this is the only way to switch tabs
          below the md breakpoint. */}
      <div className="md:hidden border-b border-line p-4">
        <div className="flex items-center gap-2 font-display font-bold text-[1.05rem] mb-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-signal" />
          Admin
          <Link href="/dashboard" className="ml-auto text-[0.78rem] font-normal text-ink-faint hover:text-ink-soft">
            ← Dashboard
          </Link>
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 px-3.5 py-2 rounded-full text-[0.85rem] font-semibold whitespace-nowrap transition-colors ${
                tab === t.id ? "gradient-signal text-white" : "border border-line text-ink-soft"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <main className="p-4 sm:p-6 md:p-10">
        <h2 className="text-[1.15rem] md:text-[1.3rem] font-display font-semibold mb-5 hidden md:block">
          {TABS.find((t) => t.id === tab)?.label}
        </h2>
        {tab === "overview" && <OverviewTab />}
        {tab === "pricing" && <PricingTab />}
        {tab === "links" && <LinksTab />}
        {tab === "users" && <UsersTab />}
        {tab === "orders" && <OrdersTab />}
      </main>
    </div>
  );
}

// ---------- Overview ----------

function OverviewTab() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getAdminStats().then(setStats).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="text-red">{error}</p>;
  if (!stats) return <p>Loading…</p>;

  const profitPositive = stats.total_profit_ngn >= 0;

  const cards = [
    { label: "Total users", value: stats.total_users.toLocaleString("en-NG") },
    { label: "Total orders", value: stats.total_orders.toLocaleString("en-NG") },
    { label: "Pending orders", value: stats.orders_pending.toLocaleString("en-NG") },
    { label: "Completed orders", value: stats.orders_received.toLocaleString("en-NG") },
    { label: "Total wallet balances", value: formatNgn(stats.total_wallet_balance_ngn) },
    { label: "Revenue (order charges)", value: formatNgn(stats.total_revenue_ngn) },
    { label: "Total top-ups", value: formatNgn(stats.total_topups_ngn) },
    { label: "Provider cost (received orders)", value: formatNgn(stats.total_provider_cost_ngn) },
  ];

  return (
    <div>
      <Card className="mb-4">
        <div className="text-[0.75rem] text-ink-faint font-semibold uppercase tracking-wide mb-1.5">
          Profit (received orders, at today&apos;s USD/NGN rate)
        </div>
        <div
          className={`font-mono text-[2rem] font-semibold mb-1 ${
            profitPositive ? "text-mint" : "text-red"
          }`}
        >
          {formatNgn(stats.total_profit_ngn)}
        </div>
        <Pill tone={profitPositive ? "mint" : "red"}>
          {stats.profit_margin_pct}% margin
        </Pill>
        <p className="text-[0.8rem] text-ink-faint mt-3">
          Revenue minus what received orders cost from your provider, converted at your current pricing rate. Older
          orders bought at a different USD/NGN rate are approximated at today&apos;s rate, not their original one —
          treat this as a running picture, not exact historical accounting.
        </p>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <div className="text-[0.75rem] text-ink-faint font-semibold uppercase tracking-wide mb-1.5">
              {c.label}
            </div>
            <div className="font-mono text-[1.5rem] font-semibold">{c.value}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------- Pricing ----------

const PRICING_FIELDS = [
  { key: "usd_ngn_rate", label: "USD → NGN rate", step: "1", hint: "Update this whenever the naira moves — it's the single biggest lever on your margin." },
  { key: "min_price_ngn", label: "Minimum price (₦)", step: "1", hint: "A floor — nothing ever sells below this, whatever a tier computes." },
];

function pickTierForCost(costNgn, tiers) {
  const ordered = [...tiers].sort((a, b) => {
    const aVal = a.max_cost_ngn == null ? Infinity : a.max_cost_ngn;
    const bVal = b.max_cost_ngn == null ? Infinity : b.max_cost_ngn;
    return aVal - bVal;
  });
  return ordered.find((t) => t.max_cost_ngn == null || costNgn <= t.max_cost_ngn) || ordered[ordered.length - 1];
}

function computePrice(costUsd, form) {
  const costNgn = costUsd * (form.usd_ngn_rate || 0);
  const tier = pickTierForCost(costNgn, form.tiers || []);
  if (!tier) return { costNgn, price: 0, margin: 0, marginPct: 0 };
  const withPercent = costNgn * (1 + (tier.markup_percent || 0) / 100);
  const withFlat = withPercent + (tier.markup_flat_ngn || 0);
  const price = Math.ceil(Math.max(withFlat, form.min_price_ngn || 0) / 10) * 10;
  const margin = price - costNgn;
  const marginPct = costNgn ? (margin / costNgn) * 100 : 0;
  return { costNgn, price, margin, marginPct };
}

function PricingTab() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [exampleCostUsd, setExampleCostUsd] = useState(0.3);

  useEffect(() => {
    api.getAdminPricing().then(setForm).catch((err) => setError(err.message));
  }, []);

  function updateTier(index, key, value) {
    const tiers = [...form.tiers];
    tiers[index] = { ...tiers[index], [key]: value };
    setForm({ ...form, tiers });
  }

  function addTier() {
    // New tier slots in just below the current top (catch-all) tier — give it
    // a real threshold and push the catch-all's numbers up, since a second
    // catch-all tier would never be reachable.
    const tiers = [...form.tiers];
    const last = tiers[tiers.length - 1];
    const insertAt = Math.max(0, tiers.length - 1);
    const priorMax = tiers.length >= 2 ? tiers[tiers.length - 2].max_cost_ngn : 0;
    const newThreshold = (priorMax || 0) + 1000;
    tiers.splice(insertAt, 0, {
      max_cost_ngn: newThreshold,
      markup_percent: last?.markup_percent ?? 45,
      markup_flat_ngn: last?.markup_flat_ngn ?? 500,
    });
    setForm({ ...form, tiers });
  }

  function removeTier(index) {
    if (form.tiers.length <= 1) return; // always keep at least one tier
    if (form.tiers[index].max_cost_ngn == null) return; // never remove the true catch-all
    const tiers = form.tiers.filter((_, i) => i !== index);
    setForm({ ...form, tiers });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await api.updateAdminPricing(form);
      setForm(updated);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (error && !form) return <p className="text-red">{error}</p>;
  if (!form) return <p>Loading…</p>;

  const sortedTiers = [...form.tiers].sort((a, b) => {
    const aVal = a.max_cost_ngn == null ? Infinity : a.max_cost_ngn;
    const bVal = b.max_cost_ngn == null ? Infinity : b.max_cost_ngn;
    return aVal - bVal;
  });
  const { costNgn, price, margin, marginPct } = computePrice(exampleCostUsd, form);

  return (
    <div className="grid md:grid-cols-2 gap-6 items-start">
      <div>
        <Card className="mb-6">
          <p className="mb-5 text-ink-soft">
            These apply immediately to every price shown and every number sold — no redeploy needed.
          </p>
          {PRICING_FIELDS.map((f) => (
            <Field key={f.key} label={f.label}>
              <Input
                type="number"
                step={f.step}
                value={form[f.key] ?? ""}
                onChange={(e) => setForm({ ...form, [f.key]: Number(e.target.value) })}
                className="font-mono w-full"
              />
              {f.hint && <p className="text-[0.78rem] text-ink-faint mt-1">{f.hint}</p>}
            </Field>
          ))}
        </Card>

        <Card>
          <h3 className="text-[1.1rem] mb-1.5">Price tiers</h3>
          <p className="mb-4 text-ink-soft">
            Bigger profit on expensive numbers, lighter markup on cheap ones. Each tier applies to your provider
            cost (in ₦, before markup) up to its threshold — the last tier (no threshold) catches everything above
            the others.
          </p>

          {sortedTiers.map((tier, i) => {
            const realIndex = form.tiers.indexOf(tier);
            const isLast = i === sortedTiers.length - 1;
            return (
              <div key={realIndex} className="border border-line rounded-xl p-3.5 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[0.82rem] font-semibold text-ink-soft">
                    {isLast
                      ? "Everything above other tiers"
                      : `Cost up to ₦${Number(tier.max_cost_ngn || 0).toLocaleString("en-NG")}`}
                  </div>
                  {form.tiers.length > 1 && tier.max_cost_ngn != null && (
                    <button
                      type="button"
                      onClick={() => removeTier(realIndex)}
                      className="text-[0.75rem] text-red hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {!isLast && (
                    <Field label="Cost up to (₦)">
                      <Input
                        type="number"
                        step="10"
                        value={tier.max_cost_ngn ?? ""}
                        onChange={(e) => updateTier(realIndex, "max_cost_ngn", Number(e.target.value))}
                        className="font-mono w-full"
                      />
                    </Field>
                  )}
                  <Field label="Markup (%)">
                    <Input
                      type="number"
                      step="1"
                      value={tier.markup_percent ?? ""}
                      onChange={(e) => updateTier(realIndex, "markup_percent", Number(e.target.value))}
                      className="font-mono w-full"
                    />
                  </Field>
                  <Field label="Flat extra (₦)">
                    <Input
                      type="number"
                      step="10"
                      value={tier.markup_flat_ngn ?? ""}
                      onChange={(e) => updateTier(realIndex, "markup_flat_ngn", Number(e.target.value))}
                      className="font-mono w-full"
                    />
                  </Field>
                </div>
              </div>
            );
          })}

          <Button type="button" variant="ghost" className="w-full mb-4" onClick={addTier}>
            + Add tier
          </Button>

          {error && (
            <div className="bg-red-soft text-red text-[0.85rem] px-3 py-2.5 rounded-lg mb-3.5">{error}</div>
          )}
          {saved && (
            <div className="bg-mint-soft text-mint text-[0.85rem] px-3 py-2.5 rounded-lg mb-3.5">Saved.</div>
          )}
          <Button variant="primary" className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save pricing"}
          </Button>
        </Card>
      </div>

      <Card className="md:sticky md:top-6">
        <h3 className="text-[1.1rem] mb-1.5">Live preview</h3>
        <p className="mb-4 text-ink-soft">See exactly what a given provider cost turns into with these settings.</p>
        <Field label="Example provider cost (USD)">
          <Input
            type="number"
            step="0.01"
            value={exampleCostUsd}
            onChange={(e) => setExampleCostUsd(Number(e.target.value))}
            className="font-mono w-full"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div>
            <div className="text-[0.72rem] text-ink-faint uppercase tracking-wide mb-1">Your cost</div>
            <div className="font-mono text-[1.2rem]">{formatNgn(costNgn.toFixed(0))}</div>
          </div>
          <div>
            <div className="text-[0.72rem] text-ink-faint uppercase tracking-wide mb-1">Customer pays</div>
            <div className="font-mono text-[1.2rem]">{formatNgn(price)}</div>
          </div>
          <div>
            <div className="text-[0.72rem] text-ink-faint uppercase tracking-wide mb-1">Your profit</div>
            <div className={`font-mono text-[1.2rem] ${margin >= 0 ? "text-mint" : "text-red"}`}>
              {formatNgn(margin.toFixed(0))}
            </div>
          </div>
          <div>
            <div className="text-[0.72rem] text-ink-faint uppercase tracking-wide mb-1">Margin</div>
            <Pill tone={margin >= 0 ? "mint" : "red"}>{marginPct.toFixed(0)}%</Pill>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ---------- Site links ----------

const LINK_FIELDS = [
  { key: "whatsapp_group_url", label: "WhatsApp group link" },
  { key: "telegram_url", label: "Telegram news channel" },
  { key: "support_ticket_url", label: "Support / ticket link" },
  { key: "support_email", label: "Support email" },
  { key: "support_phone", label: "Support phone number" },
];

function LinksTab() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getAdminSettings().then(setForm).catch((err) => setError(err.message));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await api.updateAdminSettings(form);
      setForm(updated);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (error && !form) return <p className="text-red">{error}</p>;
  if (!form) return <p>Loading…</p>;

  return (
    <Card className="max-w-[560px]">
      <p className="mb-5 text-ink-soft">
        These links show up across the site — in the dashboard sidebar, footer, and anywhere else they&apos;re referenced.
      </p>
      <form onSubmit={handleSave}>
        {LINK_FIELDS.map((f) => (
          <Field key={f.key} label={f.label}>
            <Input
              type="text"
              value={form[f.key] || ""}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              className="w-full"
            />
          </Field>
        ))}
        <Field label="Announcement banner (optional)">
          <Input
            type="text"
            placeholder="e.g. Scheduled maintenance tonight 11pm–1am"
            value={form.announcement || ""}
            onChange={(e) => setForm({ ...form, announcement: e.target.value })}
            className="w-full"
          />
        </Field>
        {error && (
          <div className="bg-red-soft text-red text-[0.85rem] px-3 py-2.5 rounded-lg mb-3.5">{error}</div>
        )}
        {saved && (
          <div className="bg-mint-soft text-mint text-[0.85rem] px-3 py-2.5 rounded-lg mb-3.5">Saved.</div>
        )}
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </Card>
  );
}

// ---------- Users ----------

function UsersTab() {
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState(null);
  const [adjustingUser, setAdjustingUser] = useState(null);

  const load = useCallback(() => {
    api.listAdminUsers(q).then(setUsers).catch((err) => setError(err.message));
  }, [q]);

  useEffect(() => {
    const timeout = setTimeout(load, 250); // light debounce while typing
    return () => clearTimeout(timeout);
  }, [load]);

  async function handleToggleAdmin(user) {
    try {
      const updated = await api.toggleUserAdmin(user.user_id);
      setUsers((rows) => rows.map((r) => (r.user_id === user.user_id ? updated : r)));
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleToggleSuspend(user) {
    try {
      const updated = user.is_suspended
        ? await api.unsuspendUser(user.user_id)
        : await api.suspendUser(user.user_id);
      setUsers((rows) => rows.map((r) => (r.user_id === user.user_id ? updated : r)));
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div>
      <div className="mb-4 max-w-[320px]">
        <Input
          type="text"
          placeholder="Search by email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full"
        />
      </div>
      <Card>
        {error && <p className="text-red">{error}</p>}
        {!error && users === null && <p>Loading…</p>}
        {!error && users && users.length === 0 && <p className="text-ink-soft">No users found.</p>}
        {!error && users && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[0.88rem]">
              <thead>
                <tr>
                  {["Email", "Balance", "Status", "Joined", ""].map((h) => (
                    <th
                      key={h}
                      className="text-left text-ink-faint font-semibold text-[0.75rem] uppercase tracking-wide px-2.5 py-2 border-b border-line whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.user_id}>
                    <td className="px-2.5 py-2.5 border-b border-line">{u.email || "—"}</td>
                    <td className="px-2.5 py-2.5 border-b border-line font-mono">{formatNgn(u.wallet_balance_ngn)}</td>
                    <td className="px-2.5 py-2.5 border-b border-line">
                      <div className="flex gap-1.5 flex-wrap">
                        {u.is_admin && <Pill tone="signal">Admin</Pill>}
                        {u.is_suspended && <Pill tone="red">Suspended</Pill>}
                        {!u.is_admin && !u.is_suspended && <Pill tone="neutral">Active</Pill>}
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5 border-b border-line whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-2.5 py-2.5 border-b border-line">
                      <div className="flex gap-1.5 flex-wrap">
                        <Button variant="ghost" className="!px-2.5 !py-1.5 !text-[0.78rem]" onClick={() => setAdjustingUser(u)}>
                          Adjust wallet
                        </Button>
                        <Button variant="ghost" className="!px-2.5 !py-1.5 !text-[0.78rem]" onClick={() => handleToggleSuspend(u)}>
                          {u.is_suspended ? "Unsuspend" : "Suspend"}
                        </Button>
                        <Button variant="ghost" className="!px-2.5 !py-1.5 !text-[0.78rem]" onClick={() => handleToggleAdmin(u)}>
                          {u.is_admin ? "Revoke admin" : "Make admin"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {adjustingUser && (
        <AdjustWalletModal
          user={adjustingUser}
          onClose={() => setAdjustingUser(null)}
          onDone={(updated) => {
            setUsers((rows) => rows.map((r) => (r.user_id === updated.user_id ? updated : r)));
            setAdjustingUser(null);
          }}
        />
      )}
    </div>
  );
}

function AdjustWalletModal({ user, onClose, onDone }) {
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!amount) {
      setError("Enter a non-zero amount — positive to credit, negative to debit.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const updated = await api.adjustUserWallet(user.user_id, Number(amount), reason);
      onDone(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-[rgba(16,23,40,0.4)] flex items-center justify-center z-50 p-5"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <Card className="w-full max-w-[380px]">
        <h3 className="text-[1.1rem] mb-1.5">Adjust wallet</h3>
        <p className="mb-4.5">
          <strong className="text-ink">{user.email}</strong> — current balance {formatNgn(user.wallet_balance_ngn)}
        </p>
        <form onSubmit={handleSubmit}>
          <Field label="Amount (NGN) — negative to debit">
            <Input
              type="number"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-mono w-full"
            />
          </Field>
          <Field label="Reason">
            <Input
              type="text"
              placeholder="e.g. goodwill credit, chargeback correction"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full"
            />
          </Field>
          {error && (
            <div className="bg-red-soft text-red text-[0.85rem] px-3 py-2.5 rounded-lg mb-3.5">{error}</div>
          )}
          <div className="flex gap-2.5">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={loading}>
              {loading ? "Saving…" : "Apply"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ---------- Orders ----------

const STATUS_TONES = {
  pending: "amber",
  received: "mint",
  expired: "red",
  cancelled: "neutral",
};

function OrdersTab() {
  const [orders, setOrders] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listAdminOrders(status || undefined).then(setOrders).catch((err) => setError(err.message));
  }, [status]);

  return (
    <div>
      <div className="mb-4 flex gap-2 flex-wrap">
        {["", "pending", "received", "expired", "cancelled"].map((s) => (
          <button
            key={s || "all"}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-full text-[0.8rem] font-semibold border transition-colors capitalize ${
              status === s
                ? "border-signal bg-signal-soft text-signal"
                : "border-line text-ink-soft hover:border-line-strong"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>
      <Card>
        {error && <p className="text-red">{error}</p>}
        {!error && orders === null && <p>Loading…</p>}
        {!error && orders && orders.length === 0 && <p className="text-ink-soft">No orders found.</p>}
        {!error && orders && orders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[0.88rem]">
              <thead>
                <tr>
                  {["Date", "User", "Service", "Number", "Price", "Status", "Code"].map((h) => (
                    <th
                      key={h}
                      className="text-left text-ink-faint font-semibold text-[0.75rem] uppercase tracking-wide px-2.5 py-2 border-b border-line whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-2.5 py-2.5 border-b border-line whitespace-nowrap">
                      {new Date(o.created_at).toLocaleString()}
                    </td>
                    <td className="px-2.5 py-2.5 border-b border-line">{o.user_email || "—"}</td>
                    <td className="px-2.5 py-2.5 border-b border-line capitalize">{o.service}</td>
                    <td className="px-2.5 py-2.5 border-b border-line font-mono">{o.phone_number}</td>
                    <td className="px-2.5 py-2.5 border-b border-line font-mono">{formatNgn(o.price_ngn)}</td>
                    <td className="px-2.5 py-2.5 border-b border-line">
                      <Pill tone={STATUS_TONES[o.status] || "neutral"}>{o.status}</Pill>
                    </td>
                    <td className="px-2.5 py-2.5 border-b border-line font-mono">{o.sms_code || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
