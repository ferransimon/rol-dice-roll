import type { DieKind, GenesysColor } from "@/lib/dice/types";

type Shape = "tri" | "square" | "diamond" | "kite" | "pent" | "hex" | "circle";

function shapeOf(die: DieKind): Shape {
  switch (die.type) {
    case "fudge":
      return "square";
    case "percentile":
      return "kite";
    case "genesys":
      return die.color === "boost" || die.color === "setback"
        ? "square"
        : die.color === "ability" || die.color === "difficulty"
          ? "diamond"
          : "hex";
    case "standard":
      switch (die.sides) {
        case 4:
          return "tri";
        case 6:
          return "square";
        case 8:
          return "diamond";
        case 10:
        case 100:
          return "kite";
        case 12:
          return "pent";
        case 20:
          return "hex";
        default:
          return "circle";
      }
  }
}

const GENESYS_STYLE: Record<GenesysColor, { fill: string; stroke: string; ink: string }> = {
  ability: { fill: "var(--menta)", stroke: "var(--menta-ink)", ink: "var(--menta-ink)" },
  proficiency: { fill: "var(--limon)", stroke: "var(--limon-ink)", ink: "var(--limon-ink)" },
  boost: { fill: "var(--cielo)", stroke: "var(--cielo-ink)", ink: "var(--cielo-ink)" },
  difficulty: { fill: "var(--lavanda)", stroke: "var(--lavanda-ink)", ink: "var(--lavanda-ink)" },
  challenge: { fill: "var(--rosa)", stroke: "var(--rosa-ink)", ink: "var(--rosa-ink)" },
  setback: { fill: "#4a4656", stroke: "#2c2935", ink: "#f2eff7" },
  force: { fill: "#fdfcff", stroke: "#a9a3b8", ink: "#4a4656" },
};

export function dieColors(die: DieKind) {
  if (die.type === "genesys") return GENESYS_STYLE[die.color];
  return { fill: "var(--tint-bg)", stroke: "var(--tint)", ink: "var(--tint-ink)" };
}

function ShapePath({ shape, fill, stroke }: { shape: Shape; fill: string; stroke: string }) {
  const common = { fill, stroke, strokeWidth: 2.2, strokeLinejoin: "round" as const };
  switch (shape) {
    case "tri":
      return <path d="M20 4 L36.5 33.5 Q37 35 35 35 L5 35 Q3 35 3.5 33.5 Z" {...common} />;
    case "square":
      return <rect x="5" y="5" width="30" height="30" rx="8" {...common} />;
    case "diamond":
      return <path d="M20 2.5 L37.5 20 L20 37.5 L2.5 20 Z" {...common} />;
    case "kite":
      return <path d="M20 2.5 L36.5 17 L20 37.5 L3.5 17 Z" {...common} />;
    case "pent":
      return <path d="M20 3 L37 15.5 L30.5 36 L9.5 36 L3 15.5 Z" {...common} />;
    case "hex":
      return (
        <>
          <path d="M20 2.5 L35.5 11.25 L35.5 28.75 L20 37.5 L4.5 28.75 L4.5 11.25 Z" {...common} />
          <path d="M20 9 L30 26.5 L10 26.5 Z" fill="none" stroke={stroke} strokeWidth={1.2} opacity={0.5} strokeLinejoin="round" />
        </>
      );
    case "circle":
      return <circle cx="20" cy="20" r="16.5" {...common} />;
  }
}

export function DieIcon({
  die,
  text,
  size = 40,
  className,
  dim,
}: {
  die: DieKind;
  text?: string;
  size?: number;
  className?: string;
  dim?: boolean;
}) {
  const shape = shapeOf(die);
  const c = dieColors(die);
  const t = text ?? "";
  const fontSize = t.length >= 3 ? 10.5 : t.length === 2 ? 13 : 15;
  const y = shape === "tri" ? 27 : shape === "kite" ? 21 : 20.5;
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className={className}
      style={{ opacity: dim ? 0.35 : 1 }}
      aria-hidden
    >
      <ShapePath shape={shape} fill={c.fill} stroke={c.stroke} />
      {t && (
        <text
          x="20"
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize}
          fontWeight={800}
          fill={c.ink}
          style={{ fontFamily: "var(--font-sans)" }}
        >
          {t}
        </text>
      )}
    </svg>
  );
}

/** Etiqueta corta para la cara del dado en la bandeja. */
export function trayText(die: DieKind): string {
  switch (die.type) {
    case "standard":
      return String(die.sides);
    case "fudge":
      return "±";
    case "percentile":
      return "%";
    case "genesys":
      return "";
  }
}
