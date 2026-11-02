import { roll, sumRange } from "./roll";
import type { RollSpec, Tone } from "./types";

export interface RollStats {
  range: { min: number; max: number } | null;
  mean: number | null;
  /** Probabilidad aproximada de cada tono (crit, success...). */
  tones: Partial<Record<Tone, number>>;
  /** Probabilidad de que el resultado "salga bien" (crit + success + partial*0). */
  successRate: number | null;
}

/** Estadísticas aproximadas por Monte Carlo para la vista previa del editor. */
export function estimate(spec: RollSpec, samples = 3000): RollStats {
  const hasDice = spec.groups.some((g) => g.count > 0);
  if (!hasDice) return { range: null, mean: null, tones: {}, successRate: null };
  const tones: Partial<Record<Tone, number>> = {};
  let sum = 0;
  let numeric = 0;
  for (let i = 0; i < samples; i++) {
    const r = roll(spec);
    tones[r.tone] = (tones[r.tone] ?? 0) + 1;
    if (r.total !== null) {
      sum += r.total;
      numeric++;
    }
  }
  for (const k of Object.keys(tones) as Tone[]) tones[k] = tones[k]! / samples;
  const judged = Object.keys(tones).some((k) => k !== "neutral");
  const successRate = judged ? (tones.crit ?? 0) + (tones.success ?? 0) : null;
  const range = spec.mode.kind === "sum" || spec.mode.kind === "threshold" || spec.mode.kind === "fudge" ? sumRange(spec) : null;
  return { range, mean: numeric ? sum / numeric : null, tones, successRate };
}
