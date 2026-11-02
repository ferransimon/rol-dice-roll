"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "soft" | "ghost" | "danger";

export function Button({
  variant = "soft",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    primary: "bg-tint text-tint-ink shadow-soft",
    soft: "bg-surface-2 text-ink",
    ghost: "bg-transparent text-muted hover:text-ink",
    danger: "",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 ${styles[variant]} ${className}`}
      style={variant === "danger" ? { background: "var(--rosa-bg)", color: "var(--rosa-ink)" } : undefined}
      {...props}
    >
      {children}
    </button>
  );
}

/** Botón que repite `onStep` mientras se mantiene pulsado, acelerando. Devuelve false para parar. */
function HoldButton({ onStep, className, label, disabled, children }: { onStep: () => boolean; className: string; label: string; disabled: boolean; children: ReactNode }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  return (
    <button
      type="button"
      aria-label={label}
      className={className}
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault();
        stop();
        if (!onStep()) return;
        let delay = 380;
        const tick = () => {
          if (!onStep()) return stop();
          delay = Math.max(50, delay * 0.8);
          timer.current = setTimeout(tick, delay);
        };
        timer.current = setTimeout(tick, delay);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onStep();
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

/** Stepper con pulsación mantenida que acelera y número editable. */
export function Stepper({
  value,
  onChange,
  min = -99,
  max = 99,
  step = 1,
  signed,
  suffix,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  signed?: boolean;
  suffix?: string;
  size?: "sm" | "md";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const bump = (dir: 1 | -1) => {
    const next = clamp(valueRef.current + dir * step);
    if (next === valueRef.current) return false;
    valueRef.current = next;
    onChange(next);
    return true;
  };

  const btn = `${size === "sm" ? "h-8 w-8 text-base" : "h-10 w-10 text-lg"} grid place-items-center rounded-xl bg-surface font-black text-muted shadow-soft select-none active:scale-90 disabled:opacity-30`;
  const shown = signed && value > 0 ? `+${value}` : String(value);

  return (
    <div className="inline-flex items-center gap-1 rounded-2xl bg-surface-2 p-1">
      <HoldButton label="Menos" className={btn} disabled={value <= min} onStep={() => bump(-1)}>
        −
      </HoldButton>
      {editing ? (
        <input
          autoFocus
          inputMode="numeric"
          className="w-12 bg-transparent text-center font-extrabold tabular-nums outline-none"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const n = parseInt(draft.replace("+", ""), 10);
            if (!Number.isNaN(n)) onChange(clamp(n));
            setEditing(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
      ) : (
        <button
          type="button"
          className="min-w-12 px-1 text-center font-extrabold tabular-nums"
          onClick={() => {
            setDraft(String(value));
            setEditing(true);
          }}
        >
          <motion.span key={value} initial={{ y: -6, opacity: 0.4 }} animate={{ y: 0, opacity: 1 }} className="inline-block">
            {shown}
            {suffix}
          </motion.span>
        </button>
      )}
      <HoldButton label="Más" className={btn} disabled={value >= max} onStep={() => bump(1)}>
        +
      </HoldButton>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 py-2 text-left"
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-tint" : "bg-line"}`}>
        <motion.span
          className="absolute top-1 h-5 w-5 rounded-full bg-surface shadow-soft"
          animate={{ left: checked ? 24 : 4 }}
        />
      </span>
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  layoutId,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  layoutId: string;
}) {
  return (
    <div className="flex rounded-2xl bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`relative flex-1 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${value === o.value ? "text-ink" : "text-muted"}`}
        >
          {value === o.value && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-xl bg-surface shadow-soft" />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children, hint }: { label: ReactNode; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold tracking-wide text-muted uppercase">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 font-semibold outline-none transition focus:border-[var(--lavanda)] focus:bg-surface";

export function Card({ children, className = "", tint }: { children: ReactNode; className?: string; tint?: string }) {
  return (
    <div data-tint={tint} className={`rounded-3xl bg-surface p-4 shadow-soft ${className}`}>
      {children}
    </div>
  );
}
