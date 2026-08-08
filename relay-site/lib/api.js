import { supabase } from "./supabase";

const API_BASE =
  process.env.NEXT_PUBLIC_RELAY_API_BASE || "http://127.0.0.1:8811";

function qs(params) {
  return new URLSearchParams(params).toString();
}

// ---------- Auth (all handled by Supabase directly — no backend calls) ----------

export async function register(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  // If email confirmation is required (default Supabase setting), `session`
  // is null here even though signUp succeeded — the caller should tell the
  // user to check their inbox rather than assume they're logged in.
  return { needsEmailConfirmation: !data.session, email };
}

export async function login(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function logout() {
  await supabase.auth.signOut();
}

/** Current access token, or null if not logged in. Cheap — Supabase caches
 *  the session and only hits the network if the token actually needs
 *  refreshing. */
async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Subscribe to auth state changes (login, logout, token refresh). Returns
 *  an unsubscribe function. Used with useSyncExternalStore in the dashboard. */
export function subscribeAuth(callback) {
  const { data } = supabase.auth.onAuthStateChange(() => callback());
  return () => data.subscription.unsubscribe();
}

// ---------- Backend API calls ----------

async function api(path, { method = "GET", auth = true } = {}) {
  const headers = {};
  if (auth) {
    const token = await getAccessToken();
    if (!token) throw new Error("Not logged in");
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { method, headers });
  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    /* no body */
  }
  if (!res.ok) {
    const detail = data?.detail || res.statusText;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data;
}

// ---------- Wallet ----------

export const getBalance = () => api("/wallet/balance");
export const getLedger = () => api("/wallet/ledger");
export const devTopup = (amountNgn) =>
  api(`/wallet/topup/dev-only?${qs({ amount_ngn: amountNgn })}`, { method: "POST" });

// ---------- Orders ----------

export const previewPrice = (service, country) =>
  api(`/orders/price?${qs({ service, country })}`, { auth: false });

export const buyNumber = (service, country) =>
  api(`/orders?${qs({ service, country })}`, { method: "POST" });

export const checkOrder = (orderId) => api(`/orders/${orderId}`);

export const cancelOrder = (orderId) =>
  api(`/orders/${orderId}/cancel`, { method: "POST" });

// ---------- Payments ----------

export const initializeTopup = (amountNgn) =>
  api(`/payments/korapay/initialize?${qs({ amount_ngn: amountNgn })}`, {
    method: "POST",
  });
