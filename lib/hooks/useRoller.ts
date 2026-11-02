"use client";

import { useCallback } from "react";
import { flipResult, roll } from "@/lib/dice/roll";
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
      gameId: game.id,
      gameName: game.name,
      rollName,
      spec,
      result,
      room: s.room ?? undefined,
    };
    s.addEntry(entry);
    useUi.getState().setLast(entry.id);
    broadcastRoll(entry);
    if (game.storyPoints && result.storyPoint) {
      s.adjustStoryPoints(game.id, player.id, result.storyPoint);
      useUi.getState().showToast(`★ +${result.storyPoint} punto de historia para ${player.name}`, player.tint);
    }
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

/** Troubleshooters: gira una tirada propia gastando un punto de historia. */
export function useFlip() {
  return useCallback((entryId: string) => {
    const s = useApp.getState();
    const entry = s.history.find((h) => h.id === entryId);
    if (!entry || entry.remote || !entry.gameId || !entry.result.flip || entry.result.flipped) return;
    const points = s.storyPoints[entry.gameId]?.[entry.playerId] ?? 0;
    if (points < 1) return;
    const result = flipResult(entry.spec, entry.result);
    s.adjustStoryPoints(entry.gameId, entry.playerId, -1);
    s.updateEntry(entry.id, { result });
    broadcastRoll({ ...entry, result });
    useUi.getState().showToast(`↻ ${entry.playerName} gira la tirada (−1 punto de historia)`, entry.playerTint);
    if (s.settings.sound) playDiceSound(1);
    if (s.settings.haptics) vibrate(result.tone === "fail" ? 25 : [30, 40, 30]);
  }, []);
}
