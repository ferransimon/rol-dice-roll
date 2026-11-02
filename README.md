# Dados

PWA en Next.js para tirar dados de rol: d20 (D&D/Pathfinder), PbtA, GURPS, reservas de d6 (Shadowrun) y d10 (Vampiro), Cyberpunk RED, percentil (La Llamada de Cthulhu), Fate/Fudge y Genesys/Star Wars FFG.

- **Mesa**: bandeja rápida (toca dados, ajusta modificador/dificultad, escribe notación tipo `2d6+1`, `1d20kh1`, `3d6!`), tiradas guardadas (toque = tirar, mantener = editar) e historial.
- **Juegos**: configuraciones por juego (dados de la bandeja, cómo se lee la tirada, tiradas favoritas). Se crean desde plantilla o en blanco, se duplican y se reordenan.
- **Jugadores**: varios jugadores en el mismo dispositivo; se elige quién tira antes de tirar.
- **Sala**: código de 5 letras + QR para que varios dispositivos vean las tiradas de todos en tiempo real.
- Funciona sin conexión (salvo la sala) y se puede instalar como app.

## Desarrollo

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # tests del motor de dados (Vitest)
pnpm build && pnpm start
```

El service worker solo se registra en producción (`pnpm build && pnpm start`).

## Salas multi-dispositivo (Supabase Realtime)

Las salas usan los canales *broadcast* y *presence* de Supabase Realtime. No hace falta crear tablas ni guardar nada en el servidor.

1. Crea un proyecto gratuito en <https://supabase.com>.
2. En *Project Settings → API* copia la **Project URL** y la clave pública **anon**.
3. Crea `.env.local` a partir de `.env.local.example`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

4. Reinicia el servidor. En **Sala** crea una sala y comparte el enlace o el QR.

Para probar desde el móvil en la misma red: `pnpm dev -H 0.0.0.0` y abre `http://<IP-del-ordenador>:3000`. Para instalar la PWA en el móvil necesitas HTTPS (p. ej. desplegar en Vercel con las mismas variables de entorno).

Al entrar en una sala, el dispositivo pide a los demás las últimas 50 tiradas, así que quien llega tarde ve el historial reciente.

## Estructura

- `lib/dice/`: motor de dados puro (tirar, evaluar, notación, estadísticas, plantillas) con tests.
- `lib/store/`: estado con zustand persistido en `localStorage`.
- `lib/room/`: conexión a la sala (Supabase Realtime).
- `components/`: UI (Tailwind v4 + Motion).
- `public/sw.js`: service worker escrito a mano (shell offline + caché de estáticos).
