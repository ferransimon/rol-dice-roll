import { GENESYS_FACES, SYMBOL_INFO, sidesOf } from "./dice";
import { formatNotation } from "./notation";
import { randInt } from "./random";
import type {
  DieResult,
  EvalMode,
  GenesysSymbol,
  GenesysTally,
  RollResult,
  RollSpec,
  Tone,
} from "./types";

const MAX_EXPLOSIONS = 50;

function rollPercentile(bonus: number): { value: number; tens: number[]; units: number } {
  const units = randInt(10) - 1;
  const tens = Array.from({ length: 1 + Math.abs(bonus) }, () => randInt(10) - 1);
  const values = tens.map((t) => t * 10 + units || 100);
  const value = bonus >= 0 ? Math.min(...values) : Math.max(...values);
  return { value, tens, units };
}

export function rollDice(spec: RollSpec): DieResult[] {
  const out: DieResult[] = [];
  const bonus = spec.mode.kind === "percentile" && spec.mode.style !== "troubleshooters" ? spec.mode.bonus : 0;

  spec.groups.forEach((group, gi) => {
    const { die } = group;
    const count = Math.max(0, Math.min(100, Math.floor(group.count)));
    const base: DieResult[] = [];
    for (let i = 0; i < count; i++) {
      switch (die.type) {
        case "standard":
          base.push({ die, value: randInt(die.sides), group: gi });
          break;
        case "fudge":
          base.push({ die, value: randInt(3) - 2, group: gi });
          break;
        case "percentile": {
          const p = rollPercentile(bonus);
          base.push({ die, value: p.value, tens: p.tens, units: p.units, group: gi });
          break;
        }
        case "genesys": {
          const value = randInt(GENESYS_FACES[die.color].length);
          base.push({ die, value, group: gi, symbols: GENESYS_FACES[die.color][value - 1] });
          break;
        }
      }
    }

    if (group.keep && group.keep.n < base.length) {
      const order = base
        .map((r, i) => ({ v: r.value, i }))
        .sort((a, b) => (group.keep!.mode === "highest" ? b.v - a.v : a.v - b.v));
      const kept = new Set(order.slice(0, Math.max(0, group.keep.n)).map((o) => o.i));
      base.forEach((r, i) => {
        if (!kept.has(i)) r.dropped = true;
      });
    }

    out.push(...base);

    if (group.explode && !group.keep && die.type === "standard" && die.sides > 1) {
      let pending = base.filter((r) => r.value === die.sides).length;
      let n = 0;
      while (pending > 0 && n < MAX_EXPLOSIONS) {
        const value = randInt(die.sides);
        out.push({ die, value, group: gi, exploded: true });
        pending--;
        n++;
        if (value === die.sides) pending++;
      }
    }
  });

  return out;
}

const plural = (n: number, one: string, many: string) => `${n} ${Math.abs(n) === 1 ? one : many}`;

export const FATE_LADDER: Record<number, string> = {
  8: "Legendario",
  7: "Épico",
  6: "Fantástico",
  5: "Excepcional",
  4: "Magnífico",
  3: "Grande",
  2: "Bueno",
  1: "Normal",
  0: "Mediocre",
  [-1]: "Pobre",
  [-2]: "Terrible",
};

