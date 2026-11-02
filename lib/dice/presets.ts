import { d, dF, dPct, g, STANDARD_DICE } from "./dice";
import type { DieKind, EvalMode, RollSpec } from "./types";

export type PromptKey = "count" | "target" | "modifier" | "bonus";

export const PROMPT_LABELS: Record<PromptKey, string> = {
  count: "Dados",
  target: "Objetivo",
  modifier: "Modificador",
  bonus: "Bonif. / Penaliz.",
};

export interface SavedRoll {
  id: string;
  name: string;
  spec: RollSpec;
  /** Valores que se piden al tirar (con stepper rápido). */
  prompts?: PromptKey[];
}

export type Tint = "lavanda" | "menta" | "melocoton" | "cielo" | "rosa" | "limon" | "salvia";
export const TINTS: Tint[] = ["lavanda", "menta", "melocoton", "cielo", "rosa", "limon", "salvia"];

export interface Game {
  id: string;
  name: string;
  tint: Tint;
  description?: string;
  /** Dados disponibles en la bandeja rápida. */
  quickDice: DieKind[];
  /** Cómo se evalúan las tiradas hechas desde la bandeja rápida. */
  trayMode: EvalMode;
  rolls: SavedRoll[];
  /** Lleva la cuenta de puntos de historia de cada jugador. */
  storyPoints?: boolean;
}

const PBTA_BANDS: EvalMode = {
  kind: "threshold",
  bands: [
    { min: 10, label: "Éxito total", tone: "success" },
    { min: 7, label: "Éxito con coste", tone: "partial" },
    { min: -99, label: "Fallo", tone: "fail" },
  ],
};

const r = (id: string, name: string, spec: RollSpec, prompts?: PromptKey[]): SavedRoll => ({ id, name, spec, prompts });
const sum = (crit = false): EvalMode => ({ kind: "sum", crit });

