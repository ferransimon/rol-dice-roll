"use client";

import { useCallback } from "react";
import { roll } from "@/lib/dice/roll";
import type { RollSpec } from "@/lib/dice/types";
import { broadcastRoll } from "@/lib/room/client";
import { newId, useApp, type HistoryEntry } from "@/lib/store/app";
import { useUi } from "@/lib/store/ui";
import { playDiceSound, vibrate } from "./feedback";

/** Tira, guarda en el historial, avisa a la sala y da feedback. */
export function useRoller() {
  return useCallback((spec: RollSpec, rollName?: string) => {
    const s = useApp.getState();
    const player = s.players.find((p) => p.id === s.activePlayerId) ?? s.players[0];
    const game = s.games.find((g) => g.id === s.activeGameId) ?? s.games[0];
    const result = roll(spec);
    const entry: HistoryEntry = {
      id: newId(),
      ts: Date.now(),
      deviceId: s.deviceId,
      playerId: player.id,
      playerName: player.name,
      playerTint: player.tint,
      gameName: game.name,
      rollName,
      spec,
      result,
      room: s.room ?? undefined,
    };
    s.addEntry(entry);
    useUi.getState().setLast(entry.id);
    broadcastRoll(entry);
    const diceCount = result.dice.length;
    if (s.settings.sound) playDiceSound(diceCount);
    if (s.settings.haptics) {
      if (result.tone === "crit") vibrate([30, 40, 30, 40, 60]);
      else if (result.tone === "fumble") vibrate([120, 60, 120]);
      else vibrate(25);
    }
    return entry;
  }, []);
}
