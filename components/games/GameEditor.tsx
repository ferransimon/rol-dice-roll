"use client";

import { motion, Reorder, useDragControls } from "motion/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ALL_DICE, dieKey, dieLabel, sameDie } from "@/lib/dice/dice";
import { describeMode, formatNotation } from "@/lib/dice/notation";
import { TINTS, type Game, type SavedRoll } from "@/lib/dice/presets";
import { newId, useApp } from "@/lib/store/app";
import { useHydrated } from "@/lib/store/ui";
import { ModeEditor } from "@/components/builder/ModeEditor";
import { RollBuilder } from "@/components/builder/RollBuilder";
import { DieIcon, trayText } from "@/components/dice/DieIcon";
import { Field, inputClass } from "@/components/ui/controls";

function RollRow({ roll, onEdit }: { roll: SavedRoll; onEdit: () => void }) {
  const controls = useDragControls();
  return (
    <Reorder.Item value={roll} dragListener={false} dragControls={controls} className="list-none">
      <div className="flex items-center gap-2 rounded-2xl bg-surface p-3 shadow-soft">
        <button type="button" aria-label="Reordenar" onPointerDown={(e) => controls.start(e)} className="cursor-grab touch-none px-1 text-muted">
          ⋮⋮
        </button>
        <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
          <p className="truncate font-extrabold">{roll.name}</p>
          <p className="truncate text-xs text-muted">
            <span className="font-mono">{formatNotation(roll.spec)}</span> · {describeMode(roll.spec.mode, roll.spec.modifier)}
          </p>
        </button>
        <span className="text-muted">›</span>
      </div>
    </Reorder.Item>
  );
}

export function GameEditor() {
  const id = useSearchParams().get("id");
  const hydrated = useHydrated();
  const game = useApp((s) => s.games.find((g) => g.id === id));
  if (!hydrated) return null;
  if (!game)
    return (
      <div className="p-6 text-center">
        <p className="text-muted">No se ha encontrado este juego.</p>
        <Link href="/juegos" className="mt-3 inline-block font-bold">
          ← Volver a juegos
        </Link>
      </div>
    );
  return <Editor game={game} />;
}

function Editor({ game }: { game: Game }) {
  const update = useApp((s) => s.updateGame);
  const upsertRoll = useApp((s) => s.upsertRoll);
  const removeRoll = useApp((s) => s.removeRoll);
  const [editing, setEditing] = useState<{ roll: SavedRoll; isNew: boolean } | null>(null);
  const patch = (p: Partial<Game>) => update(game.id, p);

  const toggleDie = (d: (typeof ALL_DICE)[number]) => {
    const has = game.quickDice.some((q) => sameDie(q, d));
    const quickDice = has ? game.quickDice.filter((q) => !sameDie(q, d)) : ALL_DICE.filter((x) => game.quickDice.some((q) => sameDie(q, x)) || sameDie(x, d));
    patch({ quickDice });
  };

  return (
    <div data-tint={game.tint} className="space-y-6 px-4 pt-4 pb-28">
      <div className="flex items-center gap-3">
        <Link href="/juegos" className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 font-bold" aria-label="Volver">
          ←
        </Link>
        <h1 className="truncate text-2xl font-black tracking-tight">{game.name || "Sin nombre"}</h1>
      </div>

      <section className="space-y-4 rounded-4xl bg-surface p-4 shadow-soft">
        <Field label="Nombre">
          <input className={inputClass} value={game.name} onChange={(e) => patch({ name: e.target.value })} />
        </Field>
        <Field label="Descripción">
          <input className={inputClass} value={game.description ?? ""} onChange={(e) => patch({ description: e.target.value })} placeholder="Opcional" />
        </Field>
        <div>
          <span className="mb-1.5 block text-xs font-bold tracking-wide text-muted uppercase">Color</span>
          <div className="flex gap-2">
            {TINTS.map((t) => (
              <motion.button
                key={t}
                type="button"
                aria-label={t}
                whileTap={{ scale: 0.85 }}
                data-tint={t}
                onClick={() => patch({ tint: t })}
                className={`h-9 w-9 rounded-full bg-tint ring-offset-2 ring-offset-[var(--surface)] ${game.tint === t ? "ring-2 ring-[var(--ink)]" : ""}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-4xl bg-surface p-4 shadow-soft">
        <div>
          <h2 className="font-extrabold">Dados de la bandeja</h2>
          <p className="text-xs text-muted">Los que aparecen abajo en la mesa para tirar al momento.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ALL_DICE.map((d) => {
            const on = game.quickDice.some((q) => sameDie(q, d));
            return (
              <motion.button
                key={dieKey(d)}
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={() => toggleDie(d)}
                className={`flex flex-col items-center rounded-2xl p-1.5 transition ${on ? "bg-tint-bg" : "opacity-40 grayscale"}`}
              >
                <DieIcon die={d} text={trayText(d)} size={36} />
                <span className="text-[10px] font-bold">{dieLabel(d)}</span>
              </motion.button>
            );
          })}
        </div>
        <div className="border-t border-line pt-3">
          <h3 className="mb-2 text-sm font-extrabold">Cómo se leen las tiradas de la bandeja</h3>
          <ModeEditor mode={game.trayMode} onChange={(trayMode) => patch({ trayMode })} />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold">Tiradas guardadas</h2>
          <button
            type="button"
            className="rounded-full bg-tint px-3 py-1.5 text-sm font-bold text-tint-ink"
            onClick={() => setEditing({ isNew: true, roll: { id: newId(), name: "", spec: { groups: [], modifier: 0, mode: game.trayMode } } })}
          >
            + Añadir
          </button>
        </div>
        {game.rolls.length ? (
          <Reorder.Group axis="y" values={game.rolls} onReorder={(rolls) => patch({ rolls })} className="space-y-2">
            {game.rolls.map((r) => (
              <RollRow key={r.id} roll={r} onEdit={() => setEditing({ roll: r, isNew: false })} />
            ))}
          </Reorder.Group>
        ) : (
          <p className="rounded-3xl bg-surface-2 p-4 text-sm text-muted">Sin tiradas todavía.</p>
        )}
      </section>

      <RollBuilder
        open={!!editing}
        title={editing?.isNew ? "Nueva tirada" : "Editar tirada"}
        initial={editing?.roll ?? { id: "", name: "", spec: { groups: [], modifier: 0, mode: { kind: "sum" } } }}
        onClose={() => setEditing(null)}
        onSave={(r) => {
          upsertRoll(game.id, r);
          setEditing(null);
        }}
        onDelete={
          editing && !editing.isNew
            ? () => {
                removeRoll(game.id, editing.roll.id);
                setEditing(null);
              }
            : undefined
        }
      />
    </div>
  );
}
