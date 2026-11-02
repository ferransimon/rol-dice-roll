"use client";

import { nanoid } from "nanoid";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { PRESETS, TINTS, type Game, type SavedRoll, type Tint } from "@/lib/dice/presets";
import type { RollResult, RollSpec } from "@/lib/dice/types";

export interface Player {
  id: string;
  name: string;
  tint: Tint;
}

export interface HistoryEntry {
  id: string;
  ts: number;
  deviceId: string;
  playerId: string;
  playerName: string;
  playerTint: Tint;
  gameName: string;
  rollName?: string;
  spec: RollSpec;
  result: RollResult;
  /** Código de la sala en la que se tiró (si había). */
  room?: string;
  remote?: boolean;
}

export type Theme = "auto" | "light" | "dark";

export interface Settings {
  theme: Theme;
  sound: boolean;
  haptics: boolean;
  shake: boolean;
}

interface State {
  deviceId: string;
  players: Player[];
  activePlayerId: string;
  games: Game[];
  activeGameId: string;
  history: HistoryEntry[];
  settings: Settings;
  room: string | null;
}

interface Actions {
  addPlayer: (name: string) => Player;
  updatePlayer: (id: string, patch: Partial<Omit<Player, "id">>) => void;
  removePlayer: (id: string) => void;
  setActivePlayer: (id: string) => void;
  reorderPlayers: (players: Player[]) => void;

  setActiveGame: (id: string) => void;
  createGame: (template?: Game) => Game;
  updateGame: (id: string, patch: Partial<Omit<Game, "id">>) => void;
  duplicateGame: (id: string) => Game | undefined;
  removeGame: (id: string) => void;
  reorderGames: (games: Game[]) => void;
  upsertRoll: (gameId: string, roll: SavedRoll) => void;
  removeRoll: (gameId: string, rollId: string) => void;

  addEntry: (entry: HistoryEntry) => void;
  mergeEntries: (entries: HistoryEntry[]) => void;
  clearHistory: () => void;

  setSettings: (patch: Partial<Settings>) => void;
  setRoom: (code: string | null) => void;
  importData: (data: { games?: Game[]; players?: Player[] }) => void;
  resetGames: () => void;
}

const HISTORY_LIMIT = 300;

function instantiate(template: Game): Game {
  return {
    ...structuredClone(template),
    id: nanoid(10),
    rolls: template.rolls.map((r) => ({ ...structuredClone(r), id: nanoid(10) })),
  };
}

function initialState(): State {
  const player: Player = { id: nanoid(10), name: "Jugador 1", tint: "lavanda" };
  const games = PRESETS.map(instantiate);
  return {
    deviceId: nanoid(12),
    players: [player],
    activePlayerId: player.id,
    games,
    activeGameId: games[0].id,
    history: [],
    settings: { theme: "auto", sound: true, haptics: true, shake: false },
    room: null,
  };
}

const sortHistory = (h: HistoryEntry[]) => h.sort((a, b) => b.ts - a.ts).slice(0, HISTORY_LIMIT);

export const useApp = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initialState(),

      addPlayer: (name) => {
        const used = new Set(get().players.map((p) => p.tint));
        const tint = TINTS.find((t) => !used.has(t)) ?? TINTS[get().players.length % TINTS.length];
        const player: Player = { id: nanoid(10), name: name.trim() || `Jugador ${get().players.length + 1}`, tint };
        set((s) => ({ players: [...s.players, player], activePlayerId: player.id }));
        return player;
      },
      updatePlayer: (id, patch) => set((s) => ({ players: s.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      removePlayer: (id) =>
        set((s) => {
          if (s.players.length <= 1) return s;
          const players = s.players.filter((p) => p.id !== id);
          return { players, activePlayerId: s.activePlayerId === id ? players[0].id : s.activePlayerId };
        }),
      setActivePlayer: (id) => set({ activePlayerId: id }),
      reorderPlayers: (players) => set({ players }),

      setActiveGame: (id) => set({ activeGameId: id }),
      createGame: (template) => {
        const game = template
          ? instantiate(template)
          : instantiate({ id: "", name: "Nuevo juego", tint: TINTS[get().games.length % TINTS.length], quickDice: PRESETS.at(-1)!.quickDice, trayMode: { kind: "sum" }, rolls: [] });
        set((s) => ({ games: [...s.games, game] }));
        return game;
      },
      updateGame: (id, patch) => set((s) => ({ games: s.games.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
      duplicateGame: (id) => {
        const src = get().games.find((g) => g.id === id);
        if (!src) return;
        const copy = instantiate({ ...src, name: `${src.name} (copia)` });
        set((s) => {
          const i = s.games.findIndex((g) => g.id === id);
          const games = [...s.games];
          games.splice(i + 1, 0, copy);
          return { games };
        });
        return copy;
      },
      removeGame: (id) =>
        set((s) => {
          const games = s.games.filter((g) => g.id !== id);
          if (!games.length) games.push(instantiate(PRESETS.at(-1)!));
          return { games, activeGameId: s.activeGameId === id ? games[0].id : s.activeGameId };
        }),
      reorderGames: (games) => set({ games }),
      upsertRoll: (gameId, roll) =>
        set((s) => ({
          games: s.games.map((g) => {
            if (g.id !== gameId) return g;
            const exists = g.rolls.some((r) => r.id === roll.id);
            return { ...g, rolls: exists ? g.rolls.map((r) => (r.id === roll.id ? roll : r)) : [...g.rolls, roll] };
          }),
        })),
      removeRoll: (gameId, rollId) =>
        set((s) => ({ games: s.games.map((g) => (g.id === gameId ? { ...g, rolls: g.rolls.filter((r) => r.id !== rollId) } : g)) })),

      addEntry: (entry) => set((s) => ({ history: sortHistory([entry, ...s.history.filter((h) => h.id !== entry.id)]) })),
      mergeEntries: (entries) =>
        set((s) => {
          const ids = new Set(s.history.map((h) => h.id));
          const fresh = entries.filter((e) => !ids.has(e.id));
          if (!fresh.length) return s;
          return { history: sortHistory([...fresh, ...s.history]) };
        }),
      clearHistory: () => set({ history: [] }),

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      setRoom: (room) => set({ room }),
      importData: (data) =>
        set((s) => {
          const games = data.games?.length ? data.games.map((g) => ({ ...g, id: g.id || nanoid(10) })) : s.games;
          const players = data.players?.length ? data.players : s.players;
          return {
            games,
            players,
            activeGameId: games.some((g) => g.id === s.activeGameId) ? s.activeGameId : games[0].id,
            activePlayerId: players.some((p) => p.id === s.activePlayerId) ? s.activePlayerId : players[0].id,
          };
        }),
      resetGames: () =>
        set(() => {
          const games = PRESETS.map(instantiate);
          return { games, activeGameId: games[0].id };
        }),
    }),
    {
      name: "dados-app",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        deviceId: s.deviceId,
        players: s.players,
        activePlayerId: s.activePlayerId,
        games: s.games,
        activeGameId: s.activeGameId,
        history: s.history,
        settings: s.settings,
        room: s.room,
      }),
    },
  ),
);

export const useActiveGame = () => useApp((s) => s.games.find((g) => g.id === s.activeGameId) ?? s.games[0]);
export const useActivePlayer = () => useApp((s) => s.players.find((p) => p.id === s.activePlayerId) ?? s.players[0]);

export function newId() {
  return nanoid(10);
}
