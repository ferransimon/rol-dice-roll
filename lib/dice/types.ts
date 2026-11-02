export type GenesysColor =
  | "boost"
  | "setback"
  | "ability"
  | "difficulty"
  | "proficiency"
  | "challenge"
  | "force";

export type DieKind =
  | { type: "standard"; sides: number }
  | { type: "fudge" }
  | { type: "percentile" }
  | { type: "genesys"; color: GenesysColor };

export interface DiceGroup {
  die: DieKind;
  count: number;
  /** Vuelve a tirar (y suma) cada vez que sale el valor máximo. */
  explode?: boolean;
  /** Quedarse con los N dados más altos o más bajos del grupo. */
  keep?: { mode: "highest" | "lowest"; n: number };
}

export type Tone = "crit" | "success" | "partial" | "fail" | "fumble" | "neutral";

export interface Band {
  min: number;
  label: string;
  tone: Tone;
}

export type EvalMode =
  /** Suma de todo + modificador. `crit` marca 20 natural / 1 natural en un d20. */
  | { kind: "sum"; crit?: boolean }
  /** Total comparado con bandas (ordenadas de mayor a menor `min`). */
  | { kind: "threshold"; bands: Band[] }
  /** Sacar igual o menos que el objetivo. `gurps` aplica las reglas de crítico de GURPS. */
  | { kind: "rollUnder"; target: number; gurps?: boolean }
  /** Reserva: cuenta dados con valor >= target. */
  | { kind: "pool"; target: number; onesCancel?: boolean; glitch?: boolean }
  /** d100 contra habilidad (Cthulhu). bonus > 0 dados de bonificación, < 0 penalización. */
  | { kind: "percentile"; skill: number; bonus: number }
  /** Fate/Fudge: suma de dF + modificador, con la escalera de adjetivos. */
  | { kind: "fudge" }
  /** Genesys / Star Wars FFG: símbolos que se cancelan. */
  | { kind: "genesys" };

export type EvalKind = EvalMode["kind"];

export interface RollSpec {
  groups: DiceGroup[];
  modifier: number;
  mode: EvalMode;
}

export type GenesysSymbol =
  | "success"
  | "failure"
  | "advantage"
  | "threat"
  | "triumph"
  | "despair"
  | "light"
  | "dark";

export interface DieResult {
  die: DieKind;
  /** Valor numérico (para fudge: -1/0/1; para genesys: índice de cara). */
  value: number;
  group: number;
  dropped?: boolean;
  /** Este dado es una tirada extra por explosión. */
  exploded?: boolean;
  /** En reservas: cuenta como éxito. */
  hit?: boolean;
  /** En reservas: es un 1. */
  one?: boolean;
  symbols?: GenesysSymbol[];
  /** Para percentil: dados de decenas tirados (el usado es `value`). */
  tens?: number[];
  units?: number;
}

export type GenesysTally = Record<GenesysSymbol, number>;

export interface RollResult {
  dice: DieResult[];
  /** Resultado numérico principal (total, éxitos, d100...). null en Genesys. */
  total: number | null;
  headline: string;
  detail?: string;
  tone: Tone;
  notation: string;
  genesys?: GenesysTally;
}
