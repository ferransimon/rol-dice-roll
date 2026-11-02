"use client";

import { motion } from "motion/react";
import { useRef } from "react";
import { describeMode, formatNotation } from "@/lib/dice/notation";
import type { SavedRoll } from "@/lib/dice/presets";
import { DieIcon, trayText } from "./DieIcon";

/** Tarjeta de tirada guardada: toque = tirar, mantener = editar. */
export function SavedRollCard({ roll, onRoll, onEdit }: { roll: SavedRoll; onRoll: () => void; onEdit: () => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const long = useRef(false);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const first = roll.spec.groups[0]?.die;

  return (
    <motion.button
      layout
      type="button"
      whileTap={{ scale: 0.95 }}
      onPointerDown={() => {
        long.current = false;
        timer.current = setTimeout(() => {
          long.current = true;
          navigator.vibrate?.(15);
          onEdit();
        }, 500);
      }}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      onContextMenu={(e) => {
        e.preventDefault();
        clear();
        if (!long.current) onEdit();
        long.current = true;
      }}
      onClick={() => {
        if (long.current) return;
        onRoll();
      }}
      className="flex min-h-24 flex-col justify-between gap-2 rounded-3xl bg-surface p-3.5 text-left shadow-soft select-none"
    >
      <div className="flex w-full items-start justify-between gap-2">
        <span className="line-clamp-2 leading-tight font-extrabold">{roll.name}</span>
        {first && <DieIcon die={first} text={trayText(first)} size={26} className="shrink-0" />}
      </div>
      <div className="w-full">
        <p className="truncate font-mono text-xs font-bold text-tint-ink">{formatNotation(roll.spec)}</p>
        <p className="truncate text-[11px] text-muted">
          {describeMode(roll.spec.mode, roll.spec.modifier)}
          {roll.prompts?.length ? " · ajustable" : ""}
        </p>
      </div>
    </motion.button>
  );
}
