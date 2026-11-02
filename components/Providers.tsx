"use client";

import { MotionConfig } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { useApp } from "@/lib/store/app";
import { RoomSync } from "./room/RoomSync";

function useThemeSync() {
  const theme = useApp((s) => s.settings.theme);
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme = theme === "auto" ? (mq.matches ? "dark" : "light") : theme;
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
}

function useServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);
}

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    void useApp.persist.rehydrate();
  }, []);
  useThemeSync();
  useServiceWorker();

  return (
    <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 500, damping: 34 }}>
      {children}
      <RoomSync />
    </MotionConfig>
  );
}
