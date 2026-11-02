import type { DieKind, GenesysColor, GenesysSymbol } from "./types";

type Face = GenesysSymbol[];
const S: GenesysSymbol = "success";
const F: GenesysSymbol = "failure";
const A: GenesysSymbol = "advantage";
const T: GenesysSymbol = "threat";
const TR: GenesysSymbol = "triumph";
const DE: GenesysSymbol = "despair";
const L: GenesysSymbol = "light";
const D: GenesysSymbol = "dark";

export const GENESYS_FACES: Record<GenesysColor, Face[]> = {
  boost: [[], [], [S], [S, A], [A, A], [A]],
  setback: [[], [], [F], [F], [T], [T]],
  ability: [[], [S], [S], [S, S], [A], [A], [S, A], [A, A]],
  difficulty: [[], [F], [F, F], [T], [T], [T], [T, T], [F, T]],
  proficiency: [[], [S], [S], [S, S], [S, S], [A], [S, A], [S, A], [S, A], [A, A], [A, A], [TR]],
  challenge: [[], [F], [F], [F, F], [F, F], [T], [T], [F, T], [F, T], [T, T], [T, T], [DE]],
  force: [[D], [D], [D], [D], [D], [D], [D, D], [L], [L], [L, L], [L, L], [L, L]],
};

export const GENESYS_INFO: Record<GenesysColor, { name: string; short: string }> = {
  ability: { name: "Capacidad", short: "C" },
  proficiency: { name: "Pericia", short: "P" },
  boost: { name: "Bonificación", short: "B" },
  difficulty: { name: "Dificultad", short: "D" },
  challenge: { name: "Desafío", short: "R" },
  setback: { name: "Contratiempo", short: "X" },
  force: { name: "Fuerza", short: "F" },
};

export const GENESYS_COLORS: GenesysColor[] = [
  "ability",
  "proficiency",
  "boost",
  "difficulty",
  "challenge",
  "setback",
  "force",
];

export const SYMBOL_INFO: Record<GenesysSymbol, { name: string; plural: string; glyph: string }> = {
  success: { name: "éxito", plural: "éxitos", glyph: "✦" },
  failure: { name: "fracaso", plural: "fracasos", glyph: "✕" },
  advantage: { name: "ventaja", plural: "ventajas", glyph: "▲" },
  threat: { name: "amenaza", plural: "amenazas", glyph: "▼" },
  triumph: { name: "triunfo", plural: "triunfos", glyph: "★" },
  despair: { name: "desesperación", plural: "desesperaciones", glyph: "✸" },
  light: { name: "luz", plural: "luz", glyph: "○" },
  dark: { name: "oscuridad", plural: "oscuridad", glyph: "●" },
};

export function sidesOf(die: DieKind): number {
  switch (die.type) {
    case "standard":
      return die.sides;
    case "fudge":
      return 3;
    case "percentile":
      return 100;
    case "genesys":
      return GENESYS_FACES[die.color].length;
  }
}

export function dieLabel(die: DieKind): string {
  switch (die.type) {
    case "standard":
      return `d${die.sides}`;
    case "fudge":
      return "dF";
    case "percentile":
      return "d%";
    case "genesys":
      return GENESYS_INFO[die.color].name;
  }
}

export function dieKey(die: DieKind): string {
  switch (die.type) {
    case "standard":
      return `d${die.sides}`;
    case "fudge":
      return "dF";
    case "percentile":
      return "d%";
    case "genesys":
      return `g:${die.color}`;
  }
}

export function sameDie(a: DieKind, b: DieKind) {
  return dieKey(a) === dieKey(b);
}

export const d = (sides: number): DieKind => ({ type: "standard", sides });
export const dF: DieKind = { type: "fudge" };
export const dPct: DieKind = { type: "percentile" };
export const g = (color: GenesysColor): DieKind => ({ type: "genesys", color });

export const STANDARD_DICE: DieKind[] = [d(4), d(6), d(8), d(10), d(12), d(20), d(100)];
export const ALL_DICE: DieKind[] = [
  ...STANDARD_DICE,
  dPct,
  dF,
  ...GENESYS_COLORS.map(g),
];

/** Texto a mostrar en la cara de un dado ya tirado. */
export function faceText(die: DieKind, value: number): string {
  if (die.type === "fudge") return value > 0 ? "+" : value < 0 ? "−" : " ";
  if (die.type === "genesys") {
    return GENESYS_FACES[die.color][value - 1].map((s) => SYMBOL_INFO[s].glyph).join("");
  }
  return String(value);
}
