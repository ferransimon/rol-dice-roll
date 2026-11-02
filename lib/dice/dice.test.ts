import { afterEach, describe, expect, it } from "vitest";
import { d, dF, dPct, g } from "./dice";
import { formatNotation, parseNotation } from "./notation";
import { setRng } from "./random";
import { evaluate, flipPercent, flipResult, isDouble, roll, rollDice } from "./roll";
import type { DieResult, RollSpec } from "./types";

/** RNG que devuelve una secuencia fija (valores 1..n). */
function seq(...values: number[]) {
  let i = 0;
  setRng(() => values[i++ % values.length]);
}

afterEach(() => setRng());

describe("random", () => {
  it("genera valores en rango y razonablemente uniformes", () => {
    const counts = new Array(6).fill(0);
    for (let i = 0; i < 60000; i++) counts[roll({ groups: [{ die: d(6), count: 1 }], modifier: 0, mode: { kind: "sum" } }).total! - 1]++;
    for (const c of counts) expect(c).toBeGreaterThan(9000);
  });
});

describe("sum", () => {
  it("suma dados y modificador", () => {
    seq(3, 5);
    const r = roll({ groups: [{ die: d(6), count: 2 }], modifier: 2, mode: { kind: "sum" } });
    expect(r.total).toBe(10);
    expect(r.notation).toBe("2d6 + 2");
  });

  it("ventaja se queda con el más alto y marca crítico", () => {
    seq(20, 4);
    const r = roll({ groups: [{ die: d(20), count: 2, keep: { mode: "highest", n: 1 } }], modifier: 5, mode: { kind: "sum", crit: true } });
    expect(r.total).toBe(25);
    expect(r.tone).toBe("crit");
    expect(r.dice.filter((x) => x.dropped)).toHaveLength(1);
  });

  it("desventaja con 1 natural es pifia", () => {
    seq(1, 15);
    const r = roll({ groups: [{ die: d(20), count: 2, keep: { mode: "lowest", n: 1 } }], modifier: 0, mode: { kind: "sum", crit: true } });
    expect(r.total).toBe(1);
    expect(r.tone).toBe("fumble");
  });

  it("dados explosivos encadenan", () => {
    seq(6, 6, 2);
    const r = roll({ groups: [{ die: d(6), count: 1, explode: true }], modifier: 0, mode: { kind: "sum" } });
    expect(r.total).toBe(14);
    expect(r.dice.filter((x) => x.exploded)).toHaveLength(2);
  });
});

describe("threshold (PbtA)", () => {
  const mode = {
    kind: "threshold" as const,
    bands: [
      { min: 10, label: "Éxito total", tone: "success" as const },
      { min: 7, label: "Éxito con coste", tone: "partial" as const },
      { min: -99, label: "Fallo", tone: "fail" as const },
    ],
  };
  it.each([
    [[5, 5], 0, "success"],
    [[3, 4], 0, "partial"],
    [[3, 2], 1, "fail"],
  ] as const)("%j +%i → %s", (values, mod, tone) => {
    seq(...values);
    expect(roll({ groups: [{ die: d(6), count: 2 }], modifier: mod, mode }).tone).toBe(tone);
  });
});

describe("rollUnder GURPS", () => {
  const spec = (target: number): RollSpec => ({ groups: [{ die: d(6), count: 3 }], modifier: 0, mode: { kind: "rollUnder", target, gurps: true } });
  it("3-4 siempre crítico", () => {
    seq(1, 1, 2);
    expect(roll(spec(5)).tone).toBe("crit");
  });
  it("17 es fallo crítico con habilidad ≤ 15", () => {
    seq(6, 6, 5);
    expect(roll(spec(14)).tone).toBe("fumble");
    seq(6, 6, 5);
    expect(roll(spec(16)).tone).toBe("fail");
  });
  it("éxito normal", () => {
    seq(4, 4, 4);
    expect(roll(spec(12)).tone).toBe("success");
  });
});

describe("pool", () => {
  it("Shadowrun: cuenta 5 y 6, complicación con más de la mitad de unos", () => {
    seq(5, 6, 1, 1, 1);
    const r = roll({ groups: [{ die: d(6), count: 5 }], modifier: 0, mode: { kind: "pool", target: 5, glitch: true } });
    expect(r.total).toBe(2);
    expect(r.tone).toBe("partial");
  });
  it("Vampiro: los unos restan y fracaso estrepitoso", () => {
    seq(8, 9, 1, 3);
    let r = roll({ groups: [{ die: d(10), count: 4 }], modifier: 0, mode: { kind: "pool", target: 6, onesCancel: true } });
    expect(r.total).toBe(1);
    seq(2, 3, 1);
    r = roll({ groups: [{ die: d(10), count: 3 }], modifier: 0, mode: { kind: "pool", target: 6, onesCancel: true } });
    expect(r.tone).toBe("fumble");
  });
  it("10 explota y cuenta", () => {
    seq(10, 7, 2);
    const r = roll({ groups: [{ die: d(10), count: 2, explode: true }], modifier: 0, mode: { kind: "pool", target: 6 } });
    expect(r.total).toBe(2);
  });
});

