/** Utilidades estadísticas puras (sin dependencias). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const LG = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
export function lgamma(x: number): number {
  let y = x; let tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += LG[j] / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}
/** Gamma incompleta regularizada inferior P(a, x). */
export function gammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let ap = a; let sum = 1 / a; let del = sum;
    for (let n = 0; n < 500; n++) { ap += 1; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-14) break; }
    return sum * Math.exp(-x + a * Math.log(x) - lgamma(a));
  }
  let b = x + 1 - a; let c = 1e300; let d = 1 / b; let h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a); b += 2;
    d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
}
/** Cuantil de Gamma(a, 1) por bisección. */
export function gammaQuantile(a: number, p: number): number {
  let lo = 0; let hi = Math.max(10, a + 10 * Math.sqrt(a) + 30);
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (gammaP(a, mid) < p) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
/** Intervalo exacto de Poisson (Garwood) para un conteo k: [inferior, superior] sobre el conteo esperado. */
export function poissonCI(k: number, conf = 0.95): [number, number] {
  const a = (1 - conf) / 2;
  return [k <= 0 ? 0 : gammaQuantile(k, a), gammaQuantile(k + 1, 1 - a)];
}
/** IC de una tasa = conteo·const/exposición; null si no hay exposición o el conteo no es entero no negativo. */
export function rateCI(k: number, exposure: number, constant: number): [number, number] | null {
  if (!(exposure > 0) || k < 0 || !Number.isFinite(k)) return null;
  const [lo, hi] = poissonCI(Math.round(k));
  return [(lo * constant) / exposure, (hi * constant) / exposure];
}
export function quantile(xs: number[], q: number): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b); const pos = (s.length - 1) * q; const i = Math.floor(pos); const fr = pos - i;
  return i + 1 < s.length ? s[i] + fr * (s[i + 1] - s[i]) : s[i];
}
export const median = (xs: number[]): number | null => quantile(xs, 0.5);
export const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const poissonLogPmf = (k: number, lambda: number): number => (lambda <= 0 ? (k === 0 ? 0 : -Infinity) : k * Math.log(lambda) - lambda - lgamma(k + 1));
/** Binomial negativa (gamma-Poisson): forma r, media mu. */
export function nbLogPmf(k: number, r: number, mu: number): number {
  if (mu <= 0) return k === 0 ? 0 : -Infinity;
  const p = r / (r + mu);
  return lgamma(k + r) - lgamma(r) - lgamma(k + 1) + r * Math.log(p) + k * Math.log(1 - p);
}
export function nbCdf(k: number, r: number, mu: number): number {
  let s = 0; for (let i = 0; i <= k; i++) s += Math.exp(nbLogPmf(i, r, mu));
  return Math.min(1, s);
}
export function nbQuantile(q: number, r: number, mu: number): number {
  let s = 0;
  for (let k = 0; k < 100000; k++) { s += Math.exp(nbLogPmf(k, r, mu)); if (s >= q) return k; }
  return Math.round(mu);
}
