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
  { id: "links", label: "Site Links" },
  { id: "users", label: "Users" },
  { id: "orders", label: "Orders" },
];

function AdminShell() {
  const [tab, setTab] = useState("overview");

  return (
    <div className="grid md:grid-cols-[220px_1fr] min-h-screen">
      <aside className="border-r border-line p-6 flex md:flex-col justify-between md:justify-start gap-6 items-center md:items-stretch">
        <div>
          <div className="flex items-center gap-2 font-display font-bold text-[1.1rem] mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-signal" />
            Admin
          </div>
          <Link href="/dashboard" className="text-[0.78rem] text-ink-faint hover:text-ink-soft">
            ← Back to dashboard
          </Link>
        </div>
        <nav className="hidden md:flex flex-col gap-1 flex-1">
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

      <main className="p-6 md:p-10">
        <h2 className="text-[1.3rem] font-display font-semibold mb-5">
          {TABS.find((t) => t.id === tab)?.label}
        </h2>
        {tab === "overview" && <OverviewTab />}
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

  const cards = [
    { label: "Total users", value: stats.total_users.toLocaleString("en-NG") },
    { label: "Total orders", value: stats.total_orders.toLocaleString("en-NG") },
    { label: "Pending orders", value: stats.orders_pending.toLocaleString("en-NG") },
    { label: "Completed orders", value: stats.orders_received.toLocaleString("en-NG") },
    { label: "Total wallet balances", value: formatNgn(stats.total_wallet_balance_ngn) },
    { label: "Revenue (order charges)", value: formatNgn(stats.total_revenue_ngn) },
    { label: "Total top-ups", value: formatNgn(stats.total_topups_ngn) },
  ];

  return (
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
