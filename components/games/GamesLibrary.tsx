"use client";

import { motion, Reorder, useDragControls } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PRESETS, type Game } from "@/lib/dice/presets";
import { useApp } from "@/lib/store/app";
import { useHydrated } from "@/lib/store/ui";
import { DieIcon, trayText } from "@/components/dice/DieIcon";
import { Button } from "@/components/ui/controls";
import { Sheet } from "@/components/ui/Sheet";

function GameRow({ game, active }: { game: Game; active: boolean }) {
  const controls = useDragControls();
  const setActive = useApp((s) => s.setActiveGame);
  const duplicate = useApp((s) => s.duplicateGame);
  const remove = useApp((s) => s.removeGame);
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();

  return (
    <Reorder.Item value={game} dragListener={false} dragControls={controls} className="list-none" data-tint={game.tint}>
      <motion.div layout className="rounded-3xl bg-tint-bg p-4 text-tint-ink shadow-soft">
        <div className="flex items-start gap-3">
          <button
            type="button"
            aria-label="Reordenar"
            onPointerDown={(e) => controls.start(e)}
            className="mt-1 cursor-grab touch-none text-lg leading-none opacity-50"
          >
            ⋮⋮
          </button>
          <Link href={`/juegos/editar?id=${game.id}`} className="min-w-0 flex-1">
            <p className="truncate text-lg font-black">{game.name}</p>
            {game.description && <p className="truncate text-xs font-semibold opacity-70">{game.description}</p>}
            <div className="mt-2 flex flex-wrap gap-0.5">
              {game.quickDice.slice(0, 8).map((d, i) => (
                <DieIcon key={i} die={d} text={trayText(d)} size={22} />
              ))}
              <span className="ml-1 self-center text-xs font-bold opacity-70">
                · {game.rolls.length} tirada{game.rolls.length === 1 ? "" : "s"}
              </span>
            </div>
          </Link>
          {active && <span className="rounded-full bg-surface/70 px-2 py-0.5 text-[10px] font-black">EN MESA</span>}
        </div>
        <div className="mt-3 flex gap-1.5">
          <button
            type="button"
            className="flex-1 rounded-2xl bg-tint px-3 py-2 text-sm font-extrabold"
            onClick={() => {
              setActive(game.id);
              router.push("/");
            }}
          >
            Jugar
          </button>
          <Link href={`/juegos/editar?id=${game.id}`} className="rounded-2xl bg-surface/70 px-3 py-2 text-sm font-bold">
            Editar
          </Link>
          <button type="button" className="rounded-2xl bg-surface/70 px-3 py-2 text-sm font-bold" onClick={() => duplicate(game.id)}>
            Duplicar
          </button>
          <button type="button" aria-label="Borrar" className="rounded-2xl bg-surface/70 px-3 py-2 text-sm font-bold" onClick={() => setConfirm(true)}>
            🗑
          </button>
        </div>
      </motion.div>
      <Sheet open={confirm} onClose={() => setConfirm(false)} title={`¿Borrar «${game.name}»?`}>
        <p className="text-sm text-muted">Se borrará el juego y sus tiradas guardadas. El historial se mantiene.</p>
        <div className="mt-4 flex gap-2 pb-4">
          <Button className="flex-1" onClick={() => setConfirm(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              remove(game.id);
              setConfirm(false);
            }}
          >
            Borrar
          </Button>
        </div>
      </Sheet>
    </Reorder.Item>
  );
}

export function GamesLibrary() {
  const hydrated = useHydrated();
  const games = useApp((s) => s.games);
  const activeId = useApp((s) => s.activeGameId);
  const reorder = useApp((s) => s.reorderGames);
  const createGame = useApp((s) => s.createGame);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const create = (template?: Game) => {
    const g = createGame(template);
    setCreating(false);
    router.push(`/juegos/editar?id=${g.id}`);
  };

  return (
    <div className="space-y-4 px-4 pt-4 pb-28">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight">Juegos</h1>
        <Button variant="primary" onClick={() => setCreating(true)}>
          + Nuevo
        </Button>
      </div>
      <p className="text-sm text-muted">Cada juego guarda sus dados rápidos, cómo se leen y sus tiradas favoritas.</p>
      {hydrated && (
        <Reorder.Group axis="y" values={games} onReorder={reorder} className="space-y-3">
          {games.map((g) => (
            <GameRow key={g.id} game={g} active={g.id === activeId} />
          ))}
        </Reorder.Group>
      )}

      <Sheet open={creating} onClose={() => setCreating(false)} title="Nuevo juego">
        <button
          type="button"
          onClick={() => create()}
          className="mb-3 w-full rounded-2xl border-2 border-dashed border-line p-4 text-left font-extrabold"
        >
          Empezar en blanco
          <span className="block text-xs font-semibold text-muted">Todos los dados, suma simple</span>
        </button>
        <p className="mb-2 text-xs font-bold tracking-wide text-muted uppercase">O partir de una plantilla</p>
        <div className="grid grid-cols-2 gap-2 pb-4">
          {PRESETS.map((p) => (
            <motion.button
              key={p.id}
              whileTap={{ scale: 0.96 }}
              type="button"
              data-tint={p.tint}
              onClick={() => create(p)}
              className="rounded-2xl bg-tint-bg p-3 text-left text-tint-ink"
            >
              <span className="block text-sm font-extrabold leading-tight">{p.name}</span>
              <span className="mt-1 block text-[11px] leading-snug opacity-70">{p.description}</span>
            </motion.button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
