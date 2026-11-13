import type { Month, TextRef } from '../domain/types';
import type { PredictiveGate } from '../domain/model';
import { type Scope, cellsIn, isNum } from './cube';
import { tr } from './kpi';
import { addMonths, mi, monthsBetween, resolveRange } from './period';
import { mean, nbCdf, nbLogPmf, nbQuantile, poissonLogPmf } from './stats';

/** Parámetros publicados de la compuerta predictiva (valores por defecto documentados en docs/METODOLOGIA.md). */
export const PRED = { discount: 0.9, priorShape: 0.5, priorExposure: 0.02, unit: 100000, minTrain: 12, minMonths: 36, minEvents: 30, covLo: 0.7, covHi: 0.9, maxDrift: 0.25, model: 'gamma-poisson-discount', version: '1.0.0', baseline: 'trailing12-rate-poisson' };
export interface Fit { a: number; b: number; hh: number }           // forma, exposición acumulada (unidades de 100.000 HH), HH mensual supuesta
export interface PredResult {
  gate: PredictiveGate; months: Month[]; y: Array<number | null>; hh: Array<number | null>; fit: Fit | null; end: Month;
  mae: number | null; maeBase: number | null; z: number | null; zExpected: number | null;
}
const round = (x: number | null, d = 3): number => (x === null || !Number.isFinite(x) ? 0 : Math.round(x * 10 ** d) / 10 ** d);
function fitUpTo(y: Array<number | null>, hh: Array<number | null>, t: number): Fit | null {
  let a = PRED.priorShape; let b = PRED.priorExposure;
  for (let i = 0; i <= t; i++) { const yi = y[i]; const hi = hh[i]; if (yi === null || hi === null) continue; a = PRED.discount * a + yi; b = PRED.discount * b + hi / PRED.unit; }
  const last = [hh[t], hh[t - 1], hh[t - 2]].filter(isNum);
  const m = mean(last);
  return m === null || !(m > 0) || !(b > 0) ? null : { a, b, hh: m };
}
export const muOf = (f: Fit, h: number, factor = 1): number => (f.a * ((h * f.hh * factor) / PRED.unit)) / f.b;
const cache = new WeakMap<Scope, PredResult>();

