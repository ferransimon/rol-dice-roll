"use client";

import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { create } from "zustand";
import type { HistoryEntry, Player } from "@/lib/store/app";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const roomsEnabled = Boolean(URL && KEY);

let client: SupabaseClient | null = null;
function getClient() {
  if (!roomsEnabled) return null;
  client ??= createClient(URL!, KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export type RoomStatus = "idle" | "connecting" | "connected" | "error";

export interface Peer {
  deviceId: string;
  players: Pick<Player, "id" | "name" | "tint">[];
  activePlayerId: string;
  joinedAt: number;
}

interface RoomState {
  status: RoomStatus;
  code: string | null;
  peers: Peer[];
}

export const useRoomState = create<RoomState>(() => ({ status: "idle", code: null, peers: [] }));

// Sin 0/O, 1/I/L para que se pueda dictar en voz alta.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function generateRoomCode(len = 5) {
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => ALPHABET[n % ALPHABET.length]).join("");
}

export function normalizeCode(s: string) {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

interface Handlers {
  deviceId: string;
  presence: () => Omit<Peer, "joinedAt" | "deviceId">;
  onRoll: (entry: HistoryEntry) => void;
  /** Devuelve las tiradas recientes de la sala para un recién llegado. */
  recent: () => HistoryEntry[];
  onSync: (entries: HistoryEntry[]) => void;
}

let channel: RealtimeChannel | null = null;
let joinedAt = 0;
let handlers: Handlers | null = null;

export async function joinRoom(code: string, h: Handlers) {
  const sb = getClient();
  if (!sb) return;
  await leaveRoom();
  handlers = h;
  joinedAt = Date.now();
  useRoomState.setState({ status: "connecting", code, peers: [] });

  const ch = sb.channel(`dados:${code}`, {
    config: { broadcast: { self: false, ack: false }, presence: { key: h.deviceId } },
  });
  channel = ch;

  ch.on("presence", { event: "sync" }, () => {
    const state = ch.presenceState<Peer>();
    const peers = Object.values(state)
      .map((metas) => metas[metas.length - 1])
      .filter(Boolean)
      .sort((a, b) => a.joinedAt - b.joinedAt);
    useRoomState.setState({ peers });
  });

  ch.on("broadcast", { event: "roll" }, ({ payload }) => {
    handlers?.onRoll({ ...(payload as HistoryEntry), remote: true });
  });

  ch.on("broadcast", { event: "sync-request" }, ({ payload }) => {
    const { deviceId } = payload as { deviceId: string };
    const entries = handlers?.recent() ?? [];
    if (entries.length) ch.send({ type: "broadcast", event: "sync-response", payload: { to: deviceId, entries } });
  });

  ch.on("broadcast", { event: "sync-response" }, ({ payload }) => {
    const { to, entries } = payload as { to: string; entries: HistoryEntry[] };
    if (to !== handlers?.deviceId) return;
    handlers?.onSync(entries.map((e) => ({ ...e, remote: e.deviceId !== handlers?.deviceId })));
  });

  ch.subscribe(async (status) => {
    if (channel !== ch) return;
    if (status === "SUBSCRIBED") {
      useRoomState.setState({ status: "connected" });
      await updatePresence();
      ch.send({ type: "broadcast", event: "sync-request", payload: { deviceId: h.deviceId } });
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      useRoomState.setState({ status: "error" });
    } else if (status === "CLOSED") {
      useRoomState.setState({ status: "idle" });
    }
  });
}

export async function updatePresence() {
  if (!channel || !handlers || useRoomState.getState().status !== "connected") return;
  await channel.track({ ...handlers.presence(), deviceId: handlers.deviceId, joinedAt });
}

export function broadcastRoll(entry: HistoryEntry) {
  if (!channel || useRoomState.getState().status !== "connected") return;
  channel.send({ type: "broadcast", event: "roll", payload: entry });
}

export async function leaveRoom() {
  const ch = channel;
  channel = null;
  handlers = null;
  useRoomState.setState({ status: "idle", code: null, peers: [] });
  if (ch) await getClient()?.removeChannel(ch);
}
