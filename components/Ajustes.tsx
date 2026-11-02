"use client";

import { motion, Reorder, useDragControls } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { TINTS } from "@/lib/dice/presets";
import { requestMotionPermission } from "@/lib/hooks/useShake";
import { useApp, type Player, type Theme } from "@/lib/store/app";
import { useHydrated, useUi } from "@/lib/store/ui";
import { PlayerAvatar } from "@/components/players/PlayerSwitcher";
import { Button, Segmented, Toggle } from "@/components/ui/controls";
import { Sheet } from "@/components/ui/Sheet";

function PlayerRow({ player, canDelete }: { player: Player; canDelete: boolean }) {
  const controls = useDragControls();
  const update = useApp((s) => s.updatePlayer);
  const remove = useApp((s) => s.removePlayer);
  return (
    <Reorder.Item value={player} dragListener={false} dragControls={controls} className="list-none">
      <div className="rounded-3xl bg-surface-2 p-3">
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Reordenar" onPointerDown={(e) => controls.start(e)} className="cursor-grab touch-none px-1 text-muted">
            ⋮⋮
          </button>
          <PlayerAvatar name={player.name} tint={player.tint} size={32} />
          <input
            className="min-w-0 flex-1 bg-transparent font-bold outline-none"
            value={player.name}
            onChange={(e) => update(player.id, { name: e.target.value })}
            aria-label="Nombre"
          />
          {canDelete && (
            <button type="button" className="px-2 text-lg text-muted" aria-label="Borrar jugador" onClick={() => remove(player.id)}>
              ×
            </button>
          )}
        </div>
        <div className="mt-2 flex gap-1.5 pl-8">
          {TINTS.map((t) => (
            <button
              key={t}
              type="button"
              aria-label={t}
              data-tint={t}
              onClick={() => update(player.id, { tint: t })}
              className={`h-6 w-6 rounded-full bg-tint ring-offset-2 ring-offset-[var(--surface-2)] ${player.tint === t ? "ring-2 ring-[var(--ink)]" : ""}`}
            />
          ))}
        </div>
      </div>
    </Reorder.Item>
  );
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

function useInstallPrompt() {
  const [evt, setEvt] = useState<InstallPromptEvent | null>(null);
  useEffect(() => {
    const on = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", on);
    return () => window.removeEventListener("beforeinstallprompt", on);
  }, []);
  return evt;
}

export function Ajustes() {
  const hydrated = useHydrated();
  const s = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState<null | "history" | "games">(null);
  const install = useInstallPrompt();
  const toast = useUi((u) => u.showToast);

  if (!hydrated) return null;

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ app: "dados", version: 1, games: s.games, players: s.players }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `dados-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.games)) throw new Error();
      s.importData(data);
      toast("Configuración importada", "menta");
    } catch {
      toast("Ese archivo no es válido", "rosa");
    }
  };

  return (
    <div className="space-y-5 px-4 pt-4 pb-28">
      <h1 className="text-2xl font-black tracking-tight">Ajustes</h1>

      <section className="space-y-3 rounded-4xl bg-surface p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold">Jugadores en este dispositivo</h2>
          <button type="button" className="text-sm font-bold text-tint-ink" onClick={() => s.addPlayer("")}>
            + Añadir
          </button>
        </div>
        <Reorder.Group axis="y" values={s.players} onReorder={s.reorderPlayers} className="space-y-2">
          {s.players.map((p) => (
            <PlayerRow key={p.id} player={p} canDelete={s.players.length > 1} />
          ))}
        </Reorder.Group>
      </section>

      <section className="space-y-2 rounded-4xl bg-surface p-4 shadow-soft">
        <h2 className="mb-1 font-extrabold">Apariencia y sensaciones</h2>
        <Segmented<Theme>
          layoutId="theme"
          value={s.settings.theme}
          onChange={(theme) => s.setSettings({ theme })}
          options={[
            { value: "auto", label: "Auto" },
            { value: "light", label: "Claro" },
            { value: "dark", label: "Oscuro" },
          ]}
        />
        <Toggle checked={s.settings.sound} onChange={(sound) => s.setSettings({ sound })} label="Sonido de dados" />
        <Toggle checked={s.settings.haptics} onChange={(haptics) => s.setSettings({ haptics })} label="Vibración" />
        <Toggle
          checked={s.settings.shake}
          onChange={async (shake) => {
            if (shake && !(await requestMotionPermission())) {
              toast("No hay permiso para el sensor de movimiento", "rosa");
              return;
            }
            s.setSettings({ shake });
          }}
          label="Agitar el móvil para tirar"
        />
      </section>

      <section className="space-y-2 rounded-4xl bg-surface p-4 shadow-soft">
        <h2 className="mb-1 font-extrabold">Datos</h2>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={exportData}>Exportar juegos</Button>
          <Button onClick={() => fileRef.current?.click()}>Importar</Button>
          <Button onClick={() => setConfirm("history")}>Borrar historial</Button>
          <Button onClick={() => setConfirm("games")}>Restaurar juegos</Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importData(f);
            e.target.value = "";
          }}
        />
      </section>

      {install && (
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} data-tint="cielo" className="rounded-4xl bg-tint-bg p-4 text-tint-ink">
          <p className="font-extrabold">Instala Dados</p>
          <p className="text-sm opacity-80">Funciona sin conexión y se abre como una app.</p>
          <Button variant="primary" className="mt-3" onClick={() => void install.prompt()}>
            Instalar
          </Button>
        </motion.section>
      )}

      <Sheet
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm === "history" ? "¿Borrar todo el historial?" : "¿Restaurar los juegos de ejemplo?"}
      >
        <p className="text-sm text-muted">
          {confirm === "history" ? "Se borrarán todas las tiradas guardadas en este dispositivo." : "Se sustituirán tus juegos por las plantillas originales. Exporta antes si quieres conservarlos."}
        </p>
        <div className="mt-4 flex gap-2 pb-4">
          <Button className="flex-1" onClick={() => setConfirm(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              if (confirm === "history") s.clearHistory();
              else s.resetGames();
              setConfirm(null);
            }}
          >
            Confirmar
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
