"use client";

import { AnimatePresence, motion } from "motion/react";
import { useDeferredValue, useMemo, useState } from "react";
import { ALL_DICE } from "@/lib/dice/dice";
import { formatNotation, parseNotation } from "@/lib/dice/notation";
import { PROMPT_LABELS, type PromptKey, type SavedRoll } from "@/lib/dice/presets";
import { availablePrompts } from "@/lib/dice/prompts";
import { roll } from "@/lib/dice/roll";
import { estimate } from "@/lib/dice/stats";
import type { RollResult, RollSpec, Tone } from "@/lib/dice/types";
import { DiceRow } from "@/components/dice/ResultView";
import { Button, Field, Stepper, inputClass } from "@/components/ui/controls";
import { Sheet } from "@/components/ui/Sheet";
import { addDie, DiePalette, GroupEditor } from "./groups";
import { ModeEditor, Row } from "./ModeEditor";

const TONE_LABEL: Record<Tone, string> = {
  crit: "Crítico",
  success: "Éxito",
  partial: "Parcial",
  fail: "Fallo",
  fumble: "Pifia",
  neutral: "—",
};

function StatsPreview({ spec }: { spec: RollSpec }) {
  const deferred = useDeferredValue(spec);
  const stats = useMemo(() => estimate(deferred, 2500), [deferred]);
  if (!spec.groups.length) return null;
  const tones = (Object.entries(stats.tones) as [Tone, number][]).filter(([t]) => t !== "neutral").sort((a, b) => b[1] - a[1]);
  return (
    <div className="rounded-3xl bg-surface-2 p-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {stats.range && (
          <span>
            <b>Rango</b> <span className="text-muted">{stats.range.min}–{stats.range.max}</span>
          </span>
        )}
        {stats.mean !== null && (
          <span>
            <b>Media</b> <span className="text-muted">≈ {stats.mean.toFixed(1)}</span>
          </span>
        )}
        {stats.successRate !== null && (
          <span>
            <b>Éxito</b> <span className="text-muted">≈ {Math.round(stats.successRate * 100)}%</span>
          </span>
        )}
      </div>
      {tones.length > 0 && (
        <div className="mt-2 flex h-2.5 overflow-hidden rounded-full">
          {tones.map(([t, p]) => (
            <motion.div key={t} data-tone={t} layout className="h-full bg-tint" style={{ width: `${p * 100}%` }} title={`${TONE_LABEL[t]} ${Math.round(p * 100)}%`} />
          ))}
        </div>
      )}
      {tones.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] font-semibold text-muted">
          {tones.map(([t, p]) => (
            <span key={t} data-tone={t} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-tint" />
              {TONE_LABEL[t]} {Math.round(p * 100)}%
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function RollBuilder({
  open,
  initial,
  onClose,
  onSave,
  onDelete,
  title = "Tirada",
}: {
  open: boolean;
  initial: SavedRoll;
  onClose: () => void;
  onSave: (r: SavedRoll) => void;
  onDelete?: () => void;
  title?: string;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {open && <BuilderBody key={initial.id} initial={initial} onSave={onSave} onDelete={onDelete} />}
    </Sheet>
  );
}

function BuilderBody({ initial, onSave, onDelete }: { initial: SavedRoll; onSave: (r: SavedRoll) => void; onDelete?: () => void }) {
  const [name, setName] = useState(initial.name);
  const [spec, setSpec] = useState<RollSpec>(initial.spec);
  const [prompts, setPrompts] = useState<PromptKey[]>(initial.prompts ?? []);
  const [notation, setNotation] = useState<string | null>(null);
  const [test, setTest] = useState<{ r: RollResult; n: number } | null>(null);

  const update = (patch: Partial<RollSpec>) => setSpec((s) => ({ ...s, ...patch }));
  const available = availablePrompts(spec);

  return (
    <div className="space-y-5 pb-2">
      <Field label="Nombre">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="p.ej. Ataque con espada" />
      </Field>

      <Field label="Notación" hint="Escribe p.ej. 2d6+1, 4dF, 1d20kh1, 3d6! o toca los dados">
        <input
          className={`${inputClass} font-mono`}
          value={notation ?? formatNotation(spec)}
          onChange={(e) => setNotation(e.target.value)}
          onBlur={() => {
            const p = notation !== null ? parseNotation(notation) : null;
            if (p) update(p);
            setNotation(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
      </Field>

      <div>
        <span className="mb-1.5 block text-xs font-bold tracking-wide text-muted uppercase">Dados</span>
        <DiePalette dice={ALL_DICE} onAdd={(d) => update({ groups: addDie(spec.groups, d) })} />
        <div className="mt-2 space-y-2">
          <AnimatePresence initial={false}>
            {spec.groups.map((g, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
                <GroupEditor
                  group={g}
                  onChange={(ng) => update({ groups: spec.groups.map((x, j) => (j === i ? ng : x)) })}
                  onRemove={() => update({ groups: spec.groups.filter((_, j) => j !== i) })}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {spec.mode.kind !== "genesys" && (
          <Row label="Modificador">
            <Stepper value={spec.modifier} min={-99} max={99} signed onChange={(modifier) => update({ modifier })} />
          </Row>
        )}
      </div>

      <div>
        <span className="mb-1.5 block text-xs font-bold tracking-wide text-muted uppercase">Cómo se lee</span>
        <ModeEditor mode={spec.mode} onChange={(mode) => update({ mode })} />
      </div>

      {available.length > 0 && (
        <div>
          <span className="mb-1.5 block text-xs font-bold tracking-wide text-muted uppercase">Preguntar al tirar</span>
          <div className="flex flex-wrap gap-1.5">
            {available.map((k) => {
              const on = prompts.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setPrompts(on ? prompts.filter((p) => p !== k) : [...prompts, k])}
                  className={`rounded-full px-3 py-1.5 text-sm font-bold ${on ? "bg-tint text-tint-ink" : "bg-surface-2 text-muted"}`}
                >
                  {on ? "✓ " : ""}
                  {PROMPT_LABELS[k]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <StatsPreview spec={spec} />

      <AnimatePresence>
        {test && (
          <motion.div key={test.n} data-tone={test.r.tone} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-3xl bg-tint-bg p-3 text-tint-ink">
            <p className="font-extrabold">
              {test.r.total !== null && <span className="mr-2 text-2xl">{test.r.total}</span>}
              {test.r.headline}
            </p>
            <div className="mt-2">
              <DiceRow dice={test.r.dice} size={28} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2">
        {onDelete && (
          <Button variant="danger" onClick={onDelete}>
            Borrar
          </Button>
        )}
        <Button disabled={!spec.groups.length} onClick={() => setTest({ r: roll(spec), n: (test?.n ?? 0) + 1 })}>
          Probar
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          disabled={!spec.groups.length}
          onClick={() => onSave({ ...initial, name: name.trim() || formatNotation(spec), spec, prompts: prompts.filter((p) => available.includes(p)) })}
        >
          Guardar
        </Button>
      </div>
    </div>
  );
}