export function fateLabel(n: number): string {
  if (n > 8) return `Legendario +${n - 8}`;
  if (n < -2) return n === -3 ? "Horrible" : "Catastrófico";
  return FATE_LADDER[n];
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

function emptyTally(): GenesysTally {
  return {
    success: 0,
    failure: 0,
    advantage: 0,
    threat: 0,
    triumph: 0,
    despair: 0,
    light: 0,
    dark: 0,
  };
}

export function evaluate(spec: RollSpec, dice: DieResult[]): RollResult {
  const mode: EvalMode = spec.mode;
  const kept = dice.filter((r) => !r.dropped);
  const numeric = kept.filter((r) => r.die.type !== "genesys");
  const diceSum = numeric.reduce((acc, r) => acc + r.value, 0);
  const notation = formatNotation(spec);
  const mod = spec.modifier;

  const result = (
    total: number | null,
    headline: string,
    tone: Tone,
    detail?: string,
    extra?: Partial<RollResult>,
  ): RollResult => ({ dice, total, headline, tone, detail, notation, ...extra });

  switch (mode.kind) {
    case "sum": {
      const total = diceSum + mod;
      const detail = mod ? `${diceSum} ${mod > 0 ? "+" : "−"} ${Math.abs(mod)}` : undefined;
      if (mode.crit) {
        const d20 = kept.filter((r) => r.die.type === "standard" && r.die.sides === 20 && !r.exploded);
        if (d20.length === 1) {
          if (d20[0].value === 20) return result(total, "¡20 natural!", "crit", detail);
          if (d20[0].value === 1) return result(total, "1 natural", "fumble", detail);
        }
      }
      return result(total, "Total", "neutral", detail);
    }

    case "threshold": {
      const total = diceSum + mod;
      const bands = [...mode.bands].sort((a, b) => b.min - a.min);
      const band = bands.find((b) => total >= b.min);
      const detail = mod ? `${diceSum} ${mod > 0 ? "+" : "−"} ${Math.abs(mod)}` : undefined;
      return result(total, band?.label ?? "Total", band?.tone ?? "neutral", detail);
    }

    case "rollUnder": {
      const target = mode.target + mod;
      const total = diceSum;
      const margin = target - total;
      const detail = `Objetivo ${target} · margen ${signed(margin)}`;
      if (mode.gurps) {
        const critSuccess = total <= 4 || (total === 5 && target >= 15) || (total === 6 && target >= 16);
        const critFail = total === 18 || (total === 17 && target <= 15) || total - target >= 10;
        if (critSuccess) return result(total, "¡Éxito crítico!", "crit", detail);
        if (critFail) return result(total, "¡Fallo crítico!", "fumble", detail);
      }
      return total <= target
        ? result(total, "Éxito", "success", detail)
        : result(total, "Fallo", "fail", detail);
    }

    case "pool": {
      const poolDice = kept.filter((r) => r.die.type === "standard");
      let hits = 0;
      let ones = 0;
      let baseOnes = 0;
      let baseCount = 0;
      for (const r of poolDice) {
        r.hit = r.value >= mode.target;
        r.one = r.value === 1;
        if (r.hit) hits++;
        if (r.one) ones++;
        if (!r.exploded) {
          baseCount++;
          if (r.one) baseOnes++;
        }
      }
      const net = hits - (mode.onesCancel ? ones : 0) + mod;
      const parts = [`${plural(hits, "dado", "dados")} ≥ ${mode.target}`];
      if (mode.onesCancel && ones) parts.push(`${plural(ones, "uno resta", "unos restan")}`);
      if (mod) parts.push(`${signed(mod)} automático${Math.abs(mod) === 1 ? "" : "s"}`);
      const detail = parts.join(" · ");
      const glitch = mode.glitch && baseCount > 0 && baseOnes > baseCount / 2;
      if (glitch) {
        return net > 0
          ? result(net, `${plural(net, "éxito", "éxitos")} · complicación`, "partial", detail)
          : result(0, "¡Complicación crítica!", "fumble", detail);
      }
      if (mode.onesCancel && hits === 0 && ones > 0) {
        return result(net, "¡Fracaso estrepitoso!", "fumble", detail);
      }
      if (net > 0) return result(net, plural(net, "éxito", "éxitos"), "success", detail);
      return result(Math.max(0, net), "Sin éxitos", "fail", detail);
    }

    case "percentile": {
      const pct = kept.find((r) => r.die.type === "percentile" || (r.die.type === "standard" && r.die.sides === 100));
      const skill = mode.skill + mod;
      if (!pct) return result(null, "Añade un d%", "neutral");
      const v = pct.value;
      if (mode.style === "troubleshooters") {
        const ok = v <= skill;
        const parts = [`Habilidad ${skill}`];
        const flipped = flipPercent(v);
        const flip = flipped !== v ? { value: flipped, success: flipped <= skill } : undefined;
        if (isDouble(v) && ok) {
          parts.push("+1 punto de historia");
          return result(v, "¡Dobles! Éxito", "crit", parts.join(" · "), { flip, storyPoint: 1 });
        }
        if (isDouble(v)) parts.push("dobles");
        return result(v, ok ? "Éxito" : "Fallo", ok ? "success" : "fail", parts.join(" · "), { flip });
      }
      const extreme = Math.floor(skill / 5);
      const hard = Math.floor(skill / 2);
      const detail = `Habilidad ${skill} · difícil ${hard} · extremo ${extreme}`;
      const fumble = skill < 50 ? v >= 96 : v === 100;
      if (v === 1) return result(v, "¡Crítico!", "crit", detail);
      if (fumble) return result(v, "¡Pifia!", "fumble", detail);
      if (v <= extreme) return result(v, "Éxito extremo", "crit", detail);
      if (v <= hard) return result(v, "Éxito difícil", "success", detail);
      if (v <= skill) return result(v, "Éxito normal", "success", detail);
      return result(v, "Fallo", "fail", detail);
    }

    case "fudge": {
      const total = diceSum + mod;
      const tone: Tone = total > 0 ? "success" : total < 0 ? "fail" : "partial";
      const detail = mod ? `Dados ${signed(diceSum)} · modificador ${signed(mod)}` : undefined;
      return result(total, fateLabel(total), tone, detail);
    }

    case "genesys": {
      const t = emptyTally();
      for (const r of kept) for (const s of r.symbols ?? []) t[s as GenesysSymbol]++;
      const hasCheck = kept.some((r) => r.die.type === "genesys" && r.die.color !== "force");
      if (!hasCheck) {
        const onlyForce = kept.some((r) => r.die.type === "genesys");
        if (!onlyForce) return result(diceSum + mod, "Total", "neutral");
        return result(null, `${plural(t.light, "punto", "puntos")} de luz · ${t.dark} de oscuridad`, "neutral", undefined, {
          genesys: t,
        });
      }
      const netS = t.success + t.triumph - t.failure - t.despair;
      const netA = t.advantage - t.threat;
      const ok = netS >= 1;
      const parts: string[] = [];
      if (netS > 0) parts.push(plural(netS, "éxito neto", "éxitos netos"));
      else if (netS < 0) parts.push(plural(-netS, "fracaso neto", "fracasos netos"));
      if (netA > 0) parts.push(plural(netA, "ventaja", "ventajas"));
      if (netA < 0) parts.push(plural(-netA, "amenaza", "amenazas"));
      if (t.triumph) parts.push(plural(t.triumph, SYMBOL_INFO.triumph.name, SYMBOL_INFO.triumph.plural));
      if (t.despair) parts.push(plural(t.despair, SYMBOL_INFO.despair.name, SYMBOL_INFO.despair.plural));
      if (t.light || t.dark) parts.push(`fuerza ${t.light}○ ${t.dark}●`);
      let headline = ok ? "Éxito" : "Fracaso";
      if (netA > 0) headline += ok ? " con ventaja" : " pero con ventaja";
      if (netA < 0) headline += ok ? " pero con amenaza" : " con amenaza";
      const tone: Tone = ok && t.triumph ? "crit" : !ok && t.despair ? "fumble" : ok ? (netA < 0 ? "partial" : "success") : netA > 0 ? "partial" : "fail";
      return result(null, headline, tone, parts.join(" · "), { genesys: t });
    }
  }
}

/** Dobles en un d100: 11, 22… 99 y 00 (= 100). */
export function isDouble(v: number): boolean {
  return v === 100 || (v % 11 === 0 && v > 0 && v < 100);
}

/** Intercambia decenas y unidades: 73 → 37, 10 → 01 (= 1), 00 → 00. */
export function flipPercent(v: number): number {
  const n = v % 100;
  const flipped = (n % 10) * 10 + Math.floor(n / 10);
  return flipped || 100;
}

/** Troubleshooters: gira la tirada de percentil (gastando un punto de historia). */
export function flipResult(spec: RollSpec, prev: RollResult): RollResult {
  const idx = prev.dice.findIndex((r) => !r.dropped && (r.die.type === "percentile" || (r.die.type === "standard" && r.die.sides === 100)));
  if (idx < 0 || prev.flipped) return prev;
  const from = prev.dice[idx].value;
  const to = flipPercent(from);
  const dice = prev.dice.map((r, i) =>
    i === idx ? { ...r, value: to, flipped: true, tens: [Math.floor((to % 100) / 10)], units: to % 10 } : { ...r },
  );
  const next = evaluate(spec, dice);
  const pad = (n: number) => String(n % 100).padStart(2, "0");
  return {
    ...next,
    headline: `${next.headline.replace("¡Dobles! ", "")} (girada)`,
    tone: next.tone === "crit" ? "success" : next.tone,
    detail: [`Girada: ${pad(from)} → ${pad(to)}`, next.detail?.replace(" · +1 punto de historia", "")].filter(Boolean).join(" · "),
    storyPoint: undefined,
    flip: undefined,
    flipped: true,
  };
}

export function roll(spec: RollSpec): RollResult {
  return evaluate(spec, rollDice(spec));
}

/** Para las estadísticas del editor: rango teórico de una tirada sumada. */
export function sumRange(spec: RollSpec): { min: number; max: number } | null {
  let min = spec.modifier;
  let max = spec.modifier;
  for (const g of spec.groups) {
    if (g.die.type === "genesys") return null;
    const n = g.keep ? Math.min(g.keep.n, g.count) : g.count;
    if (g.die.type === "fudge") {
      min -= n;
      max += n;
    } else {
      min += n;
      max += n * sidesOf(g.die);
    }
  }
  return { min, max };
}
