import { GENESYS_INFO, d, dF, dPct } from "./dice";
import type { DiceGroup, EvalMode, RollSpec } from "./types";

function formatGroup(g: DiceGroup): string {
  if (g.die.type === "genesys") return `${g.count}${GENESYS_INFO[g.die.color].short}`;
  const label = g.die.type === "standard" ? `d${g.die.sides}` : g.die.type === "fudge" ? "dF" : "d%";
  let s = `${g.count}${label}`;
  if (g.keep) s += `${g.keep.mode === "highest" ? "kh" : "kl"}${g.keep.n}`;
  if (g.explode) s += "!";
  return s;
}

export function formatNotation(spec: Pick<RollSpec, "groups" | "modifier">): string {
  const parts = spec.groups.filter((g) => g.count > 0).map(formatGroup);
  const genesys = spec.groups.length > 0 && spec.groups.every((g) => g.die.type === "genesys");
  let s = parts.join(genesys ? " " : " + ");
  if (spec.modifier) s += `${s ? " " : ""}${spec.modifier > 0 ? "+" : "−"} ${Math.abs(spec.modifier)}`;
  return s || "—";
}

export function describeMode(mode: EvalMode, modifier = 0): string {
  switch (mode.kind) {
    case "sum":
      return mode.crit ? "Suma · críticos" : "Suma";
    case "threshold":
      return mode.bands
        .slice()
        .sort((a, b) => b.min - a.min)
        .map((b) => `${b.min}+ ${b.label.toLowerCase()}`)
        .join(" · ");
    case "rollUnder":
      return `≤ ${mode.target + modifier}${mode.gurps ? " · GURPS" : ""}`;
    case "pool":
      return `Éxitos ≥ ${mode.target}`;
    case "percentile":
      return `≤ ${mode.skill + modifier}%${mode.bonus > 0 ? ` · +${mode.bonus} bonif.` : mode.bonus < 0 ? ` · ${-mode.bonus} penaliz.` : ""}`;
    case "fudge":
      return "Escalera Fate";
    case "genesys":
      return "Símbolos narrativos";
  }
}

const TOKEN = /([+-])?\s*(?:(\d*)\s*d\s*(\d+|f|%)\s*(?:(kh|kl|k)(\d+))?\s*(!)?|(\d+))/giy;

/**
 * Parsea notación tipo "2d6+1", "4dF", "1d%", "2d20kh1", "3d6!", "1d8 + 2d6 - 1".
 * Devuelve null si no es válida.
 */
export function parseNotation(input: string): Pick<RollSpec, "groups" | "modifier"> | null {
  const src = input.replace(/−/g, "-").trim();
  if (!src) return null;
  const groups: DiceGroup[] = [];
  let modifier = 0;
  TOKEN.lastIndex = 0;
  let first = true;
  while (TOKEN.lastIndex < src.length) {
    while (src[TOKEN.lastIndex] === " ") TOKEN.lastIndex++;
    if (TOKEN.lastIndex >= src.length) break;
    const m = TOKEN.exec(src);
    if (!m) return null;
    const [, sign, count, faces, keep, keepN, bang, num] = m;
    if (!first && !sign) return null;
    first = false;
    const neg = sign === "-";
    if (num !== undefined) {
      modifier += neg ? -Number(num) : Number(num);
      continue;
    }
    if (neg) return null;
    const n = count ? Number(count) : 1;
    if (n < 1 || n > 100) return null;
    const f = faces.toLowerCase();
    const die = f === "f" ? dF : f === "%" ? dPct : d(Number(f));
    if (die.type === "standard" && (die.sides < 2 || die.sides > 1000)) return null;
    const group: DiceGroup = { die, count: n };
    if (keep) group.keep = { mode: keep.toLowerCase() === "kl" ? "lowest" : "highest", n: Number(keepN) };
    if (bang) group.explode = true;
    groups.push(group);
  }
  if (!groups.length) return null;
  return { groups, modifier };
}
