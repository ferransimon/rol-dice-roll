import type { PromptKey } from "./presets";
import type { RollSpec } from "./types";

/** Qué prompts tienen sentido para una tirada. */
export function availablePrompts(spec: RollSpec): PromptKey[] {
  const keys: PromptKey[] = [];
  if (spec.groups.length) keys.push("count");
  const k = spec.mode.kind;
  if (k === "rollUnder" || k === "pool" || k === "percentile") keys.push("target");
  if (k !== "genesys") keys.push("modifier");
  if (k === "percentile") keys.push("bonus");
  return keys;
}

export function targetLabel(spec: RollSpec): string {
  switch (spec.mode.kind) {
    case "rollUnder":
      return "Habilidad";
    case "pool":
      return "Dificultad";
    case "percentile":
      return "Habilidad %";
    default:
      return "Objetivo";
  }
}

export function getPromptValue(spec: RollSpec, key: PromptKey): number {
  const m = spec.mode;
  switch (key) {
    case "count":
      return spec.groups[0]?.count ?? 0;
    case "modifier":
      return spec.modifier;
    case "bonus":
      return m.kind === "percentile" ? m.bonus : 0;
    case "target":
      return m.kind === "rollUnder" || m.kind === "pool" ? m.target : m.kind === "percentile" ? m.skill : 0;
  }
}

export function promptBounds(spec: RollSpec, key: PromptKey): { min: number; max: number } {
  switch (key) {
    case "count":
      return { min: 1, max: 60 };
    case "modifier":
      return { min: -50, max: 50 };
    case "bonus":
      return { min: -2, max: 2 };
    case "target":
      return spec.mode.kind === "percentile" ? { min: 1, max: 100 } : { min: 1, max: 40 };
  }
}

export function setPromptValue(spec: RollSpec, key: PromptKey, value: number): RollSpec {
  const m = spec.mode;
  switch (key) {
    case "count":
      return { ...spec, groups: spec.groups.map((g, i) => (i === 0 ? { ...g, count: value } : g)) };
    case "modifier":
      return { ...spec, modifier: value };
    case "bonus":
      return m.kind === "percentile" ? { ...spec, mode: { ...m, bonus: value } } : spec;
    case "target":
      if (m.kind === "rollUnder" || m.kind === "pool") return { ...spec, mode: { ...m, target: value } };
      if (m.kind === "percentile") return { ...spec, mode: { ...m, skill: value } };
      return spec;
  }
}
