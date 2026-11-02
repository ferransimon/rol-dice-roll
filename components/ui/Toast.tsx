"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { useUi } from "@/lib/store/ui";

export function Toast() {
  const toast = useUi((s) => s.toast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => useUi.setState({ toast: null }), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),0.75rem)] z-[60] flex justify-center px-4">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            data-tint={toast.tint ?? "lavanda"}
            initial={{ y: -40, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -30, opacity: 0 }}
            className="rounded-full bg-tint-bg px-4 py-2 text-sm font-bold text-tint-ink shadow-soft"
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
