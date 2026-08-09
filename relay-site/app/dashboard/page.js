"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import DigitReel from "@/components/DigitReel";
import {
  Button,
  Card,
  Checkbox,
  Field,
  Input,
  Select,
  Pill,
} from "@/components/ui";
import * as api from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { generateTotp } from "@/lib/totp";

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
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session));

    const { data: listener } =
      supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          setSession(newSession);
        }
      );

    return () =>
      listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;

  return session ? (
    <DashboardShell />
  ) : (
    <Suspense fallback={null}>
      <AuthScreen />
    </Suspense>
  );
}

// ============================================================
// AUTH
// ============================================================

function passwordStrength(pw) {
  if (!pw) return { label: "", tone: "neutral" };

  let score = 0;

  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1)
    return {
      label: "Weak",
      tone: "red",
    };

  if (score <= 3)
    return {
      label: "Okay",
      tone: "amber",
    };

  return {
    label: "Strong",
    tone: "mint",
  };
}

function AuthScreen() {
  const params = useSearchParams();

  const [mode, setMode] = useState(
    params.get("signup") === "1"
      ? "signup"
      : "login"
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] =
    useState(false);
  const [resent, setResent] = useState(false);

  const strength =
    passwordStrength(password);

  function validate() {
    if (mode === "signup") {
      if (password.length < 8) {
        return "Password must be at least 8 characters.";
      }

      if (password !== confirmPassword) {
        return "Passwords don't match.";
      }

      if (!agreed) {
        return "You need to agree to the Terms to create an account.";
      }
    }

    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const result = await api.register(
          email,
          password
        );

        if (result.needsEmailConfirmation) {
          setConfirmSent(true);
        }
      } else {
        await api.login(email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    try {
      await api.resendConfirmation(email);
      setResent(true);
    } catch (err) {
      setError(err.message);
    }
  }

  if (confirmSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-[380px] text-center">
          <h3 className="text-[1.1rem] mb-2">
            Check your email
          </h3>

          <p className="mb-4">
            We sent a confirmation link to{" "}
            <strong className="text-ink">
              {email}
            </strong>
            . Click it to finish creating your account.
          </p>

          {resent ? (
            <p className="text-mint text-[0.85rem]">
              Sent again — check your inbox and spam folder.
            </p>
          ) : (
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleResend}
            >
              Resend confirmation email
            </Button>
          )}
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
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`flex-1 py-2.5 rounded-[7px] font-semibold text-[0.88rem] transition-colors ${
                mode === m
                  ? "bg-surface text-ink shadow-sm"
                  : "text-ink-soft"
              }`}
            >
              {m === "login"
                ? "Log in"
                : "Sign up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <Field label="Email">
            <Input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />
          </Field>

          <Field label="Password">
            <div className="relative">
              <Input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                required
                minLength={8}
                autoComplete={
                  mode === "signup"
                    ? "new-password"
                    : "current-password"
                }
                placeholder="••••••••"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                className="w-full pr-16"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (s) => !s
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.75rem] font-semibold text-ink-faint hover:text-ink-soft"
                tabIndex={-1}
              >
                {showPassword
                  ? "Hide"
                  : "Show"}
              </button>
            </div>

            {mode === "signup" &&
              password && (
                <div className="mt-1">
                  <Pill
                    tone={strength.tone}
                  >
                    {strength.label}
                  </Pill>
                </div>
              )}
          </Field>

          {mode === "signup" && (
            <Field label="Confirm password">
              <Input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                required
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
              />
            </Field>
          )}

          {mode === "signup" && (
            <Checkbox
              className="mb-4"
              checked={agreed}
              onChange={(e) =>
                setAgreed(e.target.checked)
              }
              label={
                <>
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    target="_blank"
                    className="text-signal underline"
                  >
                    Terms of Service
                  </Link>
                </>
              }
            />
          )}

          {error && (
            <div className="bg-red-soft text-red text-[0.85rem] px-3 py-2.5 rounded-lg mb-3.5">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={loading}
          >
            {loading
              ? "Please wait…"
              : mode === "signup"
              ? "Create account"
              : "Log in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================

const NAV_SECTIONS_BASE = [
  {
    heading: null,
    items: [
      {
        id: "buy",
        label: "Buy a number",
      },
      {
        id: "wallet",
        label: "Fund Wallet",
      },
    ],
  },
  {
    heading: "Activity",
    items: [
      {
        id: "orders",
        label: "Order History",
      },
      {
        id: "ledger",
        label: "Transactions",
      },
    ],
  },
  {
    heading: "Tools",
    items: [
      {
        id: "2fa",
        label: "2FA Generator",
      },
      {
        id: "settings",
        label: "Settings",
      },
    ],
  },
];

function DashboardShell() {
  const [view, setView] = useState("buy");
  const [balance, setBalance] =
    useState(null);

  const [topupOpen, setTopupOpen] =
    useState(false);

  const [navOpen, setNavOpen] =
    useState(false);

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [siteSettings, setSiteSettings] =
    useState(null);

  const refreshBalance =
    useCallback(async () => {
      try {
        const data =
          await api.getBalance();

        setBalance(
          data.wallet_balance_ngn
        );
      } catch (err) {
        if (
          String(err.message).includes(
            "validate credentials"
          ) ||
          String(err.message).includes(
            "Not logged in"
          )
        ) {
          api.logout();
        }
      }
    }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshBalance();

    api
      .getMyProfile()
      .then((p) =>
        setIsAdmin(!!p.is_admin)
      )
      .catch(() => {});

    api
      .getPublicSettings()
      .then(setSiteSettings)
      .catch(() => {});
  }, [refreshBalance]);

  const NAV_SECTIONS = [
    ...NAV_SECTIONS_BASE,
    {
      heading: "Community",
      items: [
        {
          id: "support",
          label: "Support",
          external:
            siteSettings?.support_ticket_url ||
            "https://t.me/SwiftVerifyNGcc",
        },
        {
          id: "telegram",
          label: "Telegram News",
          external:
            siteSettings?.telegram_url ||
            "https://t.me/swiftverifyng",
        },
      ],
    },
  ];

  function handleLogout() {
    api.logout();
  }

  const VIEW_TITLES = {
    buy: "Buy a number",
    wallet: "Fund Wallet",
    orders: "Order History",
    ledger: "Transactions",
    "2fa": "2FA Generator",
    settings: "Settings",
  };

  return (
    <div className="grid md:grid-cols-[240px_1fr] min-h-screen">
      <aside className="border-r border-line p-6 flex md:flex-col justify-between md:justify-start gap-6 items-center md:items-stretch">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-2 font-display font-bold text-[1.1rem]">
            <span className="w-2.5 h-2.5 rounded-full bg-mint" />
            SMSOne
          </div>

          <button
            className="md:hidden text-ink-soft text-[0.85rem] font-semibold"
            onClick={() =>
              setNavOpen((o) => !o)
            }
          >
            Menu
          </button>
        </div>

        <nav
          className={`${
            navOpen ? "flex" : "hidden"
          } md:flex flex-col gap-4 flex-1 overflow-y-auto`}
        >
          {NAV_SECTIONS.map(
            (section, i) => (
              <div key={i}>
                {section.heading && (
                  <div className="text-[0.68rem] font-semibold text-ink-faint uppercase tracking-wide px-3 mb-1.5">
                    {section.heading}
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  {section.items.map(
                    (item) =>
                      item.external ? (
                        <a
                          key={item.id}
                          href={
                            item.external
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-left px-3 py-2.5 rounded-lg text-[0.9rem] font-medium transition-colors text-ink-soft hover:bg-surface-hover hover:text-ink flex items-center justify-between"
                        >
                          {item.label}
                          <span className="text-ink-faint text-[0.75rem]">
                            ↗
                          </span>
                        </a>
                      ) : (
                        <button
                          key={item.id}
                          onClick={() => {
                            setView(
                              item.id
                            );
                            setNavOpen(
                              false
                            );
                          }}
                          className={`text-left px-3 py-2.5 rounded-lg text-[0.9rem] font-medium transition-colors ${
                            view ===
                            item.id
                              ? "gradient-signal text-white"
                              : "text-ink-soft hover:bg-surface-hover hover:text-ink"
                          }`}
                        >
                          {item.label}
                        </button>
                      )
                  )}
                </div>
              </div>
            )
          )}
        </nav>

        {isAdmin && (
          <Link
            href="/admin"
            className="text-left px-3 py-2.5 rounded-lg text-[0.9rem] font-semibold text-signal border border-signal-soft bg-signal-soft hover:brightness-105 transition-colors text-center md:text-left"
          >
            Admin panel
          </Link>
        )}

        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-auto md:w-full"
        >
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
              {balance === null
                ? "₦ —"
                : formatNgn(balance)}
            </div>
          </div>

          <Button
            variant="green"
            onClick={() =>
              setTopupOpen(true)
            }
          >
            Top up
          </Button>
        </div>

        <h2 className="text-[1.3rem] font-display font-semibold mb-5">
          {VIEW_TITLES[view]}
        </h2>

        {view === "buy" && (
          <BuyView
            onBalanceChange={
              refreshBalance
            }
          />
        )}

        {view === "wallet" && (
          <FundWalletView
            onBalanceChange={
              refreshBalance
            }
          />
        )}

        {view === "orders" && (
          <OrderHistoryView />
        )}

        {view === "ledger" && (
          <LedgerView />
        )}

        {view === "2fa" && (
          <TwoFAView />
        )}

        {view === "settings" && (
          <SettingsView />
        )}
      </main>

      {topupOpen && (
        <TopupModal
          onClose={() =>
            setTopupOpen(false)
          }
        />
      )}
    </div>
  );
}

// ============================================================
// BUY NUMBER
// ============================================================

function BuyView({
  onBalanceChange,
}) {
  const [countries, setCountries] =
    useState([]);

  const [services, setServices] =
    useState([]);

  const [country, setCountry] =
    useState("");

  const [service, setService] =
    useState("");

  const [loadingCountries, setLoadingCountries] =
    useState(true);

  const [loadingServices, setLoadingServices] =
    useState(false);

  const [providerError, setProviderError] =
    useState(null);

  const [offersState, setOffersState] =
    useState({
      loading: false,
      error: null,
      offers: null, // null = not checked yet
    });

  const [order, setOrder] =
    useState(null);

  const [buying, setBuying] =
    useState(false);

  const [buyingOperator, setBuyingOperator] =
    useState(null);

  const [buyError, setBuyError] =
    useState(null);

  // ----------------------------------------------------------
  // LOAD COUNTRIES
  // ----------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadCountries() {
      try {
        setLoadingCountries(true);
        setProviderError(null);

        const data =
          await api.getProviderCountries();

        console.log(
          "5SIM COUNTRIES:",
          data
        );

        const list = Array.isArray(data)
          ? data
          : data?.countries || [];

        if (cancelled) return;

        setCountries(list);

        if (list.length > 0) {
          const first = list[0];

          const firstCode =
            first.code ||
            first.country ||
            first.iso ||
            "";

          setCountry(firstCode);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(
            "Failed to load countries:",
            err
          );

          setProviderError(
            err.message ||
              "Unable to load countries."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingCountries(false);
        }
      }
    }

    loadCountries();

    return () => {
      cancelled = true;
    };
  }, []);

  // ----------------------------------------------------------
  // LOAD SERVICES
  // ----------------------------------------------------------

  useEffect(() => {
    if (!country) return;

    let cancelled = false;

    async function loadServices() {
      try {
        setLoadingServices(true);
        setProviderError(null);

        const data =
          await api.getProviderServices(
            country
          );

        console.log(
          `5SIM SERVICES FOR ${country}:`,
          data
        );

        const list = Array.isArray(data)
          ? data
          : data?.services || [];

        if (cancelled) return;

        setServices(list);

        if (list.length > 0) {
          const first = list[0];

          setService(
            first.service ||
              first.name ||
              first.product ||
              ""
          );
        }
      } catch (err) {
        if (!cancelled) {
          console.error(
            "Failed to load services:",
            err
          );

          setServices([]);
          setService("");

          setProviderError(
            err.message ||
              "Unable to load services."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingServices(false);
        }
      }
    }

    loadServices();

    return () => {
      cancelled = true;
    };
  }, [country]);

  // ----------------------------------------------------------
  // ORDER POLLING
  // ----------------------------------------------------------

  useEffect(() => {
    if (
      !order ||
      order.status !== "pending"
    ) {
      return;
    }

    const interval = setInterval(
      async () => {
        try {
          const updated =
            await api.checkOrder(
              order.id
            );

          setOrder(updated);

          if (
            updated.status !==
            "pending"
          ) {
            onBalanceChange();
            clearInterval(interval);
          }
        } catch (_) {
          clearInterval(interval);
        }
      },
      2000
    );

    return () =>
      clearInterval(interval);
  }, [order, onBalanceChange]);

  // ----------------------------------------------------------
  // COUNTRY CHANGE
  // ----------------------------------------------------------

  function handleCountryChange(e) {
    const selectedCountry =
      e.target.value;

    setCountry(selectedCountry);

    // Reset dependent state here,
    // not synchronously inside useEffect.
    setServices([]);
    setService("");

    setOffersState({ loading: false, error: null, offers: null });

    setProviderError(null);
    setBuyError(null);
  }

  // ----------------------------------------------------------
  // SERVICE CHANGE
  // ----------------------------------------------------------

  function handleServiceChange(e) {
    setService(e.target.value);

    setOffersState({ loading: false, error: null, offers: null });

    setBuyError(null);
  }

  // ----------------------------------------------------------
  // CHECK AVAILABILITY
  // ----------------------------------------------------------

  async function handleCheckAvailability() {
    if (!country || !service) return;

    setOffersState({ loading: true, error: null, offers: null });
    setBuyError(null);

    try {
      const offers = await api.getOffers(service, country);
      setOffersState({
        loading: false,
        error: offers.length === 0 ? "No numbers currently available for this service." : null,
        offers,
      });
    } catch (err) {
      setOffersState({
        loading: false,
        error: err.message || "No numbers currently available for this service.",
        offers: null,
      });
    }
  }

  // ----------------------------------------------------------
  // BUY
  // ----------------------------------------------------------

  async function handleBuy(operator) {
    if (!country || !service) {
      return;
    }

    setBuying(true);
    setBuyingOperator(operator);
    setBuyError(null);

    try {
      const newOrder =
        await api.buyNumber(
          service,
          country,
          operator
        );

      setOrder(newOrder);

      onBalanceChange();
    } catch (err) {
      setBuyError(
        err.message ||
          "Unable to reserve number."
      );
    } finally {
      setBuying(false);
      setBuyingOperator(null);
    }
  }

  // ----------------------------------------------------------
  // CANCEL
  // ----------------------------------------------------------

  async function handleCancel() {
    if (!order) return;

    try {
      const updated =
        await api.cancelOrder(
          order.id
        );

      setOrder(updated);

      onBalanceChange();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-6 items-start">
      <Card>
        <h3 className="text-[1.1rem] mb-1.5">
          Buy a number
        </h3>

        <p className="mb-5">
          Pick a service, see the price,
          then reserve a number.
        </p>

        {/* COUNTRY */}

        <Field label="Country">
          <Select
            value={country}
            onChange={
              handleCountryChange
            }
            disabled={
              loadingCountries ||
              countries.length === 0
            }
          >
            {loadingCountries && (
              <option value="">
                Loading countries…
              </option>
            )}

            {!loadingCountries &&
              countries.length === 0 && (
                <option value="">
                  No countries available
                </option>
              )}

            {countries.map(
              (item, index) => {
                const code =
                  item.code ||
                  item.country ||
                  item.iso ||
                  "";

                const name =
                  item.name ||
                  item.country_name ||
                  item.title ||
                  code;

                return (
                  <option
                    key={
                      code || index
                    }
                    value={code}
                  >
                    {name}
                  </option>
                );
              }
            )}
          </Select>
        </Field>

        {/* SERVICE */}

        <Field label="Service">
          <Select
            value={service}
            onChange={
              handleServiceChange
            }
            disabled={
              !country ||
              loadingServices ||
              services.length === 0
            }
          >
            {!country && (
              <option value="">
                Select a country first
              </option>
            )}

            {country &&
              loadingServices && (
                <option value="">
                  Loading services…
                </option>
              )}

            {country &&
              !loadingServices &&
              services.length === 0 && (
                <option value="">
                  No services available
                </option>
              )}

            {services.map(
              (item, index) => {
                const serviceName =
                  item.service ||
                  item.name ||
                  item.product ||
                  "";

                const available =
                  item.available ??
                  item.count ??
                  item.quantity ??
                  null;

                const displayName =
                  serviceName
                    ? serviceName
                        .charAt(0)
                        .toUpperCase() +
                      serviceName.slice(1)
                    : "Unknown";

                return (
                  <option
                    key={
                      serviceName ||
                      index
                    }
                    value={serviceName}
                  >
                    {displayName}

                    {available !== null
                      ? ` — ${available} available`
                      : ""}
                  </option>
                );
              }
            )}
          </Select>
        </Field>

        {providerError && (
          <div className="bg-red-soft text-red text-[0.85rem] px-3 py-2.5 rounded-lg mb-3.5">
            {providerError}
          </div>
        )}

        {/* CHECK AVAILABILITY */}

        <Button
          variant="primary"
          className="w-full"
          onClick={handleCheckAvailability}
          disabled={
            offersState.loading ||
            !country ||
            !service ||
            loadingCountries ||
            loadingServices
          }
        >
          {offersState.loading ? "Checking…" : "Check Availability"}
        </Button>

        {offersState.error && (
          <div className="bg-red-soft text-red text-[0.85rem] px-3 py-2.5 rounded-lg mt-3.5">
            {offersState.error}
          </div>
        )}

        {buyError && (
          <div className="bg-red-soft text-red text-[0.85rem] px-3 py-2.5 rounded-lg mt-3.5">
            {buyError}
          </div>
        )}
      </Card>

      {/* AVAILABLE NUMBERS */}

      {offersState.offers && offersState.offers.length > 0 && (
        <Card>
          <h3 className="text-[1.1rem] mb-4">Available Numbers</h3>
          <div className="flex flex-col gap-3">
            {offersState.offers.map((offer) => (
              <OfferCard
                key={offer.operator}
                offer={offer}
                buying={buying && buyingOperator === offer.operator}
                disabled={buying}
                onReserve={() => handleBuy(offer.operator)}
              />
            ))}
          </div>
        </Card>
      )}

      {/* ORDER */}

      {order && (
        <Card>
          <h3 className="text-[1.1rem] mb-1.5">
            Your number
          </h3>

          <div className="font-mono text-[1.3rem] font-semibold my-2 mb-4.5">
            {order.phone_number}
          </div>

          <div className="text-[0.72rem] text-ink-faint uppercase tracking-wide mb-2">
            Verification code
          </div>

          <DigitReel
            code={order.sms_code}
            arrived={
              order.status ===
              "received"
            }
          />

          <div className="mt-3.5">
            {(() => {
              const [
                tone,
                label,
              ] =
                STATUS_MAP[
                  order.status
                ] || [
                  "neutral",
                  order.status,
                ];

              return (
                <Pill tone={tone}>
                  {label}
                </Pill>
              );
            })()}
          </div>

          {order.status ===
            "pending" && (
            <Button
              variant="ghost"
              className="w-full mt-4"
              onClick={
                handleCancel
              }
            >
              Cancel &amp; refund
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}

// ============================================================
// OFFER CARD (a single reservable pool/operator)
// ============================================================

function formatOperatorLabel(operator) {
  if (!operator || operator === "any") return "Standard";
  return operator
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function OfferCard({ offer, buying, disabled, onReserve }) {
  const rate = offer.success_rate;
  const rateTone = rate == null ? "neutral" : rate >= 70 ? "mint" : rate >= 40 ? "amber" : "red";

  return (
    <div className="border border-line rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <div className="font-semibold text-[0.95rem] mb-1">{formatOperatorLabel(offer.operator)}</div>
        <div className="flex items-center gap-3 text-[0.82rem] text-ink-soft flex-wrap">
          <span>
            Price <strong className="font-mono text-ink">{formatNgn(offer.price_ngn)}</strong>
          </span>
          {rate != null && (
            <Pill tone={rateTone}>{Math.round(rate)}% success rate</Pill>
          )}
          {offer.available != null && (
            <span className="text-ink-faint">{offer.available} available</span>
          )}
        </div>
      </div>
      <Button variant="mint" onClick={onReserve} disabled={disabled}>
        {buying ? "Reserving…" : "Reserve"}
      </Button>
    </div>
  );
}

// ============================================================
// LEDGER
// ============================================================

const REASON_LABELS = {
  topup_dev:
    "Wallet top-up (test)",
  topup_korapay:
    "Wallet top-up",
  order_charge:
    "Number purchase",
  order_refund_timeout:
    "Refund — timed out",
  order_refund_cancelled:
    "Refund — cancelled",
};

function LedgerView() {
  const [rows, setRows] =
    useState(null);

  const [error, setError] =
    useState(null);

  useEffect(() => {
    api
      .getLedger()
      .then(setRows)
      .catch((err) =>
        setError(err.message)
      );
  }, []);

  return (
    <Card className="col-span-full">
      <h3 className="text-[1.1rem] mb-4">
        Wallet history
      </h3>

      {error && (
        <p className="text-red">
          {error}
        </p>
      )}

      {!error &&
        rows === null && (
          <p>Loading…</p>
        )}

      {!error &&
        rows &&
        rows.length === 0 && (
          <p>
            No transactions yet.
          </p>
        )}

      {!error &&
        rows &&
        rows.length > 0 && (
          <table className="w-full border-collapse text-[0.88rem]">
            <thead>
              <tr>
                {[
                  "Date",
                  "Reason",
                  "Amount",
                  "Balance after",
                ].map((h) => (
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
                    {new Date(
                      r.created_at
                    ).toLocaleString()}
                  </td>

                  <td className="px-2.5 py-2.5 border-b border-line">
                    {REASON_LABELS[
                      r.reason
                    ] || r.reason}
                  </td>

                  <td
                    className={`px-2.5 py-2.5 border-b border-line font-mono ${
                      r.amount_ngn >=
                      0
                        ? "text-mint"
                        : "text-red"
                    }`}
                  >
                    {r.amount_ngn >=
                    0
                      ? "+"
                      : ""}
                    {formatNgn(
                      r.amount_ngn
                    )}
                  </td>

                  <td className="px-2.5 py-2.5 border-b border-line font-mono">
                    {formatNgn(
                      r.balance_after_ngn
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </Card>
  );
}

// ============================================================
// TOP UP MODAL
// ============================================================

function TopupModal({
  onClose,
}) {
  const [amount, setAmount] =
    useState(2000);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    try {
      const res =
        await api.initializeTopup(
          amount
        );

      if (res.checkout_url) {
        window.location.href =
          res.checkout_url;
      } else {
        throw new Error(
          "No checkout URL returned — check your Korapay keys are configured."
        );
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-[rgba(16,23,40,0.4)] flex items-center justify-center z-50 p-5"
      onClick={(e) =>
        e.target ===
          e.currentTarget &&
        onClose()
      }
    >
      <Card className="w-full max-w-[380px]">
        <h3 className="text-[1.1rem] mb-1.5">
          Top up wallet
        </h3>

        <p className="mb-4.5">
          You&apos;ll be redirected to
          Korapay to complete payment.
        </p>

        <Field label="Amount (NGN)">
          <Input
            type="number"
            min={100}
            step={100}
            value={amount}
            onChange={(e) =>
              setAmount(
                Number(e.target.value)
              )
            }
            className="font-mono"
          />
        </Field>

        {error && (
          <div className="bg-red-soft text-red text-[0.85rem] px-3 py-2.5 rounded-lg mb-3.5">
            {error}
          </div>
        )}

        <div className="flex gap-2.5">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            variant="green"
            className="flex-1"
            onClick={
              handleConfirm
            }
            disabled={loading}
          >
            {loading
              ? "Starting…"
              : "Continue to payment"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// FUND WALLET
// ============================================================

const QUICK_AMOUNTS = [
  1000,
  2000,
  5000,
  10000,
];

function FundWalletView({
  onBalanceChange,
}) {
  const [amount, setAmount] =
    useState(2000);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState(null);

  async function handleTopup() {
    setLoading(true);
    setError(null);

    try {
      const res =
        await api.initializeTopup(
          amount
        );

      if (res.checkout_url) {
        window.location.href =
          res.checkout_url;
      } else {
        throw new Error(
          "No checkout URL returned — check your Korapay keys are configured."
        );
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-6 items-start">
      <Card>
        <h3 className="text-[1.1rem] mb-1.5">
          Fund your wallet
        </h3>

        <p className="mb-5">
          Pay with card, bank transfer,
          or USSD via Korapay. Funds
          land instantly.
        </p>

        <Field label="Amount (NGN)">
          <Input
            type="number"
            min={100}
            step={100}
            value={amount}
            onChange={(e) =>
              setAmount(
                Number(e.target.value)
              )
            }
            className="font-mono w-full"
          />
        </Field>

        <div className="flex flex-wrap gap-2 mb-4.5">
          {QUICK_AMOUNTS.map(
            (a) => (
              <button
                key={a}
                type="button"
                onClick={() =>
                  setAmount(a)
                }
                className={`px-3 py-1.5 rounded-full text-[0.8rem] font-semibold border transition-colors ${
                  amount === a
                    ? "border-signal bg-signal-soft text-signal"
                    : "border-line text-ink-soft hover:border-line-strong"
                }`}
              >
                {formatNgn(a)}
              </button>
            )
          )}
        </div>

        {error && (
          <div className="bg-red-soft text-red text-[0.85rem] px-3 py-2.5 rounded-lg mb-3.5">
            {error}
          </div>
        )}

        <Button
          variant="green"
          className="w-full"
          onClick={handleTopup}
          disabled={
            loading ||
            amount < 100
          }
        >
          {loading
            ? "Starting…"
            : `Fund with ${formatNgn(
                amount
              )}`}
        </Button>
      </Card>

      <Card>
        <h3 className="text-[1.1rem] mb-1.5">
          How it works
        </h3>

        <ul className="text-[0.88rem] text-ink-soft flex flex-col gap-2.5 list-disc pl-4">
          <li>
            You&apos;re redirected to
            Korapay&apos;s secure checkout
            to pay.
          </li>

          <li>
            Once payment confirms, your
            wallet is credited automatically
            via webhook.
          </li>

          <li>
            Credits are only deducted from
            your balance when an SMS is
            actually received — a cancelled
            or timed-out number is refunded.
          </li>
        </ul>
      </Card>
    </div>
  );
}

// ============================================================
// ORDER HISTORY
// ============================================================

function OrderHistoryView() {
  const [orders, setOrders] =
    useState(null);

  const [error, setError] =
    useState(null);

  useEffect(() => {
    api
      .listOrders()
      .then(setOrders)
      .catch((err) =>
        setError(err.message)
      );
  }, []);

  return (
    <Card>
      {error && (
        <p className="text-red">
          {error}
        </p>
      )}

      {!error &&
        orders === null && (
          <p>Loading…</p>
        )}

      {!error &&
        orders &&
        orders.length === 0 && (
          <p className="text-ink-soft">
            No purchases yet — numbers
            you buy will show up here.
          </p>
        )}

      {!error &&
        orders &&
        orders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[0.88rem]">
              <thead>
                <tr>
                  {[
                    "Date",
                    "Service",
                    "Number",
                    "Price",
                    "Status",
                    "Code",
                  ].map((h) => (
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
                {orders.map((o) => {
                  const [
                    tone,
                    label,
                  ] =
                    STATUS_MAP[
                      o.status
                    ] || [
                      "neutral",
                      o.status,
                    ];

                  return (
                    <tr key={o.id}>
                      <td className="px-2.5 py-2.5 border-b border-line whitespace-nowrap">
                        {new Date(
                          o.created_at
                        ).toLocaleString()}
                      </td>

                      <td className="px-2.5 py-2.5 border-b border-line capitalize">
                        {o.service}
                      </td>

                      <td className="px-2.5 py-2.5 border-b border-line font-mono">
                        {o.phone_number}
                      </td>

                      <td className="px-2.5 py-2.5 border-b border-line font-mono">
                        {formatNgn(
                          o.price_ngn
                        )}
                      </td>

                      <td className="px-2.5 py-2.5 border-b border-line">
                        <Pill tone={tone}>
                          {label}
                        </Pill>
                      </td>

                      <td className="px-2.5 py-2.5 border-b border-line font-mono">
                        {o.sms_code ||
                          "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
    </Card>
  );
}

// ============================================================
// 2FA
// ============================================================

function TwoFAView() {
  const [secret, setSecret] =
    useState("");

  const [code, setCode] =
    useState(null);

  const [secondsLeft, setSecondsLeft] =
    useState(0);

  const [error, setError] =
    useState(null);

  useEffect(() => {
    if (!code) return;

    const interval =
      setInterval(async () => {
        try {
          const result =
            await generateTotp(
              secret
            );

          setCode(result.code);
          setSecondsLeft(
            result.secondsLeft
          );
        } catch (_) {}
      }, 1000);

    return () =>
      clearInterval(interval);
  }, [code, secret]);

  async function handleGenerate(e) {
    e.preventDefault();
    setError(null);

    try {
      const result =
        await generateTotp(secret);

      setCode(result.code);
      setSecondsLeft(
        result.secondsLeft
      );
    } catch (err) {
      setError(err.message);
      setCode(null);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-6 items-start">
      <Card>
        <h3 className="text-[1.1rem] mb-1.5">
          2FA code generator
        </h3>

        <p className="mb-5">
          Paste the Base32 setup key an
          app gave you to generate the
          same 6-digit codes here.
          This runs entirely in your
          browser.
        </p>

        <form
          onSubmit={handleGenerate}
        >
          <Field label="Secret key">
            <Input
              type="text"
              required
              placeholder="e.g. JBSWY3DPEHPK3PXP"
              value={secret}
              onChange={(e) =>
                setSecret(
                  e.target.value
                )
              }
              className="font-mono w-full"
            />
          </Field>

          {error && (
            <div className="bg-red-soft text-red text-[0.85rem] px-3 py-2.5 rounded-lg mb-3.5">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
          >
            Generate code
          </Button>
        </form>
      </Card>

      {code && (
        <Card className="text-center">
          <div className="text-[0.72rem] text-ink-faint uppercase tracking-wide mb-2">
            Current code
          </div>

          <div className="font-mono text-[2.4rem] font-semibold tracking-[0.15em] mb-3">
            {code}
          </div>

          <Pill
            tone={
              secondsLeft <= 5
                ? "amber"
                : "mint"
            }
          >
            Refreshes in{" "}
            {secondsLeft}s
          </Pill>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// SETTINGS
// ============================================================

function SettingsView() {
  const [email, setEmail] =
    useState(null);

  const [newPassword, setNewPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState(null);

  const [saved, setSaved] =
    useState(false);

  useEffect(() => {
    api
      .getCurrentUser()
      .then((u) =>
        setEmail(
          u?.email ?? null
        )
      )
      .catch(() => {});
  }, []);

  async function handleChangePassword(
    e
  ) {
    e.preventDefault();

    setError(null);
    setSaved(false);

    if (newPassword.length < 8) {
      setError(
        "Password must be at least 8 characters."
      );
      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setError(
        "Passwords don't match."
      );
      return;
    }

    setSaving(true);

    try {
      await api.changePassword(
        newPassword
      );

      setSaved(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-6 items-start">
      <Card>
        <h3 className="text-[1.1rem] mb-1.5">
          Account
        </h3>

        <Field label="Email">
          <Input
            type="email"
            value={email ?? ""}
            disabled
            className="w-full"
          />
        </Field>

        <p className="text-[0.8rem] text-ink-faint">
          Need to change your email?{" "}
          <a
            href="mailto:support@swiftverifyng.com"
            className="text-signal underline"
          >
            Contact support
          </a>
          .
        </p>
      </Card>

      <Card>
        <h3 className="text-[1.1rem] mb-1.5">
          Change password
        </h3>

        <form
          onSubmit={
            handleChangePassword
          }
        >
          <Field label="New password">
            <Input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) =>
                setNewPassword(
                  e.target.value
                )
              }
              className="w-full"
            />
          </Field>

          <Field label="Confirm new password">
            <Input
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(
                  e.target.value
                )
              }
              className="w-full"
            />
          </Field>

          {error && (
            <div className="bg-red-soft text-red text-[0.85rem] px-3 py-2.5 rounded-lg mb-3.5">
              {error}
            </div>
          )}

          {saved && (
            <div className="bg-mint-soft text-mint text-[0.85rem] px-3 py-2.5 rounded-lg mb-3.5">
              Password updated.
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={saving}
          >
            {saving
              ? "Saving…"
              : "Update password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}