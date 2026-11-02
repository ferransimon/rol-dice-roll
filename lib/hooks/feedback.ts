"use client";

let ctx: AudioContext | null = null;

/** Pequeño "clac-clac" de dados sintetizado (sin ficheros de audio). */
export function playDiceSound(count = 2) {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const hits = Math.min(6, Math.max(2, count + 1));
    const now = ctx.currentTime;
    for (let i = 0; i < hits; i++) {
      const t = now + i * (0.045 + Math.random() * 0.05);
      const len = 0.05;
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < data.length; j++) data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / data.length, 4);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1800 + Math.random() * 1600;
      filter.Q.value = 4;
      const gain = ctx.createGain();
      gain.gain.value = 0.35 * (1 - i / (hits + 1));
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start(t);
    }
  } catch {
    // Audio no disponible: no pasa nada.
  }
}

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // ignore
  }
}
