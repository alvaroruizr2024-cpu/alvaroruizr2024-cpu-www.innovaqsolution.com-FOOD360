import type { CountryCode, MeasureKey, Month } from '../domain/types';
import { COUNTRIES } from '../domain/types';
import type { QualityModel } from '../domain/model';
import { type Cell, type Scope, LEVELS, cellsIn, isNum } from './cube';
import { type Calc, fromPct, none, sec, tr } from './kpi';
import { type Range, dayNum, lastN, mi, monthsBetween } from './period';
import type { Impl } from './kpis/results';

/** Unidades proyecto-mes esperadas: primer mes..min(último mes, corte) de cada proyecto ∩ período. */
export function expectedUnits(s: Scope, r: Range): Array<{ projectId: string; country: CountryCode; month: Month }> {
  const first = new Map<string, Month>(); const last = new Map<string, Month>();
  for (const c of s.cells) { const a = first.get(c.projectId); if (!a || c.month < a) first.set(c.projectId, c.month); const b = last.get(c.projectId); if (!b || c.month > b) last.set(c.projectId, c.month); }
  const out: Array<{ projectId: string; country: CountryCode; month: Month }> = [];
  for (const p of s.projects) {
    const a = p.firstMonth ?? first.get(p.id); if (!a) continue;
    let b = p.lastMonth ?? (p.status === 'closed' ? last.get(p.id) ?? s.cutoff : s.cutoff); if (b > s.cutoff) b = s.cutoff;
    const from = a > r.from ? a : r.from; const to = b < r.to ? b : r.to;
    if (from <= to) for (const m of monthsBetween(from, to)) out.push({ projectId: p.id, country: p.country, month: m });
  }
  return out;
}
const index = (s: Scope, r: Range): Map<string, Cell> => new Map(cellsIn(s, r).map((c) => [`${c.projectId}|${c.month}`, c] as const));
function definedByCountry(s: Scope): Map<CountryCode, Set<MeasureKey>> {
  const m = new Map<CountryCode, Set<MeasureKey>>();
  for (const c of s.cells) { let set = m.get(c.country); if (!set) { set = new Set(); m.set(c.country, set); } for (const k of Object.keys(c.v) as MeasureKey[]) if (c.v[k] !== undefined) set.add(k); }
  return m;
}
const Q01: Calc = (s, r) => {
  const exp = expectedUnits(s, r); const ix = index(s, r); const def = definedByCountry(s);
  const mandatory: MeasureKey[] = ['hh', 'workers', 'lostDays', ...s.cfg.ltiMeasures];
  let num = 0; let den = 0;
  for (const u of exp) for (const k of mandatory) { if (!def.get(u.country)?.has(k)) continue; den++; if (isNum(ix.get(`${u.projectId}|${u.month}`)?.v[k])) num++; }
  return fromPct(num, den, exp.length, { notes: [tr('eng.note.mandatoryFields', { fields: mandatory.join(', ') })] });
};
const Q02: Calc = (s, r) => {
  const exp = expectedUnits(s, r); const ix = index(s, r);
  return fromPct(exp.filter((u) => { const h = ix.get(`${u.projectId}|${u.month}`)?.v.hh; return isNum(h) && h > 0; }).length, exp.length, exp.length);
};
const Q03: Calc = (s, r) => {
  const cells = cellsIn(s, r);
  const dup = cells.filter((c) => c.p && Object.values(c.p).some((p) => p?.q === 'template_duplicate')).length;
  return fromPct(dup, cells.length, cells.length);
};
const Q04: Calc = (s, r) => {
  const ev = s.events.filter((x) => x.month >= r.from && x.month <= r.to && x.e.reportedAt);
  if (!ev.length) return none('nd', 'eng.reason.noReportDates', { status: 'nodata' });
  return fromPct(ev.filter((x) => dayNum(x.e.reportedAt as string) - dayNum(x.e.occurredAt) <= 1).length, ev.length, 1, { notes: [tr('eng.note.reportDeadline')] });
};
export function sourceLags(s: Scope): Array<{ country: CountryCode; last: Month | null; lag: number | null }> {
  return COUNTRIES.filter((c) => s.projects.some((p) => p.country === c)).map((c) => {
    let last: Month | null = null;
    for (const cell of s.cells) if (cell.country === c && isNum(cell.v.hh) && cell.month <= s.cutoff && (last === null || cell.month > last)) last = cell.month;
    return { country: c, last, lag: last === null ? null : mi(s.cutoff) - mi(last) };
  });
}
const Q05: Calc = (s) => {
  const lags = sourceLags(s).filter((l) => l.lag !== null);
  if (!lags.length) return none('nd', 'eng.reason.noData', { status: 'nodata' });
  const worst = Math.max(...lags.map((l) => l.lag as number));
  return { state: worst === 0 ? 'zero' : 'ok', value: worst, numerator: worst, denominator: null, status: worst === 0 ? 'good' : worst < 3 ? 'warn' : 'crit',
    secondary: lags.map((l) => sec(`country.${l.country}`, l.lag, 'months')), notes: [tr('eng.note.freshness', { cutoff: s.cutoff })] };
};
export const QUALITY: Record<string, Impl> = { Q01: { calc: Q01 }, Q02: { calc: Q02 }, Q03: { calc: Q03 }, Q04: { calc: Q04 }, Q05: { calc: Q05, light: true } };

type CovState = QualityModel['coverage'][number]['months'][number]['state'];
const COV: Array<{ key: string; ks: MeasureKey[]; exposure: boolean }> = [
  { key: 'hh', ks: ['hh'], exposure: true }, { key: 'workers', ks: ['workers'], exposure: true }, { key: 'injury', ks: LEVELS.concat(['accNoLostTime']), exposure: false },
  { key: 'lostDays', ks: ['lostDays'], exposure: false }, { key: 'potential', ks: ['hpriLoss', 'hpriNoLoss', 'pg56'], exposure: false },
];
/** Cobertura país × medida clave × últimos 12 meses (siempre los tres países). */
export function coverageMatrix(s: Scope, to: Month): QualityModel['coverage'] {
  const months = monthsBetween(lastN(to, 12).from, to); const def = definedByCountry(s); const out: QualityModel['coverage'] = [];
  for (const country of COUNTRIES) for (const m of COV) {
    const has = s.projects.some((p) => p.country === country); const known = m.ks.filter((k) => def.get(country)?.has(k));
    out.push({ country, measure: tr(`eng.cov.measure.${m.key}`), months: months.map((month) => {
      let state: CovState;
      if (month > s.cutoff) state = 'future';
      else if (!has || !known.length) state = 'na';
      else {
        const cells = (s.byMonth.get(month) ?? []).filter((c) => c.country === country);
        const vals = cells.flatMap((c) => known.map((k) => ({ v: c.v[k], q: c.p?.[k]?.q })));
        if (!cells.length || vals.every((x) => x.v === undefined)) state = 'missing';
        else if (vals.some((x) => x.q === 'error')) state = 'error';
        else if (vals.some((x) => x.v === null)) state = 'not_closed';
        else if (!m.exposure && !cells.some((c) => isNum(c.v.hh) && c.v.hh > 0)) state = 'no_exposure';
        else state = 'ok';
      }
      return { month, state };
    }) });
  }
  return out;
}
