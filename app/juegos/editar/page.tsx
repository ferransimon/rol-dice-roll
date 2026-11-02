import { Suspense } from "react";
import { GameEditor } from "@/components/games/GameEditor";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-muted">Cargando…</div>}>
      <GameEditor />
    </Suspense>
  );
}
