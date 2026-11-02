type Rng = (n: number) => number;

const MAX = 0x1_0000_0000;

/** Entero uniforme en [1, n] usando crypto, sin sesgo de módulo. */
const cryptoRng: Rng = (n) => {
  if (n <= 1) return 1;
  const limit = MAX - (MAX % n);
  const buf = new Uint32Array(1);
  let x: number;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return (x % n) + 1;
};

let current: Rng = cryptoRng;

export function randInt(n: number): number {
  return current(n);
}

/** Solo para tests: sustituye el generador. Llamar sin argumentos restaura crypto. */
export function setRng(rng?: Rng) {
  current = rng ?? cryptoRng;
}
