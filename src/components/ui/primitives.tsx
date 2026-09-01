"use client";

import { useEffect, type ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card p-4 ${className}`}>{children}</section>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <h2 className="text-[15px] font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: "solid" | "outline" | "ghost" | "danger";
  size?: "sm" | "md";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
};

export function Button({
  children,
  onClick,
  variant = "outline",
  size = "md",
  type = "button",
  disabled,
  className = "",
}: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-40";
  const sizes = size === "sm" ? "px-2.5 py-1.5 text-[13px]" : "px-3.5 py-2.5 text-[14px] tap";
  const variants = {
    solid: "bg-ink text-bg hover:opacity-90",
    outline: "border border-line bg-surface hover:bg-sunken",
    ghost: "text-muted hover:text-ink",
    danger: "border border-warn text-warn hover:bg-warn/10",
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizes} ${variants} ${className}`}>
      {children}
    </button>
  );
}

export function Chip({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
        active ? "border-ink bg-ink text-bg" : "border-line bg-surface text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-medium text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[12px] text-muted">{hint}</span> : null}
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-lg border border-line bg-sunken p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-[6px] px-2 py-2 text-[13px] font-medium transition-colors ${
            value === o.value ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "text-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Banner({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warn" | "ok";
  title?: string;
  children: ReactNode;
}) {
  const color = tone === "warn" ? "border-warn text-warn" : tone === "ok" ? "border-ok text-ok" : "border-line text-muted";
  return (
    <div className={`rounded-lg border-l-2 bg-surface px-3 py-2.5 text-[13px] ${color}`}>
      {title ? <p className="font-semibold">{title}</p> : null}
      <p className="text-ink/80">{children}</p>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center">
      <p className="font-medium">{title}</p>
      {children ? <p className="mx-auto mt-1 max-w-[42ch] text-[13px] text-muted">{children}</p> : null}
      {action ? <div className="mt-3 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="bar">
      <span style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/** Bottom sheet. Traps nothing fancy — escape closes, backdrop closes, body scroll locks. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-[520px] flex-col rounded-t-2xl border border-line bg-surface sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="tap px-2 text-muted" aria-label="Close">
            ✕
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
