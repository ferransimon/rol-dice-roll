"use client";

import { useEffect, useState } from "react";
import { joinRoom, leaveRoom, roomsEnabled, updatePresence, useRoomState } from "@/lib/room/client";
import { useApp } from "@/lib/store/app";
import { useHydrated, useUi } from "@/lib/store/ui";

/** Mantiene la conexión con la sala guardada en el estado, sin UI propia. */
export function RoomSync() {
  const hydrated = useHydrated();
  const room = useApp((s) => s.room);
  const status = useRoomState((s) => s.status);
  const players = useApp((s) => s.players);
  const activePlayerId = useApp((s) => s.activePlayerId);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!hydrated || !roomsEnabled) return;
    if (!room) {
      void leaveRoom();
      return;
    }
    const deviceId = useApp.getState().deviceId;
    void joinRoom(room, {
      deviceId,
      presence: () => {
        const s = useApp.getState();
        return {
          players: s.players.map(({ id, name, tint }) => ({ id, name, tint })),
          activePlayerId: s.activePlayerId,
        };
      },
      onRoll: (entry) => {
        useApp.getState().addEntry(entry);
        useUi.getState().showToast(`${entry.playerName}: ${entry.result.total ?? ""} ${entry.result.headline}`.trim(), entry.playerTint);
      },
      recent: () =>
        useApp
          .getState()
          .history.filter((h) => h.room === room)
          .slice(0, 50),
      onSync: (entries) => useApp.getState().mergeEntries(entries.map((e) => ({ ...e, room }))),
    });
  }, [hydrated, room, attempt]);

  // Reintento si la conexión falla.
  useEffect(() => {
    if (status !== "error" || !room) return;
    const t = setTimeout(() => setAttempt((a) => a + 1), 4000);
    return () => clearTimeout(t);
  }, [status, room]);

  useEffect(() => {
    void updatePresence();
  }, [players, activePlayerId, status]);

  useEffect(() => () => void leaveRoom(), []);

  return null;
}