export function predictive(s: Scope): PredResult {
  const hit = cache.get(s); if (hit) return hit;
  const sel = resolveRange(s.f).to; const end = sel < s.cutoff ? sel : s.cutoff;
  const tri = s.cfg.triMeasures;
  const first = s.cells.reduce<Month | null>((m, c) => (isNum(c.v.hh) && (m === null || c.month < m) ? c.month : m), null);
  const months = first && first <= end ? monthsBetween(first, end) : [];
  const y: Array<number | null> = []; const hh: Array<number | null> = []; let unclosed = false;
  months.forEach((m, i) => {
    let n = 0; let h = 0; let used = 0;
    for (const c of cellsIn(s, { from: m, to: m })) {
      if (!isNum(c.v.hh)) continue;
      const vals = tri.map((k) => c.v[k]);
      if (vals.some((v) => v === undefined)) continue;                  // el perfil TRI no existe en esa fuente
      if (vals.some((v) => v === null)) { if (i >= months.length - 3 && c.v.hh > 0) unclosed = true; continue; }
      n += (vals as number[]).reduce((p, q) => p + q, 0); h += c.v.hh; used++;
    }
    y.push(used ? n : null); hh.push(used ? h : null);
  });
  const nMonths = y.filter((v) => v !== null).length; const nEvents = y.reduce<number>((t, v) => t + (v ?? 0), 0);
  // evaluación de origen móvil, sin información posterior al corte de cada origen
  let ls = 0; let lsB = 0; let cov = 0; let n = 0; let ae = 0; let aeB = 0;
  for (const h of [1, 2, 3]) for (let t = PRED.minTrain - 1; t + h < months.length; t++) {
    const fit = fitUpTo(y, hh, t); if (!fit) continue;
    let actual = 0; let ok = true;
    for (let j = 1; j <= h; j++) { const v = y[t + j]; if (v === null) ok = false; else actual += v; }
    if (!ok) continue;
    let y12 = 0; let h12 = 0;
    for (let j = Math.max(0, t - 11); j <= t; j++) { const yv = y[j]; const hv = hh[j]; if (yv !== null && hv !== null) { y12 += yv; h12 += hv; } }
    if (!(h12 > 0)) continue;
    const mu = muOf(fit, h); const lam = ((y12 + 0.5) / h12) * h * fit.hh;
    ls += nbLogPmf(actual, fit.a, mu); lsB += poissonLogPmf(actual, lam);
    const u = (actual > 0 ? nbCdf(actual - 1, fit.a, mu) : 0) + 0.5 * Math.exp(nbLogPmf(actual, fit.a, mu));   // PIT medio (corrige la discreción)
    if (u >= 0.1 && u <= 0.9) cov++;
    ae += Math.abs(actual - mu); aeB += Math.abs(actual - lam); n++;
  }
  const cand = n ? ls / n : null; const base = n ? lsB / n : null; const coverage = n ? cov / n : null;
  // deriva de alcance: peso en HH de los proyectos que empezaron o terminaron en los últimos 12 meses
  const win = { from: addMonths(end, -11), to: end }; const span = new Map<string, { a: Month; b: Month; h: number }>();
  for (const c of s.cells) {
    if (!isNum(c.v.hh) || c.v.hh <= 0 || c.month > end) continue;
    const p = span.get(c.projectId) ?? { a: c.month, b: c.month, h: 0 };
    if (c.month < p.a) p.a = c.month; if (c.month > p.b) p.b = c.month; if (c.month >= win.from) p.h += c.v.hh;
    span.set(c.projectId, p);
  }
  let tot = 0; let moved = 0;
  for (const p of span.values()) { tot += p.h; if ((p.a > win.from && first !== null && p.a > first) || p.b < end) moved += p.h; }
  const drift = tot > 0 ? moved / tot : 0;
  const reasons: TextRef[] = [];
  if (nMonths < PRED.minMonths) reasons.push(tr('eng.pred.reason.months', { n: nMonths, min: PRED.minMonths }));
  if (nEvents < PRED.minEvents) reasons.push(tr('eng.pred.reason.events', { n: nEvents, min: PRED.minEvents }));
  if (cand === null || base === null) reasons.push(tr('eng.pred.reason.noEvaluation'));
  else if (cand < base) reasons.push(tr('eng.pred.reason.score', { cand: round(cand), base: round(base) }));
  if (coverage !== null && (coverage < PRED.covLo || coverage > PRED.covHi)) reasons.push(tr('eng.pred.reason.coverage', { cov: round(coverage * 100, 1) }));
  if (drift > PRED.maxDrift) reasons.push(tr('eng.pred.reason.drift', { share: round(drift * 100, 1) }));
  if (unclosed) reasons.push(tr('eng.pred.reason.unclosed'));
  const isDemo = s.ds.kind === 'demo';
  if (!isDemo && !s.cfg.predictiveApproved) reasons.push(tr('eng.pred.reason.notApproved'));
  const enabled = reasons.length === 0;
  const fit = months.length ? fitUpTo(y, hh, months.length - 1) : null;
  const validation: PredictiveGate['validation'] = months.length ? {
    model: PRED.model, version: PRED.version, trainedAt: s.ds.createdAt, window: { from: months[0], to: end }, horizons: [30, 60, 90],
    sample: { months: nMonths, events: nEvents }, baselineName: PRED.baseline, baselineScore: base, candidateScore: cand, intervalCoverage: coverage,
    calibration: n ? tr('eng.pred.calibration', { n, mae: round(ae / n, 2), maeBase: round(aeB / n, 2) }) : null, lastValidatedAt: s.ds.createdAt,
  } : null;
  let outputs: PredictiveGate['outputs'] = null;
  if (enabled && fit) {
    const hs: Array<[30 | 60 | 90, number]> = [[30, 1], [60, 2], [90, 3]];
    outputs = {
      expected: hs.map(([d, h]) => { const mu = muOf(fit, h); return { horizonDays: d, expected: mu, lo: nbQuantile(0.1, fit.a, mu), hi: nbQuantile(0.9, fit.a, mu) }; }),
      probability: hs.map(([d, h]) => ({ horizonDays: d, p: 1 - Math.exp(nbLogPmf(0, fit.a, muOf(fit, h))) })),
      futureRate: { value: (muOf(fit, 3) * s.cfg.rateConstant) / (3 * fit.hh), hhAssumed: 3 * fit.hh, assumption: tr('eng.pred.hhAssumption', { hh: Math.round(fit.hh) }) },
    };
  }
  // D04: residuo estandarizado del último mes frente a la tasa de los 12 meses previos (descriptivo, sin compuerta)
  let z: number | null = null; let zExpected: number | null = null; const L = months.length - 1;
  if (L >= 6 && y[L] !== null && hh[L] !== null) {
    let y12 = 0; let h12 = 0;
    for (let j = Math.max(0, L - 12); j < L; j++) { const yv = y[j]; const hv = hh[j]; if (yv !== null && hv !== null) { y12 += yv; h12 += hv; } }
    if (h12 > 0 && y12 > 0) { zExpected = (y12 / h12) * (hh[L] as number); z = ((y[L] as number) - zExpected) / Math.sqrt(zExpected); }
  }
  const res: PredResult = { gate: { enabled, isSimulation: enabled && isDemo, reasons, validation, outputs }, months, y, hh, fit: enabled ? fit : null, end, mae: n ? ae / n : null, maeBase: n ? aeB / n : null, z, zExpected };
  cache.set(s, res);
  return res;
}
export const monthsAhead = (end: Month, n: number): Month[] => Array.from({ length: n }, (_, i) => addMonths(end, i + 1));
export const monthGap = (a: Month, b: Month): number => mi(b) - mi(a);
