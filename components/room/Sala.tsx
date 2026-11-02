"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { generateRoomCode, normalizeCode, roomsEnabled, useRoomState } from "@/lib/room/client";
import { useRoller } from "@/lib/hooks/useRoller";
import { useApp, type HistoryEntry } from "@/lib/store/app";
import { useHydrated } from "@/lib/store/ui";
import { HistoryFeed } from "@/components/history/HistoryFeed";
import { PlayerAvatar } from "@/components/players/PlayerSwitcher";
import { Button, inputClass } from "@/components/ui/controls";

const STATUS: Record<string, { label: string; tint: string }> = {
  idle: { label: "Desconectado", tint: "lavanda" },
  connecting: { label: "Conectando…", tint: "limon" },
  connected: { label: "Conectado", tint: "menta" },
  error: { label: "Reconectando…", tint: "rosa" },
};

function QR({ text }: { text: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    QRCode.toString(text, {
      type: "svg",
      margin: 1,
      color: { dark: styles.getPropertyValue("--ink").trim() || "#3d3a4b", light: "#0000" },
    }).then(setSvg, () => setSvg(""));
  }, [text]);
  return <div className="aspect-square w-40 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function Sala() {
  const hydrated = useHydrated();
  if (!roomsEnabled) return <NotConfigured />;
  if (!hydrated) return null;
  return <SalaInner />;
}

function NotConfigured() {
  return (
    <div className="space-y-4 px-4 pt-4 pb-28">
      <h1 className="text-2xl font-black tracking-tight">Sala</h1>
      <div data-tint="limon" className="rounded-3xl bg-tint-bg p-4 text-sm text-tint-ink">
        <p className="font-extrabold">Las salas no están configuradas</p>
        <p className="mt-2">
          Para ver las tiradas de otros dispositivos en tiempo real, crea un proyecto gratuito en Supabase y define
          <code className="mx-1 rounded bg-surface/60 px-1">NEXT_PUBLIC_SUPABASE_URL</code>y
          <code className="mx-1 rounded bg-surface/60 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>en <code>.env.local</code>. Consulta el README.
        </p>
        <p className="mt-2 opacity-80">Mientras tanto, varios jugadores pueden tirar desde este mismo dispositivo.</p>
      </div>
    </div>
  );
}

function SalaInner() {
  const room = useApp((s) => s.room);
  const setRoom = useApp((s) => s.setRoom);
  const deviceId = useApp((s) => s.deviceId);
  const history = useApp((s) => s.history);
  const { status, peers } = useRoomState();
  const params = useSearchParams();
  const router = useRouter();
  const rollNow = useRoller();
  const [code, setCode] = useState(() => normalizeCode(params.get("c") ?? ""));
  const [copied, setCopied] = useState(false);

  const link = typeof window !== "undefined" && room ? `${location.origin}/sala?c=${room}` : "";
  const entries = room ? history.filter((h) => h.room === room) : [];
  const st = STATUS[status];

  const join = (c: string) => {
    if (c.length < 4) return;
    setRoom(c);
    router.replace("/sala");
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Únete a mi sala de dados", text: `Código ${room}`, url: link });
        return;
      } catch {
        /* cancelado */
      }
    }
    await navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!room) {
    return (
      <div className="space-y-5 px-4 pt-4 pb-28">
        <h1 className="text-2xl font-black tracking-tight">Sala</h1>
        <p className="text-sm text-muted">Comparte una sala para que todos veáis las tiradas de cada uno, cada cual desde su móvil.</p>

        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          data-tint="menta"
          onClick={() => join(generateRoomCode())}
          className="w-full rounded-4xl bg-tint-bg p-5 text-left text-tint-ink shadow-soft"
        >
          <span className="block text-xl font-black">Crear sala</span>
          <span className="text-sm opacity-80">Genera un código para compartir</span>
        </motion.button>

        <div className="rounded-4xl bg-surface p-5 shadow-soft">
          <p className="mb-3 text-xl font-black">Unirse</p>
          <div className="flex gap-2">
            <input
              className={`${inputClass} text-center font-mono text-xl tracking-[0.3em] uppercase`}
              placeholder="ABCDE"
              value={code}
              maxLength={8}
              onChange={(e) => setCode(normalizeCode(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && join(code)}
              autoCapitalize="characters"
              autoComplete="off"
            />
            <Button variant="primary" disabled={code.length < 4} onClick={() => join(code)}>
              Entrar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 pt-4 pb-28">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight">Sala</h1>
        <span data-tint={st.tint} className="flex items-center gap-1.5 rounded-full bg-tint-bg px-3 py-1 text-xs font-bold text-tint-ink">
          <motion.span
            className="h-2 w-2 rounded-full bg-tint"
            animate={status === "connecting" || status === "error" ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          />
          {st.label}
        </span>
      </div>

      <div data-tint="lavanda" className="flex flex-col items-center gap-3 rounded-4xl bg-surface p-5 text-center shadow-soft">
        <p className="text-xs font-bold tracking-widest text-muted uppercase">Código de sala</p>
        <p className="font-mono text-5xl font-black tracking-[0.2em]">{room}</p>
        {link && <QR text={link} />}
        <div className="flex w-full gap-2">
          <Button className="flex-1" onClick={share}>
            {copied ? "¡Copiado!" : "Compartir enlace"}
          </Button>
          <Button variant="danger" onClick={() => setRoom(null)}>
            Salir
          </Button>
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-extrabold tracking-wide text-muted uppercase">En la sala · {peers.length} dispositivo{peers.length === 1 ? "" : "s"}</h2>
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {peers.map((p) => (
              <motion.li
                key={p.deviceId}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 rounded-3xl bg-surface p-3 shadow-soft"
              >
                <span className="text-lg">{p.deviceId === deviceId ? "📱" : "📲"}</span>
                <div className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto">
                  {p.players.map((pl) => (
                    <span
                      key={pl.id}
                      data-tint={pl.tint}
                      className={`flex shrink-0 items-center gap-1.5 rounded-full py-0.5 pr-3 pl-0.5 text-xs font-bold ${pl.id === p.activePlayerId ? "bg-tint-bg text-tint-ink" : "text-muted"}`}
                    >
                      <PlayerAvatar name={pl.name} tint={pl.tint} size={22} />
                      {pl.name}
                    </span>
                  ))}
                </div>
                {p.deviceId === deviceId && <span className="text-[10px] font-bold text-muted">tú</span>}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-extrabold tracking-wide text-muted uppercase">Tiradas de la sala</h2>
        <HistoryFeed entries={entries} onRepeat={(e: HistoryEntry) => rollNow(e.spec, e.rollName)} empty="Cuando alguien tire, aparecerá aquí." />
      </section>
    </div>
  );
}