/** Plantillas de juego. Los ids se regeneran al instanciarlas. */
export const PRESETS: Game[] = [
  {
    id: "dnd",
    name: "D&D 5e / Pathfinder",
    tint: "lavanda",
    description: "Sistema d20 con set poliédrico completo",
    quickDice: STANDARD_DICE,
    trayMode: sum(true),
    rolls: [
      r("check", "Prueba", { groups: [{ die: d(20), count: 1 }], modifier: 0, mode: sum(true) }, ["modifier"]),
      r("adv", "Con ventaja", { groups: [{ die: d(20), count: 2, keep: { mode: "highest", n: 1 } }], modifier: 0, mode: sum(true) }, ["modifier"]),
      r("dis", "Con desventaja", { groups: [{ die: d(20), count: 2, keep: { mode: "lowest", n: 1 } }], modifier: 0, mode: sum(true) }, ["modifier"]),
      r("sword", "Espada larga", { groups: [{ die: d(8), count: 1 }], modifier: 3, mode: sum() }),
      r("fireball", "Bola de fuego", { groups: [{ die: d(6), count: 8 }], modifier: 0, mode: sum() }),
      r("stats", "Característica (4d6, 3 mejores)", { groups: [{ die: d(6), count: 4, keep: { mode: "highest", n: 3 } }], modifier: 0, mode: sum() }),
    ],
  },
  {
    id: "pbta",
    name: "Powered by the Apocalypse",
    tint: "rosa",
    description: "2d6 + característica: 10+, 7–9, 6-",
    quickDice: [d(6)],
    trayMode: PBTA_BANDS,
    rolls: [r("move", "Movimiento", { groups: [{ die: d(6), count: 2 }], modifier: 0, mode: PBTA_BANDS }, ["modifier"])],
  },
  {
    id: "gurps",
    name: "GURPS",
    tint: "salvia",
    description: "3d6 igual o por debajo de tu nivel de habilidad",
    quickDice: [d(6)],
    trayMode: { kind: "rollUnder", target: 12, gurps: true },
    rolls: [
      r("skill", "Prueba de habilidad", { groups: [{ die: d(6), count: 3 }], modifier: 0, mode: { kind: "rollUnder", target: 12, gurps: true } }, ["target", "modifier"]),
      r("dmg", "Daño 2d+1", { groups: [{ die: d(6), count: 2 }], modifier: 1, mode: sum() }),
    ],
  },
  {
    id: "shadowrun",
    name: "Shadowrun",
    tint: "cielo",
    description: "Reserva de d6, cuentan los 5 y 6",
    quickDice: [d(6)],
    trayMode: { kind: "pool", target: 5, glitch: true },
    rolls: [
      r("pool", "Reserva", { groups: [{ die: d(6), count: 8 }], modifier: 0, mode: { kind: "pool", target: 5, glitch: true } }, ["count"]),
      r("edge", "Reserva con Edge (6 explota)", { groups: [{ die: d(6), count: 8, explode: true }], modifier: 0, mode: { kind: "pool", target: 5, glitch: true } }, ["count"]),
    ],
  },
  {
    id: "vampire",
    name: "Vampiro: La Mascarada",
    tint: "melocoton",
    description: "Reserva de d10 contra la dificultad del narrador",
    quickDice: [d(10)],
    trayMode: { kind: "pool", target: 6, onesCancel: true },
    rolls: [
      r("pool", "Reserva vs dificultad", { groups: [{ die: d(10), count: 5 }], modifier: 0, mode: { kind: "pool", target: 6, onesCancel: true } }, ["count", "target"]),
      r("spec", "Especialidad (10 explota)", { groups: [{ die: d(10), count: 5, explode: true }], modifier: 0, mode: { kind: "pool", target: 6, onesCancel: true } }, ["count", "target"]),
    ],
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk RED",
    tint: "limon",
    description: "d10 + estadística + habilidad",
    quickDice: [d(10), d(6)],
    trayMode: sum(),
    rolls: [
      r("check", "Prueba de habilidad", { groups: [{ die: d(10), count: 1 }], modifier: 0, mode: sum() }, ["modifier"]),
      r("pistol", "Daño pistola pesada", { groups: [{ die: d(6), count: 3 }], modifier: 0, mode: sum() }),
    ],
  },
  {
    id: "cthulhu",
    name: "La Llamada de Cthulhu",
    tint: "menta",
    description: "d100 por debajo de tu habilidad",
    quickDice: [dPct, d(6), d(4), d(8)],
    trayMode: { kind: "percentile", skill: 50, bonus: 0 },
    rolls: [
      r("skill", "Tirada de habilidad", { groups: [{ die: dPct, count: 1 }], modifier: 0, mode: { kind: "percentile", skill: 50, bonus: 0 } }, ["target", "bonus"]),
      r("san", "Cordura", { groups: [{ die: dPct, count: 1 }], modifier: 0, mode: { kind: "percentile", skill: 60, bonus: 0 } }, ["target"]),
      r("sanloss", "Pérdida de cordura 1d6", { groups: [{ die: d(6), count: 1 }], modifier: 0, mode: sum() }),
    ],
  },
  {
    id: "troubleshooters",
    name: "Troubleshooters",
    tint: "melocoton",
    description: "d100 bajo habilidad · gira la tirada con puntos de historia",
    storyPoints: true,
    quickDice: [dPct, d(6)],
    trayMode: { kind: "percentile", skill: 50, bonus: 0, style: "troubleshooters" },
    rolls: [
      r("skill", "Tirada de habilidad", { groups: [{ die: dPct, count: 1 }], modifier: 0, mode: { kind: "percentile", skill: 50, bonus: 0, style: "troubleshooters" } }, ["target"]),
      r("attack", "Dados de ataque", { groups: [{ die: d(6), count: 2, explode: true }], modifier: 0, mode: sum() }, ["count"]),
      r("dmg", "Daño 1d6", { groups: [{ die: d(6), count: 1, explode: true }], modifier: 0, mode: sum() }, ["modifier"]),
    ],
  },
  {
    id: "fate",
    name: "Fate / Fudge",
    tint: "lavanda",
    description: "4dF: resultado entre −4 y +4",
    quickDice: [dF],
    trayMode: { kind: "fudge" },
    rolls: [r("roll", "Tirada", { groups: [{ die: dF, count: 4 }], modifier: 0, mode: { kind: "fudge" } }, ["modifier"])],
  },
  {
    id: "genesys",
    name: "Genesys / Star Wars",
    tint: "cielo",
    description: "Dados narrativos con símbolos que se cancelan",
    quickDice: ["ability", "proficiency", "boost", "difficulty", "challenge", "setback", "force"].map((c) => g(c as never)),
    trayMode: { kind: "genesys" },
    rolls: [
      r("avg", "Prueba media", {
        groups: [
          { die: g("ability"), count: 2 },
          { die: g("proficiency"), count: 1 },
          { die: g("difficulty"), count: 2 },
        ],
        modifier: 0,
        mode: { kind: "genesys" },
      }),
      r("force", "Fuerza", { groups: [{ die: g("force"), count: 1 }], modifier: 0, mode: { kind: "genesys" } }),
    ],
  },
  {
    id: "free",
    name: "Libre",
    tint: "salvia",
    description: "Todos los dados, sin reglas",
    quickDice: [...STANDARD_DICE, dF],
    trayMode: sum(),
    rolls: [],
  },
];
