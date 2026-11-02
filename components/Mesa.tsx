"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import { formatNotation } from "@/lib/dice/notation";
import type { SavedRoll } from "@/lib/dice/presets";
import type { RollSpec } from "@/lib/dice/types";
import { useRoller } from "@/lib/hooks/useRoller";
import { newId, useActiveGame, useApp, type HistoryEntry } from "@/lib/store/app";
import { useHydrated, useUi } from "@/lib/store/ui";
import { RollBuilder } from "@/components/builder/RollBuilder";
import { PromptSheet } from "@/components/dice/PromptSheet";
import { ResultCard } from "@/components/dice/ResultView";
import { SavedRollCard } from "@/components/dice/SavedRollCard";
import { Tray } from "@/components/dice/Tray";
import { GamePicker } from "@/components/GamePicker";
import { HistoryFeed } from "@/components/history/HistoryFeed";
import { PlayerSwitcher } from "@/components/players/PlayerSwitcher";

export function Mesa() {
  const hydrated = useHydrated();
  if (!hydrated) return <MesaSkeleton />;
  return <MesaInner />;
}

function MesaSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="h-8 w-2/3 animate-pulse rounded-2xl bg-surface-2" />
      <div className="h-10 w-full animate-pulse rounded-full bg-surface-2" />
      <div className="h-40 w-full animate-pulse rounded-4xl bg-surface-2" />
    </div>
  );
}

function MesaInner() {
  const game = useActiveGame();
  const history = useApp((s) => s.history);
  const upsertRoll = useApp((s) => s.upsertRoll);
  const removeRoll = useApp((s) => s.removeRoll);
  const lastId = useUi((s) => s.lastEntryId);
  const nonce = useUi((s) => s.rollNonce);
  const rollNow = useRoller();

  const [prompting, setPrompting] = useState<SavedRoll | null>(null);
  const [editing, setEditing] = useState<{ roll: SavedRoll; isNew: boolean } | null>(null);
  const [trayH, setTrayH] = useState(160);
  const onHeight = useCallback((h: number) => setTrayH(h), []);

  const last = history.find((h) => h.id === lastId) ?? history.find((h) => !h.remote);

  const rollSaved = (r: SavedRoll) => {
    if (r.prompts?.length) setPrompting(r);
    else rollNow(r.spec, r.name);
  };

  const repeat = (e: HistoryEntry) => rollNow(e.spec, e.rollName);

  return (
    <div data-tint={game.tint} className="space-y-5 px-4 pt-4" style={{ paddingBottom: trayH + 80 }}>
      <GamePicker />
      <PlayerSwitcher />

      <AnimatePresence mode="popLayout">
        {last ? (
          <ResultCard
            key={last.id + nonce}
            nonce={last.id + nonce}
            result={last.result}
            title={last.playerName}
            playerTint={last.playerTint}
            subtitle={last.rollName ?? last.gameName}
          />
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid min-h-40 place-items-center rounded-4xl border-2 border-dashed border-line p-6 text-center text-sm font-semibold text-muted"
          >
            Toca una tirada guardada o elige dados abajo y pulsa «Tirar».
          </motion.div>
        )}
      </AnimatePresence>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-extrabold tracking-wide text-muted uppercase">Tiradas</h2>
          <button
            type="button"
            className="text-xs font-bold text-tint-ink"
            onClick={() =>
              setEditing({
                isNew: true,
                roll: { id: newId(), name: "", spec: { groups: [], modifier: 0, mode: game.trayMode } },
              })
            }
          >
            + Nueva
          </button>
        </div>
        {game.rolls.length ? (
          <motion.div layout className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {game.rolls.map((r) => (
              <SavedRollCard key={r.id} roll={r} onRoll={() => rollSaved(r)} onEdit={() => setEditing({ roll: r, isNew: false })} />
            ))}
          </motion.div>
        ) : (
          <p className="rounded-3xl bg-surface-2 p-4 text-sm text-muted">Este juego aún no tiene tiradas guardadas. Monta una en la bandeja y pulsa «Guardar».</p>
        )}
        {game.rolls.length > 0 && <p className="mt-2 text-center text-[11px] text-muted">Mantén pulsada una tirada para editarla</p>}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-extrabold tracking-wide text-muted uppercase">Historial</h2>
        <HistoryFeed entries={history.slice(0, 40)} onRepeat={repeat} />
      </section>

      <Tray
        game={game}
        onHeight={onHeight}
        onRoll={(spec: RollSpec) => rollNow(spec)}
        onSave={(spec) => setEditing({ isNew: true, roll: { id: newId(), name: formatNotation(spec), spec } })}
      />

      <PromptSheet
        roll={prompting}
        onClose={() => setPrompting(null)}
        onRoll={(spec) => {
          if (!prompting) return;
          // Recuerda los últimos valores usados como nuevos valores por defecto.
          upsertRoll(game.id, { ...prompting, spec });
          rollNow(spec, prompting.name);
          setPrompting(null);
        }}
      />

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
