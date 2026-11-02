"use client";

import { useEffect, useRef } from "react";

type MotionPermission = { requestPermission?: () => Promise<"granted" | "denied"> };

/** iOS exige pedir permiso desde un gesto del usuario. */
export async function requestMotionPermission(): Promise<boolean> {
  const DME = (globalThis as unknown as { DeviceMotionEvent?: MotionPermission }).DeviceMotionEvent;
  if (!DME) return false;
  if (typeof DME.requestPermission === "function") {
    try {
      return (await DME.requestPermission()) === "granted";
    } catch {
      return false;
    }
  }
  return true;
}

/** Llama a `onShake` cuando se agita el dispositivo. */
export function useShake(onShake: () => void, enabled: boolean) {
  const cb = useRef(onShake);
  useEffect(() => {
    cb.current = onShake;
  });

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("DeviceMotionEvent" in window)) return;
    let last = 0;
    let strong = 0;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity ?? e.acceleration;
      if (!a) return;
      const mag = Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2);
      const now = Date.now();
      if (mag > 22) {
        strong++;
        if (strong >= 3 && now - last > 1200) {
          last = now;
          strong = 0;
          cb.current();
        }
      } else if (mag < 14) {
        strong = Math.max(0, strong - 1);
      }
    };
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [enabled]);
}
