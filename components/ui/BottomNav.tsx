"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRoomState } from "@/lib/room/client";

const ICONS = {
  mesa: (
    <path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm3 4.5a1 1 0 1 0 0 .01M15 8.5a1 1 0 1 0 0 .01M12 12a1 1 0 1 0 0 .01M9 15.5a1 1 0 1 0 0 .01M15 15.5a1 1 0 1 0 0 .01" />
  ),
  juegos: <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h4A1.5 1.5 0 0 1 11 5.5v4A1.5 1.5 0 0 1 9.5 11h-4A1.5 1.5 0 0 1 4 9.5Zm9 0A1.5 1.5 0 0 1 14.5 4h4A1.5 1.5 0 0 1 20 5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 13 9.5Zm-9 9A1.5 1.5 0 0 1 5.5 13h4a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 9.5 20h-4A1.5 1.5 0 0 1 4 18.5Zm9 0a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5Z" />,
  sala: (
    <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.2A6 6 0 0 1 21 20" />
  ),
  ajustes: (
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10M16 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM8 19.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
  ),
};

const ITEMS = [
  { href: "/", label: "Mesa", icon: ICONS.mesa },
  { href: "/juegos", label: "Juegos", icon: ICONS.juegos },
  { href: "/sala", label: "Sala", icon: ICONS.sala },
  { href: "/ajustes", label: "Ajustes", icon: ICONS.ajustes },
] as const;

export function BottomNav() {
  const path = usePathname();
  const roomStatus = useRoomState((s) => s.status);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 backdrop-blur-xl pb-safe">
      <ul className="mx-auto flex max-w-xl">
        {ITEMS.map((it) => {
          const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold transition-colors ${active ? "text-ink" : "text-muted"}`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute top-1.5 h-8 w-14 rounded-full"
                    style={{ background: "var(--lavanda-bg)" }}
                  />
                )}
                <svg viewBox="0 0 24 24" className="relative h-6 w-6 fill-none stroke-current" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  {it.icon}
                </svg>
                <span className="relative">{it.label}</span>
                {it.href === "/sala" && roomStatus === "connected" && (
                  <span className="absolute top-2 right-[calc(50%-18px)] h-2 w-2 rounded-full" style={{ background: "var(--menta)" }} />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
