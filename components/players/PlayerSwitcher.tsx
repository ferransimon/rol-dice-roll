"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { useApp } from "@/lib/store/app";
import { Button, inputClass } from "@/components/ui/controls";
import { Sheet } from "@/components/ui/Sheet";

export function PlayerAvatar({ name, tint, size = 28 }: { name: string; tint: string; size?: number }) {
  return (
    <span
      data-tint={tint}
      className="grid shrink-0 place-items-center rounded-full bg-tint font-black text-tint-ink"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export function PlayerSwitcher({ storyPoints }: { storyPoints?: Record<string, number> }) {
  const players = useApp((s) => s.players);
  const activeId = useApp((s) => s.activePlayerId);
  const setActive = useApp((s) => s.setActivePlayer);
  const addPlayer = useApp((s) => s.addPlayer);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const submit = () => {
    addPlayer(name);
    setName("");
    setAdding(false);
  };

  return (
    <>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1">
        {players.map((p) => {
          const active = p.id === activeId;
          return (
            <motion.button
              key={p.id}
              layout
              type="button"
              data-tint={p.tint}
              whileTap={{ scale: 0.94 }}
              onClick={() => setActive(p.id)}
              className={`relative flex shrink-0 items-center gap-2 rounded-full py-1 pr-4 pl-1 text-sm font-bold transition-colors ${active ? "text-tint-ink" : "text-muted"}`}
            >
              {active && <motion.span layoutId="player-pill" className="absolute inset-0 rounded-full bg-tint-bg ring-2 ring-[var(--tint)]" />}
              <span className="relative">
                <PlayerAvatar name={p.name} tint={p.tint} />
              </span>
              <span className="relative">{p.name}</span>
              {storyPoints && (
                <motion.span
                  key={storyPoints[p.id] ?? 0}
                  initial={{ scale: 1.5 }}
                  animate={{ scale: 1 }}
                  className="relative -mr-1.5 rounded-full bg-surface/70 px-1.5 text-[11px] font-black tabular-nums"
                >
                  ★{storyPoints[p.id] ?? 0}
                </motion.span>
              )}
            </motion.button>
          );
        })}
        <motion.button
          layout
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => setAdding(true)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-dashed border-line text-lg font-bold text-muted"
          aria-label="Añadir jugador"
        >
          +
        </motion.button>
      </div>

      <Sheet
        open={adding}
        onClose={() => setAdding(false)}
        title="Nuevo jugador"
        footer={
          <Button variant="primary" className="w-full" onClick={submit}>
            Añadir
          </Button>
        }
      >
          <input
            autoFocus
            className={inputClass}
            placeholder={`Jugador ${players.length + 1}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        <p className="mt-2 text-xs text-muted">Cada jugador tiene su color. Tocad vuestro nombre antes de tirar para que quede registrado.</p>
      </Sheet>
    </>
  );
}
