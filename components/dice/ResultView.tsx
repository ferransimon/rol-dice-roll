"use client";

import { AnimatePresence, motion } from "motion/react";
import { faceText, SYMBOL_INFO } from "@/lib/dice/dice";
import type { DieResult, GenesysSymbol, GenesysTally, RollResult } from "@/lib/dice/types";
import { DieIcon } from "./DieIcon";

export function DiceRow({ dice, animate = true, size = 38 }: { dice: DieResult[]; animate?: boolean; size?: number }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {dice.map((r, i) => (
        <motion.div
          key={i}
          className="relative"
          initial={animate ? { scale: 0.2, rotate: -180 + ((i * 67) % 120), y: -24, opacity: 0 } : false}
          animate={{ scale: 1, rotate: 0, y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 18, delay: animate ? Math.min(i * 0.035, 0.6) : 0 }}
          title={r.tens ? `Decenas ${r.tens.map((t) => t * 10).join(", ")} · unidades ${r.units}` : undefined}
        >
          <DieIcon die={r.die} text={faceText(r.die, r.value)} size={size} dim={r.dropped || (r.hit === false && !r.one)} />
          {r.hit && <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface" style={{ background: "var(--menta)" }} />}
          {r.one && <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface" style={{ background: "var(--rosa)" }} />}
          {r.exploded && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-surface px-1 text-[9px] leading-tight font-black text-muted shadow-soft">
              ✶
            </span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

const ORDER: GenesysSymbol[] = ["success", "advantage", "triumph", "failure", "threat", "despair", "light", "dark"];

export function GenesysTallyView({ tally }: { tally: GenesysTally }) {
  const items = ORDER.filter((s) => tally[s] > 0);
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <span key={s} className="rounded-full bg-surface/70 px-2.5 py-1 text-xs font-bold">
          {SYMBOL_INFO[s].glyph} {tally[s]} {tally[s] === 1 ? SYMBOL_INFO[s].name : SYMBOL_INFO[s].plural}
        </span>
      ))}
    </div>
  );
}

/** Tarjeta grande con la última tirada. */
export function ResultCard({
  result,
  title,
  subtitle,
  nonce,
  playerTint,
}: {
  result: RollResult;
  title?: string;
  subtitle?: string;
  nonce: number | string;
  playerTint?: string;
}) {
  const big = result.total !== null;
  return (
    <motion.div
      key={nonce}
      data-tone={result.tone}
      initial={{ scale: 0.94, y: 8 }}
      animate={{ scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 22 }}
      className="relative overflow-hidden rounded-4xl bg-tint-bg p-5 text-tint-ink shadow-soft"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {title && (
            <p className="flex items-center gap-1.5 truncate text-xs font-bold opacity-80">
              {playerTint && <span data-tint={playerTint} className="h-2.5 w-2.5 shrink-0 rounded-full bg-tint" />}
              {title}
            </p>
          )}
          {subtitle && <p className="truncate text-xs font-semibold opacity-60">{subtitle}</p>}
        </div>
        <span className="shrink-0 rounded-full bg-surface/60 px-2.5 py-1 font-mono text-[11px] font-bold">{result.notation}</span>
      </div>

      <div className="mt-2 flex items-end gap-4">
        {big && (
          <motion.span
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 15, delay: 0.12 }}
            className="text-7xl leading-none font-black tabular-nums"
          >
            {result.total}
          </motion.span>
        )}
        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="min-w-0 pb-1">
          <p className={`${big ? "text-xl" : "text-3xl"} leading-tight font-extrabold`}>{result.headline}</p>
          {result.detail && <p className="mt-0.5 text-xs font-semibold opacity-70">{result.detail}</p>}
        </motion.div>
      </div>

      {result.genesys && (
        <div className="mt-3">
          <GenesysTallyView tally={result.genesys} />
        </div>
      )}

      <div className="mt-4">
        <DiceRow dice={result.dice} />
      </div>

      <AnimatePresence>
        {result.tone === "crit" && <Sparkles key="sp" />}
      </AnimatePresence>
    </motion.div>
  );
}

function Sparkles() {
  return (
    <>
      {Array.from({ length: 10 }, (_, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute text-lg"
          style={{ left: `${10 + ((i * 37) % 80)}%`, top: "50%" }}
          initial={{ opacity: 0, y: 0, scale: 0.4 }}
          animate={{ opacity: [0, 1, 0], y: -60 - ((i * 23) % 50), scale: 1, rotate: (i % 2 ? 1 : -1) * 90 }}
          transition={{ duration: 1.1, delay: 0.15 + i * 0.04, ease: "easeOut" }}
        >
          ✦
        </motion.span>
      ))}
    </>
  );
}
