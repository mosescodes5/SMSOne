export function Button({
  as: Tag = "button",
  variant = "primary",
  className = "",
  children,
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold text-[0.95rem] px-[22px] py-3 rounded-xl border transition-[transform,filter,background-color,border-color] duration-150 hover:scale-[1.015] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100";
  const variants = {
    primary:
      "gradient-signal text-white border-transparent shadow-[var(--shadow-glow)] hover:brightness-110",
    ghost:
      "bg-transparent text-ink border-line hover:border-line-strong hover:bg-surface",
    mint: "bg-mint text-[#0B231C] border-transparent hover:brightness-110",
    green: "bg-mint text-[#0B231C] border-transparent hover:brightness-110",
  };
  return (
    <Tag className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </Tag>
  );
}

export function Card({ className = "", glass = false, children, ...props }) {
  return (
    <div
      className={`${glass ? "glass" : "bg-surface border border-line"} rounded-2xl p-4 sm:p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5 mb-4">
      <label className="text-[0.78rem] font-semibold text-ink-soft uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputBase =
  "font-[family-name:var(--font-body)] text-[0.95rem] px-3.5 py-[11px] rounded-xl border border-line bg-bg-elevated text-ink outline-none focus:border-line-strong transition-colors placeholder:text-ink-faint";

export function Input(props) {
  return <input className={inputBase} {...props} />;
}

export function Select({ children, ...props }) {
  return (
    <select className={inputBase} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({ label, className = "", ...props }) {
  return (
    <label className={`flex items-start gap-2.5 text-[0.82rem] text-ink-soft cursor-pointer ${className}`}>
      <input
        type="checkbox"
        className="mt-[3px] h-[15px] w-[15px] shrink-0 rounded border-line accent-mint"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}

export function Pill({ tone = "neutral", children }) {
  const tones = {
    mint: "bg-mint-soft text-mint",
    amber: "bg-amber-soft text-amber",
    red: "bg-red-soft text-red",
    signal: "bg-signal-soft text-signal",
    neutral: "bg-surface-hover text-ink-soft",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[0.78rem] font-semibold px-2.5 py-1 rounded-full ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
