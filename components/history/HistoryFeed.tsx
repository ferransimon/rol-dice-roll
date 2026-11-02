"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { HistoryEntry } from "@/lib/store/app";
import { DiceRow, GenesysTallyView } from "@/components/dice/ResultView";
import { PlayerAvatar } from "@/components/players/PlayerSwitcher";

function timeAgo(ts: number) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 45) return "ahora";
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(ts).toLocaleDateString("es", { day: "numeric", month: "short" });
}

export function HistoryItem({ entry, onRepeat }: { entry: HistoryEntry; onRepeat?: (e: HistoryEntry) => void }) {
  const [open, setOpen] = useState(false);
  const r = entry.result;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="overflow-hidden rounded-3xl bg-surface shadow-soft"
    >
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 p-3 text-left">
        <PlayerAvatar name={entry.playerName} tint={entry.playerTint} size={34} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">
            {entry.playerName}
            <span className="font-semibold text-muted"> · {entry.rollName ?? r.notation}</span>
          </p>
          <p className="truncate text-xs text-muted">
            {entry.remote ? "📡 " : ""}
            {entry.gameName} · {timeAgo(entry.ts)}
          </p>
        </div>
        <div data-tone={r.tone} className="flex shrink-0 items-center gap-2 rounded-2xl bg-tint-bg py-1.5 pr-3 pl-2.5 text-tint-ink">
          {r.total !== null && <span className="text-xl font-black tabular-nums">{r.total}</span>}
          <span className="max-w-28 truncate text-xs font-bold">{r.headline}</span>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="space-y-3 px-3 pb-3">
              <p className="font-mono text-xs text-muted">{r.notation}</p>
              {r.detail && <p className="text-xs font-semibold text-muted">{r.detail}</p>}
              {r.genesys && <GenesysTallyView tally={r.genesys} />}
              <DiceRow dice={r.dice} animate={false} size={30} />
              {onRepeat && (
                <button type="button" onClick={() => onRepeat(entry)} className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-bold">
                  ↻ Repetir tirada
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

export function HistoryFeed({ entries, onRepeat, empty }: { entries: HistoryEntry[]; onRepeat?: (e: HistoryEntry) => void; empty?: string }) {
  if (!entries.length) return <p className="py-6 text-center text-sm text-muted">{empty ?? "Aún no hay tiradas."}</p>;
  return (
    <ul className="space-y-2">
      <AnimatePresence initial={false}>
        {entries.map((e) => (
          <HistoryItem key={e.id} entry={e} onRepeat={onRepeat} />
        ))}
      </AnimatePresence>
    </ul>
  );
}
