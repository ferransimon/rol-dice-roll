"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { useApp } from "./app";

/** Estado efímero (no persistido). */
interface UiState {
  /** Id de la última tirada local, para mostrarla en la mesa. */
  lastEntryId: string | null;
  /** Se incrementa en cada tirada para relanzar animaciones aunque se repita. */
  rollNonce: number;
  toast: { id: number; text: string; tint?: string } | null;
  setLast: (id: string) => void;
  showToast: (text: string, tint?: string) => void;
}

export const useUi = create<UiState>((set) => ({
  lastEntryId: null,
  rollNonce: 0,
  toast: null,
  setLast: (id) => set((s) => ({ lastEntryId: id, rollNonce: s.rollNonce + 1 })),
  showToast: (text, tint) => set({ toast: { id: Date.now(), text, tint } }),
}));

const subscribeHydration = (cb: () => void) => useApp.persist.onFinishHydration(cb);

/** true cuando el estado persistido ya se ha cargado de localStorage. */
export function useHydrated() {
  return useSyncExternalStore(
    subscribeHydration,
    () => useApp.persist.hasHydrated(),
    () => false,
  );
}
