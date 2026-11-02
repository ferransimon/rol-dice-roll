"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { useActiveGame, useApp } from "@/lib/store/app";
import { useRoomState } from "@/lib/room/client";
import { Sheet } from "@/components/ui/Sheet";

export function GamePicker() {
  const game = useActiveGame();
  const games = useApp((s) => s.games);
  const setActive = useApp((s) => s.setActiveGame);
  const room = useRoomState((s) => (s.status === "connected" ? s.code : null));
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => setOpen(true)} className="group flex min-w-0 items-center gap-2 text-left">
          <span data-tint={game.tint} className="h-3.5 w-3.5 shrink-0 rounded-full bg-tint" />
          <span className="truncate text-2xl font-black tracking-tight">{game.name}</span>
          <span className="text-muted transition group-active:translate-y-0.5">▾</span>
        </button>
        {room && (
          <Link href="/sala" className="shrink-0 rounded-full px-3 py-1 text-xs font-bold" style={{ background: "var(--menta-bg)", color: "var(--menta-ink)" }}>
            ● {room}
          </Link>
        )}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Elige juego">
        <ul className="space-y-1.5 pb-3">
          {games.map((g) => (
            <li key={g.id}>
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                data-tint={g.tint}
                onClick={() => {
                  setActive(g.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ${g.id === game.id ? "bg-tint-bg text-tint-ink" : "bg-surface-2"}`}
              >
                <span className="h-8 w-8 shrink-0 rounded-xl bg-tint" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold">{g.name}</span>
                  {g.description && <span className="block truncate text-xs opacity-70">{g.description}</span>}
                </span>
                {g.id === game.id && <span className="font-black">✓</span>}
              </motion.button>
            </li>
          ))}
        </ul>
        <Link href="/juegos" onClick={() => setOpen(false)} className="mb-3 block rounded-2xl border border-dashed border-line py-3 text-center text-sm font-bold text-muted">
          Gestionar juegos
        </Link>
      </Sheet>
    </>
  );
}
