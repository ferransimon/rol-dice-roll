"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Band, EvalKind, EvalMode, Tone } from "@/lib/dice/types";
import { Segmented, Stepper, Toggle, inputClass } from "@/components/ui/controls";

export const MODE_LABELS: Record<EvalKind, { name: string; hint: string }> = {
  sum: { name: "Suma", hint: "Suma los dados y el modificador" },
  threshold: { name: "Bandas", hint: "El total cae en un tramo (p.ej. 10+, 7–9, 6-)" },
  rollUnder: { name: "Bajo objetivo", hint: "Igual o por debajo de la habilidad" },
  pool: { name: "Reserva", hint: "Cuenta los dados que igualan o superan la dificultad" },
  percentile: { name: "Percentil", hint: "d100 por debajo de la habilidad (Cthulhu con niveles de éxito, o Troubleshooters girable)" },
  fudge: { name: "Fate", hint: "Dados ±, escalera de adjetivos" },
  genesys: { name: "Narrativo", hint: "Símbolos de éxito/fracaso y ventaja/amenaza que se cancelan" },
};

export function defaultMode(kind: EvalKind): EvalMode {
  switch (kind) {
    case "sum":
      return { kind, crit: false };
    case "threshold":
      return {
        kind,
        bands: [
          { min: 10, label: "Éxito total", tone: "success" },
          { min: 7, label: "Éxito parcial", tone: "partial" },
          { min: -99, label: "Fallo", tone: "fail" },
        ],
      };
    case "rollUnder":
      return { kind, target: 12, gurps: false };
    case "pool":
      return { kind, target: 6, onesCancel: false, glitch: false };
    case "percentile":
      return { kind, skill: 50, bonus: 0 };
    case "fudge":
      return { kind };
    case "genesys":
      return { kind };
  }
}

const TONES: { tone: Tone; label: string }[] = [
  { tone: "crit", label: "Crítico" },
  { tone: "success", label: "Éxito" },
  { tone: "partial", label: "Parcial" },
  { tone: "fail", label: "Fallo" },
];

function BandsEditor({ bands, onChange }: { bands: Band[]; onChange: (b: Band[]) => void }) {
  const sorted = bands.map((b, i) => ({ b, i })).sort((x, y) => y.b.min - x.b.min);
  const set = (i: number, patch: Partial<Band>) => onChange(bands.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {sorted.map(({ b, i }) => (
          <motion.div
            key={i}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            data-tone={b.tone}
            className="rounded-2xl bg-tint-bg p-2"
          >
            <div className="flex items-center gap-2">
              <Stepper size="sm" value={b.min} min={-99} max={200} onChange={(min) => set(i, { min })} suffix="+" />
              <input className={`${inputClass} !py-1.5 !text-sm`} value={b.label} onChange={(e) => set(i, { label: e.target.value })} />
              <button type="button" aria-label="Quitar tramo" className="px-2 text-lg text-muted" onClick={() => onChange(bands.filter((_, j) => j !== i))}>
                ×
              </button>
            </div>
            <div className="mt-2 flex gap-1">
              {TONES.map((t) => (
                <button
                  key={t.tone}
                  type="button"
                  data-tone={t.tone}
                  onClick={() => set(i, { tone: t.tone })}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${b.tone === t.tone ? "bg-tint text-tint-ink" : "text-muted"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <button
        type="button"
        className="w-full rounded-2xl border border-dashed border-line py-2 text-sm font-bold text-muted"
        onClick={() => onChange([...bands, { min: (sorted[0]?.b.min ?? 0) + 3, label: "Nuevo tramo", tone: "success" }])}
      >
        + Añadir tramo
      </button>
    </div>
  );
}

export function ModeEditor({ mode, onChange }: { mode: EvalMode; onChange: (m: EvalMode) => void }) {
  return (
    <div className="space-y-3">
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {(Object.keys(MODE_LABELS) as EvalKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => k !== mode.kind && onChange(defaultMode(k))}
            className={`relative shrink-0 rounded-full px-3.5 py-2 text-sm font-bold transition-colors ${mode.kind === k ? "text-tint-ink" : "bg-surface-2 text-muted"}`}
          >
            {mode.kind === k && <motion.span layoutId="mode-pill" className="absolute inset-0 rounded-full bg-tint" />}
            <span className="relative">{MODE_LABELS[k].name}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">{MODE_LABELS[mode.kind].hint}</p>

      <motion.div layout className="space-y-2">
        {mode.kind === "sum" && <Toggle checked={!!mode.crit} onChange={(crit) => onChange({ ...mode, crit })} label="Marcar 20 natural y 1 natural" />}
        {mode.kind === "threshold" && <BandsEditor bands={mode.bands} onChange={(bands) => onChange({ ...mode, bands })} />}
        {mode.kind === "rollUnder" && (
          <>
            <Row label="Habilidad">
              <Stepper value={mode.target} min={1} max={40} onChange={(target) => onChange({ ...mode, target })} />
            </Row>
            <Toggle checked={!!mode.gurps} onChange={(gurps) => onChange({ ...mode, gurps })} label="Críticos de GURPS" />
          </>
        )}
        {mode.kind === "pool" && (
          <>
            <Row label="Éxito con">
              <Stepper value={mode.target} min={1} max={100} onChange={(target) => onChange({ ...mode, target })} suffix="+" />
            </Row>
            <Toggle checked={!!mode.onesCancel} onChange={(onesCancel) => onChange({ ...mode, onesCancel })} label="Los 1 restan un éxito" />
            <Toggle checked={!!mode.glitch} onChange={(glitch) => onChange({ ...mode, glitch })} label="Complicación si más de la mitad son 1" />
          </>
        )}
        {mode.kind === "percentile" && (
          <>
            <Segmented
              layoutId="pct-style"
              value={mode.style ?? "cthulhu"}
              onChange={(style) => onChange({ ...mode, style, bonus: style === "troubleshooters" ? 0 : mode.bonus })}
              options={[
                { value: "cthulhu", label: "Cthulhu" },
                { value: "troubleshooters", label: "Troubleshooters" },
              ]}
            />
            <p className="text-xs text-muted">
              {mode.style === "troubleshooters"
                ? "Éxito o fallo. Dobles con éxito dan un punto de historia, y se puede girar la tirada (73 → 37) gastando uno."
                : "Crítico (01), extremo (⅕), difícil (½), normal, fallo y pifia."}
            </p>
            <Row label="Habilidad">
              <Stepper value={mode.skill} min={1} max={100} onChange={(skill) => onChange({ ...mode, skill })} suffix="%" />
            </Row>
            {mode.style !== "troubleshooters" && (
              <Row label="Bonif. / Penaliz.">
                <Stepper value={mode.bonus} min={-2} max={2} signed onChange={(bonus) => onChange({ ...mode, bonus })} />
              </Row>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm font-semibold">{label}</span>
      {children}
    </div>
  );
}
