"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Game } from "@/lib/dice/presets";
import { useActivePlayer, useApp } from "@/lib/store/app";
import { Stepper } from "@/components/ui/controls";

const EMPTY: Record<string, number> = {};

export function useGameStoryPoints(gameId: string): Record<string, number> {
  return useApp((s) => s.storyPoints[gameId] ?? EMPTY);
}

/** Contador de puntos de historia del jugador activo (juegos con `storyPoints`). */
export function StoryPoints({ game }: { game: Game }) {
  const player = useActivePlayer();
  const points = useGameStoryPoints(game.id)[player.id] ?? 0;
  const setStoryPoints = useApp((s) => s.setStoryPoints);

  return (
    <div data-tint={player.tint} className="flex items-center justify-between gap-3 rounded-3xl bg-tint-bg py-2 pr-2 pl-4 text-tint-ink">
      <div className="min-w-0">
        <p className="truncate text-sm font-extrabold">
          <span className="relative inline-block w-5">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={points}
                initial={{ scale: 1.8, rotate: -40, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                className="inline-block"
              >
                ★
              </motion.span>
            </AnimatePresence>
          </span>
          Puntos de historia
        </p>
        <p className="truncate text-[11px] font-semibold opacity-70">de {player.name} · gasta 1 para girar una tirada</p>
      </div>
      <Stepper size="sm" value={points} min={0} max={99} onChange={(v) => setStoryPoints(game.id, player.id, v)} />
    </div>
  );
}