describe("percentil (Cthulhu)", () => {
  const spec = (skill: number, bonus = 0): RollSpec => ({ groups: [{ die: dPct, count: 1 }], modifier: 0, mode: { kind: "percentile", skill, bonus } });
  it("niveles de éxito", () => {
    // randInt(10)-1: unidades primero, luego decenas
    seq(3, 1); // unidades 2, decenas 0 → 02
    expect(roll(spec(50)).headline).toBe("Éxito extremo");
    seq(1, 3); // 20
    expect(roll(spec(50)).headline).toBe("Éxito difícil");
    seq(6, 5); // 45
    expect(roll(spec(50)).headline).toBe("Éxito normal");
    seq(2, 1); // 01
    expect(roll(spec(50)).tone).toBe("crit");
    seq(1, 1); // 00 → 100
    expect(roll(spec(80)).tone).toBe("fumble");
    seq(8, 10); // 97
    expect(roll(spec(40)).tone).toBe("fumble");
  });
  it("bonificación usa la decena más baja", () => {
    seq(6, 8, 2); // unidades 5, decenas 7 y 1 → 15
    expect(roll(spec(50, 1)).total).toBe(15);
    seq(6, 8, 2);
    expect(roll(spec(50, -1)).total).toBe(75);
  });
});

describe("percentil (Troubleshooters)", () => {
  const spec = (skill: number, modifier = 0): RollSpec => ({
    groups: [{ die: dPct, count: 1 }],
    modifier,
    mode: { kind: "percentile", skill, bonus: 0, style: "troubleshooters" },
  });

  it("éxito y fallo sin niveles ni pifias", () => {
    seq(3, 1); // 02
    expect(roll(spec(50)).headline).toBe("Éxito");
    seq(8, 10); // 97
    const r = roll(spec(40));
    expect(r.headline).toBe("Fallo");
    expect(r.tone).toBe("fail");
  });

  it("dobles con éxito dan un punto de historia", () => {
    seq(4, 4); // 33
    const r = roll(spec(50));
    expect(r.storyPoint).toBe(1);
    expect(r.tone).toBe("crit");
    seq(8, 8); // 77
    expect(roll(spec(50)).storyPoint).toBeUndefined();
    seq(1, 1); // 00 = 100
    const z = roll(spec(99));
    expect(z.total).toBe(100);
    expect(z.storyPoint).toBeUndefined();
  });

  it("ignora la bonificación", () => {
    seq(6, 8, 2);
    const r = roll({ ...spec(50), mode: { kind: "percentile", skill: 50, bonus: 1, style: "troubleshooters" } });
    expect(r.total).toBe(75);
    expect(r.dice[0].tens).toHaveLength(1);
  });

  it("gira las decenas y las unidades", () => {
    expect(flipPercent(73)).toBe(37);
    expect(flipPercent(10)).toBe(1);
    expect(flipPercent(1)).toBe(10);
    expect(flipPercent(100)).toBe(100);
    expect([11, 55, 99, 100].every(isDouble)).toBe(true);
    expect([10, 1, 12].some(isDouble)).toBe(false);
  });

  it("girar convierte un fallo en éxito", () => {
    const s = spec(40);
    seq(4, 8); // 73
    const r = roll(s);
    expect(r.tone).toBe("fail");
    expect(r.flip).toEqual({ value: 37, success: true });
    const f = flipResult(s, r);
    expect(f.total).toBe(37);
    expect(f.tone).toBe("success");
    expect(f.flipped).toBe(true);
    expect(f.flip).toBeUndefined();
    expect(f.detail).toContain("73 → 37");
    expect(flipResult(s, f)).toBe(f);
  });

  it("los dobles no se pueden girar", () => {
    seq(5, 5); // 44
    expect(roll(spec(30)).flip).toBeUndefined();
  });
});

describe("fudge", () => {
  it("4dF + modificador con escalera", () => {
    seq(3, 3, 2, 1); // +1 +1 0 -1
    const r = roll({ groups: [{ die: dF, count: 4 }], modifier: 2, mode: { kind: "fudge" } });
    expect(r.total).toBe(3);
    expect(r.headline).toBe("Grande");
  });
});

describe("genesys", () => {
  it("cancela éxitos/fracasos y ventajas/amenazas", () => {
    const spec: RollSpec = { groups: [{ die: g("ability"), count: 1 }, { die: g("difficulty"), count: 1 }], modifier: 0, mode: { kind: "genesys" } };
    const dice: DieResult[] = [
      { die: g("ability"), value: 4, group: 0, symbols: ["success", "success"] },
      { die: g("difficulty"), value: 4, group: 1, symbols: ["threat"] },
    ];
    const r = evaluate(spec, dice);
    expect(r.tone).toBe("partial");
    expect(r.headline).toBe("Éxito pero con amenaza");
  });
  it("triunfo cuenta como éxito y es crítico", () => {
    const spec: RollSpec = { groups: [{ die: g("proficiency"), count: 1 }], modifier: 0, mode: { kind: "genesys" } };
    seq(12);
    const r = roll(spec);
    expect(r.genesys?.triumph).toBe(1);
    expect(r.tone).toBe("crit");
  });
  it("rollDice asigna símbolos", () => {
    seq(1);
    expect(rollDice({ groups: [{ die: g("force"), count: 1 }], modifier: 0, mode: { kind: "genesys" } })[0].symbols).toEqual(["dark"]);
  });
});

describe("notación", () => {
  it.each(["2d6 + 1", "1d20kh1 + 3", "4dF", "1d%", "3d6!", "1d8 + 2d6 − 1"])("ida y vuelta %s", (s) => {
    const p = parseNotation(s)!;
    expect(p).not.toBeNull();
    expect(formatNotation(p)).toBe(s.replace("1d20kh1", "1d20kh1"));
  });
  it("acepta formas cortas", () => {
    expect(parseNotation("d20+5")).toEqual({ groups: [{ die: d(20), count: 1 }], modifier: 5 });
    expect(parseNotation("2d20kl1")!.groups[0].keep).toEqual({ mode: "lowest", n: 1 });
  });
  it("rechaza basura", () => {
    expect(parseNotation("hola")).toBeNull();
    expect(parseNotation("2d6 3")).toBeNull();
    expect(parseNotation("")).toBeNull();
    expect(parseNotation("5")).toBeNull();
  });
});
