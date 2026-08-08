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

export async function resendConfirmation(email) {
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) throw new Error(error.message);
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  return data.user;
}

/** Backend /auth/me — includes is_admin, unlike the raw Supabase user object. */
export const getMyProfile = () => api("/auth/me");

export async function changePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
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

/** Like `api`, but sends a JSON body — for endpoints that take a request
 *  payload (e.g. admin actions) instead of query params. */
async function apiWithBody(path, { method = "POST", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = await getAccessToken();
    if (!token) throw new Error("Not logged in");
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: JSON.stringify(body),
  });
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

export const listOrders = () => api("/orders");

export const cancelOrder = (orderId) =>
  api(`/orders/${orderId}/cancel`, { method: "POST" });

// ---------- Payments ----------

export const initializeTopup = (amountNgn) =>
  api(`/payments/korapay/initialize?${qs({ amount_ngn: amountNgn })}`, {
    method: "POST",
  });

// ---------- Public settings (WhatsApp/Telegram/support links) ----------

export const getPublicSettings = () => api("/settings", { auth: false });

// ---------- Admin ----------

export const getAdminSettings = () => api("/admin/settings");
export const updateAdminSettings = (settings) =>
  apiWithBody("/admin/settings", { method: "PUT", body: settings });

export const listAdminUsers = (q = "") =>
  api(`/admin/users${q ? `?${qs({ q })}` : ""}`);

export const adjustUserWallet = (userId, amountNgn, reason) =>
  apiWithBody(`/admin/users/${userId}/adjust-wallet`, {
    method: "POST",
    body: { amount_ngn: amountNgn, reason },
  });

export const suspendUser = (userId) => api(`/admin/users/${userId}/suspend`, { method: "POST" });
export const unsuspendUser = (userId) => api(`/admin/users/${userId}/unsuspend`, { method: "POST" });
export const toggleUserAdmin = (userId) => api(`/admin/users/${userId}/toggle-admin`, { method: "POST" });

export const listAdminOrders = (status) =>
  api(`/admin/orders${status ? `?${qs({ status })}` : ""}`);

export const getAdminStats = () => api("/admin/stats");
