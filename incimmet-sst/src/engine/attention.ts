import type { Dataset } from '../domain/types';
import type { Filters, ProjectRow } from '../domain/model';
import { type Scope, agg, buildScope, cellsIn, isNum, restrict, targetFor } from './cube';
import { type Range, addMonths, lastN, r12, resolveRange } from './period';
import { expectedUnits } from './quality';
import { rateCI } from './stats';
import { statusFor } from './status';

/** «Puntaje de atención» 0–100 (nunca %): variables y pesos publicados. */
export const ATTENTION_WEIGHTS = { ltifr: 30, trifr: 20, hipo: 20, ramp: 10, gaps: 10, ssoma: 10 } as const;
type VarKey = keyof typeof ATTENTION_WEIGHTS;
export interface Attention { score: number | null; missing: VarKey[]; vars: Partial<Record<VarKey, number>> }
const cache = new WeakMap<Dataset, Map<string, Map<string, Attention>>>();

function rawVars(ps: Scope, end: string): Partial<Record<VarKey, number>> {
  const out: Partial<Record<VarKey, number>> = {}; const K = ps.cfg.rateConstant; const w = r12(end);
  for (const [k, ks, ind] of [['ltifr', ps.cfg.ltiMeasures, 'IF'], ['trifr', ps.cfg.triMeasures, 'TRIFR']] as const) {
    const a = agg(ps, w, ks, 'hh', true);
    if (a.used && a.den > 0) { const v = (a.num * K) / a.den; const t = targetFor(ps, ind, end); out[k] = t && t.value > 0 ? v / t.value : v; }
  }
  let hip = 0; let hipSeen = false;
  for (const c of cellsIn(ps, lastN(end, 3))) {
    const ks = c.v.hpriLoss !== undefined || c.v.hpriNoLoss !== undefined ? (['hpriLoss', 'hpriNoLoss'] as const) : (['pg56'] as const);
    for (const k of ks) if (isNum(c.v[k])) { hip += c.v[k] as number; hipSeen = true; }
  }
  if (hipSeen) out.hipo = hip;
  const now = ps.byMonth.get(end)?.[0]?.v.hh; const then = ps.byMonth.get(addMonths(end, -3))?.[0]?.v.hh;
  if (isNum(now) && isNum(then) && then > 0) out.ramp = Math.max(0, (now - then) / then);
  const exp = expectedUnits(ps, w);
  if (exp.length) {
    const ok = new Set(cellsIn(ps, w).filter((c) => isNum(c.v.hh) && ps.cfg.ltiMeasures.every((k) => c.v[k] !== null)).map((c) => c.month));
    out.gaps = exp.filter((u) => !ok.has(u.month)).length / exp.length;
  }
  const ss = cellsIn(ps, lastN(end, 3)).map((c) => c.v.ssomaScore).filter(isNum);
  if (ss.length) out.ssoma = 100 - ss[ss.length - 1];
  return out;
}
/** Normalización mín–máx sobre TODOS los proyectos del conjunto (no cambia al filtrar); variables ausentes → se reponderan y se declaran. */
export function attentionScores(ds: Dataset, f: Filters, end: string): Map<string, Attention> {
  const key = JSON.stringify([end, f.companies, f.shifts, f.activities, f.risks, f.severities, f.eventTypes, f.bodyPart, f.mechanism]);
  let byKey = cache.get(ds); if (!byKey) { byKey = new Map(); cache.set(ds, byKey); }
  const hit = byKey.get(key); if (hit) return hit;
  const full = buildScope(ds, { ...f, countries: [], projectIds: [] });
  const raw = new Map(full.projects.map((p) => [p.id, rawVars(restrict(full, (x) => x.id === p.id), end)] as const));
  const keys = Object.keys(ATTENTION_WEIGHTS) as VarKey[]; const range = new Map<VarKey, [number, number]>();
  for (const k of keys) { const xs = [...raw.values()].map((v) => v[k]).filter(isNum); if (xs.length) range.set(k, [Math.min(...xs), Math.max(...xs)]); }
  const out = new Map<string, Attention>();
  for (const [id, vars] of raw) {
    let num = 0; let den = 0; const missing: VarKey[] = [];
    for (const k of keys) {
      const v = vars[k]; const rg = range.get(k);
      if (!isNum(v) || !rg) { missing.push(k); continue; }
      num += ATTENTION_WEIGHTS[k] * (rg[1] > rg[0] ? (v - rg[0]) / (rg[1] - rg[0]) : 0); den += ATTENTION_WEIGHTS[k];
    }
    out.set(id, { score: den > 0 ? (100 * num) / den : null, missing, vars });
  }
  byKey.set(key, out);
  return out;
}
export function projectRows(s: Scope, r: Range): ProjectRow[] {
  const sel = resolveRange(s.f).to; const end = sel < s.cutoff ? sel : s.cutoff;
  const att = attentionScores(s.ds, s.f, end); const K = s.cfg.rateConstant; const one = s.f.projectIds.length > 0;
  return s.projects.map((p) => {
    const ps = restrict(s, (x) => x.id === p.id);
    const cnt = (ks: Parameters<typeof agg>[2], strict = false): number | null => { const a = agg(ps, r, ks, null, strict); return a.used ? a.num : null; };
    const hh = cnt(['hh']);
    const wm = new Map<string, number>(); for (const c of cellsIn(ps, r)) if (isNum(c.v.workers)) wm.set(c.month, (wm.get(c.month) ?? 0) + c.v.workers);
    const workers = wm.size ? [...wm.values()].reduce((a, b) => a + b, 0) / wm.size : null;
    const l = agg(ps, r, s.cfg.ltiMeasures, 'hh', true); const t = agg(ps, r, s.cfg.triMeasures, 'hh', true);
    const ltifr = l.used && l.den > 0 ? (l.num * K) / l.den : null; const trifr = t.used && t.den > 0 ? (t.num * K) / t.den : null;
    const hp = cnt(['hpriLoss', 'hpriNoLoss']); const ss = cellsIn(ps, r).map((c) => c.v.ssomaScore).filter(isNum);
    const tg = targetFor(ps, 'IF', r.to);
    return {
      projectId: p.id, name: p.name, country: p.country, status: p.status, isDemo: p.isDemo, hasCoords: p.coords !== null,
      state: hh === null ? 'nd' : ltifr === null ? 'nd' : ltifr === 0 ? 'zero' : 'ok',
      hh, workers, fatal: cnt(['accFatal']), lti: cnt(s.cfg.ltiMeasures, true), tri: cnt(s.cfg.triMeasures, true), hipo: hp ?? cnt(['pg56']), lostDays: cnt(['lostDays']),
      ltifr, ltifrCI: ltifr === null ? null : rateCI(l.num, l.den, K), trifr, trifrCI: trifr === null ? null : rateCI(t.num, t.den, K),
      ssoma: ss.length ? ss[ss.length - 1] : null, attention: att.get(p.id)?.score ?? null,
      statusLevel: hh === null ? 'nodata' : !(hh > 0) ? 'noexposure' : ltifr === null ? 'nodata' : statusFor(ltifr, tg ? tg.value : null, 'down', s.cfg.warnBand),
      smallExposure: hh !== null && hh < s.cfg.smallExposureHH, selected: one && s.f.projectIds.includes(p.id),
    };
  });
}
