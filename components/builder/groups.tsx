"use client";

import { AnimatePresence, motion } from "motion/react";
import { dieKey, dieLabel, sameDie } from "@/lib/dice/dice";
import type { DiceGroup, DieKind } from "@/lib/dice/types";
import { DieIcon, trayText } from "@/components/dice/DieIcon";
import { Stepper, Toggle } from "@/components/ui/controls";

export function addDie(groups: DiceGroup[], die: DieKind, n = 1): DiceGroup[] {
  const i = groups.findIndex((g) => sameDie(g.die, die) && !g.keep && !g.explode);
  if (i >= 0) return groups.map((g, j) => (j === i ? { ...g, count: Math.min(100, g.count + n) } : g));
  return [...groups, { die, count: n }];
}

export function removeDie(groups: DiceGroup[], index: number): DiceGroup[] {
  const g = groups[index];
  if (!g) return groups;
  if (g.count <= 1) return groups.filter((_, j) => j !== index);
  return groups.map((x, j) => (j === index ? { ...x, count: x.count - 1 } : x));
}

/** Fila de dados para añadir con un toque. */
export function DiePalette({ dice, onAdd, counts }: { dice: DieKind[]; onAdd: (d: DieKind) => void; counts?: Map<string, number> }) {
  return (
    <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 py-1">
      {dice.map((d) => {
        const n = counts?.get(dieKey(d)) ?? 0;
        return (
          <motion.button
            key={dieKey(d)}
            type="button"
            whileTap={{ scale: 0.82, rotate: -12 }}
            onClick={() => onAdd(d)}
            className="relative flex shrink-0 flex-col items-center gap-0.5 rounded-2xl px-1.5 py-1"
            aria-label={`Añadir ${dieLabel(d)}`}
          >
            <DieIcon die={d} text={trayText(d)} size={44} />
            <span className="max-w-14 truncate text-[10px] font-bold text-muted">{dieLabel(d)}</span>
            <AnimatePresence>
              {n > 0 && (
                <motion.span
                  key={n}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute top-0 right-0 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[10px] font-black text-surface"
                >
                  {n}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}

/** Chips compactos: tocar suma uno, arrastrar hacia abajo o × quita. */
export function GroupChips({
  groups,
  onChange,
  onOpen,
}: {
  groups: DiceGroup[];
  onChange: (g: DiceGroup[]) => void;
  onOpen?: (index: number) => void;
}) {
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5">
      <AnimatePresence initial={false} mode="popLayout">
        {groups.map((g, i) => (
          <motion.div
            key={`${dieKey(g.die)}-${i}`}
            layout
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0, y: 20 }}
            drag="y"
            dragSnapToOrigin
            dragElastic={0.5}
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.y) > 36) onChange(groups.filter((_, j) => j !== i));
            }}
            className="flex touch-none items-center gap-1 rounded-full bg-surface py-1 pr-1 pl-1.5 shadow-soft"
          >
            <button type="button" className="flex items-center gap-1" onClick={() => onOpen?.(i)}>
              <DieIcon die={g.die} text={trayText(g.die)} size={26} />
              <span className="text-sm font-black tabular-nums">
                {g.count}
                <span className="text-xs font-bold text-muted">×</span>
              </span>
              {g.explode && <span className="text-[10px] font-black text-muted">✶</span>}
              {g.keep && (
                <span className="text-[10px] font-black text-muted">
                  {g.keep.mode === "highest" ? "↑" : "↓"}
                  {g.keep.n}
                </span>
              )}
            </button>
            <button
              type="button"
              aria-label="Quitar uno"
              className="grid h-6 w-6 place-items-center rounded-full bg-surface-2 text-sm font-black text-muted"
              onClick={() => onChange(removeDie(groups, i))}
            >
              −
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Editor detallado de un grupo (cantidad, explotar, quedarse con). */
export function GroupEditor({ group, onChange, onRemove }: { group: DiceGroup; onChange: (g: DiceGroup) => void; onRemove: () => void }) {
  const canExplode = group.die.type === "standard" && !group.keep;
  const canKeep = group.die.type !== "genesys" && !group.explode;
  return (
    <motion.div layout className="rounded-3xl bg-surface-2 p-3">
      <div className="flex items-center gap-3">
        <DieIcon die={group.die} text={trayText(group.die)} size={40} />
        <span className="flex-1 font-extrabold">{dieLabel(group.die)}</span>
        <Stepper value={group.count} min={1} max={100} onChange={(count) => onChange({ ...group, count, keep: group.keep ? { ...group.keep, n: Math.min(group.keep.n, count) } : undefined })} />
        <button type="button" aria-label="Quitar" className="px-1 text-xl text-muted" onClick={onRemove}>
          ×
        </button>
      </div>
      {(canExplode || canKeep) && (
        <div className="mt-2 border-t border-line pt-1">
          {canExplode && <Toggle checked={!!group.explode} onChange={(explode) => onChange({ ...group, explode })} label="Explota con el máximo" />}
          {canKeep && (
            <Toggle
              checked={!!group.keep}
              onChange={(on) => onChange({ ...group, keep: on ? { mode: "highest", n: Math.max(1, group.count - 1) } : undefined })}
              label="Quedarse solo con algunos"
            />
          )}
          {group.keep && (
            <div className="flex items-center justify-between gap-2 pb-1">
              <div className="flex rounded-xl bg-surface p-0.5 text-xs font-bold">
                {(["highest", "lowest"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onChange({ ...group, keep: { ...group.keep!, mode: m } })}
                    className={`rounded-lg px-2.5 py-1.5 ${group.keep!.mode === m ? "bg-tint text-tint-ink" : "text-muted"}`}
                  >
                    {m === "highest" ? "Más altos" : "Más bajos"}
                  </button>
                ))}
              </div>
              <Stepper size="sm" value={group.keep.n} min={1} max={group.count} onChange={(n) => onChange({ ...group, keep: { ...group.keep!, n } })} />
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
