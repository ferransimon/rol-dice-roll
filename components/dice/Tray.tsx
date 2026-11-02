"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { dieKey } from "@/lib/dice/dice";
import { describeMode, formatNotation, parseNotation } from "@/lib/dice/notation";
import type { Game } from "@/lib/dice/presets";
import { getPromptValue, setPromptValue, targetLabel } from "@/lib/dice/prompts";
import type { DiceGroup, EvalMode, RollSpec } from "@/lib/dice/types";
import { useShake } from "@/lib/hooks/useShake";
import { useApp } from "@/lib/store/app";
import { addDie, DiePalette, GroupChips, GroupEditor } from "@/components/builder/groups";
import { ModeEditor } from "@/components/builder/ModeEditor";
import { Stepper } from "@/components/ui/controls";
import { Sheet } from "@/components/ui/Sheet";

/** Bandeja rápida fija abajo: tocar dados, ajustar y tirar. */
export function Tray({
  game,
  onRoll,
  onSave,
  onHeight,
}: {
  game: Game;
  onRoll: (spec: RollSpec) => void;
  onSave: (spec: RollSpec) => void;
  onHeight: (h: number) => void;
}) {
  const [groups, setGroups] = useState<DiceGroup[]>([]);
  const [modifier, setModifier] = useState(0);
  const [mode, setMode] = useState<EvalMode>(game.trayMode);
  const [modeOpen, setModeOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [notation, setNotation] = useState<string | null>(null);
  const shake = useApp((s) => s.settings.shake);
  const ref = useRef<HTMLDivElement>(null);

  // Al cambiar de juego, resetea la bandeja con su modo por defecto.
  const [gameId, setGameId] = useState(game.id);
  if (gameId !== game.id) {
    setGameId(game.id);
    setGroups([]);
    setModifier(0);
    setMode(game.trayMode);
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => onHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [onHeight]);

  const spec: RollSpec = { groups, modifier, mode };
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of groups) m.set(dieKey(g.die), (m.get(dieKey(g.die)) ?? 0) + g.count);
    return m;
  }, [groups]);
  const empty = groups.length === 0;
  const hasTarget = mode.kind === "pool" || mode.kind === "rollUnder" || mode.kind === "percentile";

  const doRoll = () => !empty && onRoll(spec);
  useShake(doRoll, shake && !empty);

  return (
    <div
      ref={ref}
      data-tint={game.tint}
      className="fixed inset-x-0 bottom-[calc(58px+env(safe-area-inset-bottom))] z-30 mx-auto max-w-xl px-3 pb-2"
    >
      <motion.div layout className="rounded-4xl border border-line bg-surface/95 p-3 shadow-soft backdrop-blur-xl">
        <AnimatePresence initial={false}>
          {!empty && (
            <motion.div
              key="sel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-start gap-2 pb-2">
                <div className="min-w-0 flex-1">
                  <GroupChips groups={groups} onChange={setGroups} onOpen={setEditing} />
                </div>
                <button type="button" onClick={() => setGroups([])} className="rounded-full px-2 py-2 text-xs font-bold text-muted">
                  Limpiar
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pb-2">
                {mode.kind !== "genesys" && <Stepper size="sm" value={modifier} min={-99} max={99} signed onChange={setModifier} />}
                {hasTarget && (
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-muted">{targetLabel(spec)}</span>
                    <Stepper
                      size="sm"
                      value={getPromptValue(spec, "target")}
                      min={1}
                      max={mode.kind === "percentile" ? 100 : 40}
                      onChange={(v) => setMode(setPromptValue(spec, "target", v).mode)}
                    />
                  </div>
                )}
                <div className="flex min-w-36 flex-1 items-center gap-1.5">
                  <input
                    aria-label="Notación"
                    className="min-w-0 flex-1 rounded-xl bg-surface-2 px-3 py-2 font-mono text-xs font-bold outline-none"
                    value={notation ?? formatNotation(spec)}
                    onChange={(e) => setNotation(e.target.value)}
                    onFocus={() => setNotation(formatNotation(spec))}
                    onBlur={() => {
                      const p = notation !== null ? parseNotation(notation) : null;
                      if (p) {
                        setGroups(p.groups);
                        setModifier(p.modifier);
                      }
                      setNotation(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  />
                  <button type="button" aria-label="Guardar tirada" onClick={() => onSave(spec)} className="rounded-xl bg-surface-2 px-2.5 py-2 text-xs font-bold">
                    ★ Guardar
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <DiePalette dice={game.quickDice} onAdd={(d) => setGroups((g) => addDie(g, d))} counts={counts} />
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-1">
            <button
              type="button"
              onClick={() => setModeOpen(true)}
              className="max-w-24 truncate rounded-full bg-surface-2 px-2.5 py-1 text-[10px] font-bold text-muted"
            >
              {describeMode(mode, modifier)}
            </button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.9, rotate: -4 }}
              disabled={empty}
              onClick={doRoll}
              className="rounded-3xl bg-tint px-5 py-3.5 text-base font-black text-tint-ink shadow-soft transition-opacity disabled:opacity-40"
            >
              Tirar
            </motion.button>
          </div>
        </div>
      </motion.div>

      <Sheet open={modeOpen} onClose={() => setModeOpen(false)} title="Cómo se lee la tirada">
        <div data-tint={game.tint} className="pb-4">
          <ModeEditor mode={mode} onChange={setMode} />
        </div>
      </Sheet>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title="Ajustar dados">
        <div data-tint={game.tint} className="pb-4">
          {editing !== null && groups[editing] && (
            <GroupEditor
              group={groups[editing]}
              onChange={(g) => setGroups((gs) => gs.map((x, i) => (i === editing ? g : x)))}
              onRemove={() => {
                setGroups((gs) => gs.filter((_, i) => i !== editing));
                setEditing(null);
              }}
            />
          )}
        </div>
      </Sheet>
    </div>
  );
}
