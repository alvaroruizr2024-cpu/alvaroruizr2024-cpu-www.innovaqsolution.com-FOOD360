import type { CellRef, CountryCode, MeasureKey, Priority, Project, TextRef } from '../domain/types';
import type { NextStep, Signal } from '../domain/model';
import { type Cell, type Scope, LEVELS, agg, cellsIn, countryScope, isNum, restrict, scopeCountries, targetFor } from './cube';
import { tr } from './kpi';
import { activeFailures, asOfR, dueVerifs, isDone, overdueAt, planSplit, delayDays } from './kpis/records';
import { statsIn } from './kpis/programs';
import { type Range, addMonths, lastN, r12, resolveRange } from './period';
import { sourceLags } from './quality';

/** Umbrales por defecto documentados (docs/METODOLOGIA.md); configurables por versión. */
export const TH = { critFactor: 2, rampPct: 50, rampMinHH: 5000, ssomaDrop: 10, verifCoverage: 90, planToDate: 85, surveillance: 95 };
export const DUE: Record<Priority, number> = { critical: 7, high: 15, medium: 30, low: 60 };
const ORDER: Priority[] = ['critical', 'high', 'medium', 'low'];
const n2 = (x: number): number => Math.round(x * 100) / 100;
export function cellRef(c: Cell, k: MeasureKey): CellRef | null {
  const p = c.p?.[k]; if (!p) return null;
  const i = p.c.lastIndexOf('!');
  return { file: c.file ?? '', sheet: i >= 0 ? p.c.slice(0, i) : '', cell: i >= 0 ? p.c.slice(i + 1) : p.c, formula: p.f ?? null };
}
const cache = new WeakMap<Scope, Signal[]>();
export function buildSignals(s: Scope): Signal[] {
  const hit = cache.get(s); if (hit) return hit;
  const sel = resolveRange(s.f); const end = sel.to < s.cutoff ? sel.to : s.cutoff;
  const out: Signal[] = []; const isDemo = s.ds.kind === 'demo';
  const mk = (ruleId: string, priority: Priority, kind: Signal['kind'], role: string, p: Project | null, country: CountryCode | null, params: Record<string, string | number>, evidence: Signal['evidence']): void => {
    out.push({ id: `${ruleId}:${p ? p.id : country ?? 'ALL'}`, ruleId, priority, kind, title: tr(`eng.sig.${ruleId}.title`), whatChanged: tr(`eng.sig.${ruleId}.what`, params), evidence,
      scope: { country: p ? p.country : country, projectId: p ? p.id : null, projectName: p ? p.name : null }, ownerRole: tr(`eng.role.${role}`), dueInDays: DUE[priority], recommendation: tr(`eng.sig.${ruleId}.rec`), isDemo });
  };
  const ev = (key: string, params?: Record<string, string | number>, ref: CellRef | null = null): Signal['evidence'][number] => ({ text: tr(key, params), ref });
  const w12 = r12(end); const w3 = lastN(end, 3); const K = s.cfg.rateConstant;
  // 1) tasas de 12 meses sobre la meta, con exposición suficiente
  const rateRule = (sc: Scope, p: Project | null, country: CountryCode | null): void => {
    for (const [rule, ks, ind] of [['ltifr12', s.cfg.ltiMeasures, 'IF'], ['trifr12', s.cfg.triMeasures, 'TRIFR']] as const) {
      const a = agg(sc, w12, ks, 'hh', true); const t = targetFor(sc, ind, end);
      if (!t || a.used === 0 || a.den < s.cfg.smallExposureHH) continue;
      const v = (a.num * K) / a.den;
      if (v > t.value) mk(rule, v > TH.critFactor * t.value ? 'critical' : 'high', 'safety', 'sst', p, country, { value: n2(v), target: n2(t.value) },
        [ev('eng.ev.rate12', { value: n2(v), target: n2(t.value), n: a.num, hh: Math.round(a.den), from: w12.from, to: w12.to })]);
    }
  };
  if (s.projects.length > 1) for (const c of scopeCountries(s)) rateRule(countryScope(s, c), null, c);
  for (const p of s.projects) {
    const ps = restrict(s, (x) => x.id === p.id);
    rateRule(ps, p, null);
    const cells = cellsIn(ps, w3);
    // 2) accidentes registrables en cada uno de los últimos 3 meses
    const tri = cells.map((c) => { const v = s.cfg.triMeasures.map((k) => c.v[k]); return v.every(isNum) ? (v as number[]).reduce((x, y) => x + y, 0) : null; });
    if (cells.length === 3 && tri.every((x) => x !== null && x >= 1)) mk('streak3', 'high', 'safety', 'sst', p, null, { n: tri.reduce<number>((x, y) => x + (y ?? 0), 0) },
      cells.map((c, i) => ev('eng.ev.monthCount', { month: c.month, n: tri[i] ?? 0 }, cellRef(c, s.cfg.triMeasures[1] ?? s.cfg.triMeasures[0]))));
    // 3) evento de alto potencial en los últimos 3 meses
    const hip = cells.flatMap((c) => (['hpriLoss', 'hpriNoLoss', 'pg56'] as MeasureKey[]).filter((k) => (c.v.hpriLoss !== undefined || c.v.hpriNoLoss !== undefined ? k !== 'pg56' : k === 'pg56') && isNum(c.v[k]) && (c.v[k] as number) > 0).map((k) => ({ c, k, n: c.v[k] as number })));
    if (hip.length) mk('hipo3', 'high', 'safety', 'sst', p, null, { n: hip.reduce((t, h) => t + h.n, 0) }, hip.slice(0, 4).map((h) => ev('eng.ev.hipo', { month: h.c.month, n: h.n, field: h.k }, cellRef(h.c, h.k))));
    // 4) crecimiento de HH > 50 % en 3 meses
    const now = ps.byMonth.get(end)?.[0]; const then = ps.byMonth.get(addMonths(end, -3))?.[0];
    if (now && then && isNum(now.v.hh) && isNum(then.v.hh) && then.v.hh > 0 && now.v.hh >= TH.rampMinHH) {
      const g = (100 * (now.v.hh - then.v.hh)) / then.v.hh;
      if (g > TH.rampPct) mk('hhRamp', 'medium', 'exposure', 'operations', p, null, { pct: n2(g) }, [ev('eng.ev.hh', { month: then.month, hh: Math.round(then.v.hh) }, cellRef(then, 'hh')), ev('eng.ev.hh', { month: now.month, hh: Math.round(now.v.hh) }, cellRef(now, 'hh'))]);
    }
    // 5) caída del puntaje SSOMA frente a la media de los 3 meses previos
    const prev = cellsIn(ps, { from: addMonths(end, -3), to: addMonths(end, -1) }).map((c) => c.v.ssomaScore).filter(isNum);
    if (now && isNum(now.v.ssomaScore) && prev.length === 3) {
      const m = prev.reduce((x, y) => x + y, 0) / 3;
      if (m - now.v.ssomaScore >= TH.ssomaDrop) mk('ssomaDrop', 'medium', 'safety', 'sst', p, null, { drop: n2(m - now.v.ssomaScore) }, [ev('eng.ev.ssoma', { month: end, value: n2(now.v.ssomaScore), mean: n2(m) }, cellRef(now, 'ssomaScore'))]);
    }
  }
  // 6) datos: numeradores sin cierre, dotación ausente, conciliación material, fuente atrasada
  for (const c of scopeCountries(s)) {
    const cells = cellsIn(countryScope(s, c), w3).filter((x) => isNum(x.v.hh) && x.v.hh > 0);
    const open = cells.filter((x) => LEVELS.concat(['accNoLostTime']).some((k) => x.v[k] === null));
    if (open.length) mk('notClosed', 'high', 'data', 'data', null, c, { n: open.length, months: [...new Set(open.map((x) => x.month))].join(', ') }, open.slice(0, 3).map((x) => ev('eng.ev.notClosed', { month: x.month }, cellRef(x, 'accLti'))));
    const noW = cells.filter((x) => !isNum(x.v.workers));
    if (noW.length) mk('noHeadcount', 'medium', 'data', 'data', null, c, { n: noW.length }, noW.slice(0, 3).map((x) => ev('eng.ev.noHeadcount', { month: x.month }, cellRef(x, 'workers'))));
    const mat = s.ds.reconciliation.filter((i) => i.severity === 'material' && (i.country === c || (i.projectId !== null && s.proj.get(i.projectId)?.country === c)));
    if (mat.length) mk('reconMaterial', 'high', 'data', 'data', null, c, { n: mat.length }, mat.slice(0, 3).map((i) => ({ text: { key: i.issueKey, params: i.params }, ref: i.refs[0] ?? null })));
  }
  for (const l of sourceLags(s)) if (l.lag !== null && l.lag > 0) mk('sourceLag', 'medium', 'data', 'data', null, l.country, { lag: l.lag, last: l.last ?? '' }, [ev('eng.ev.sourceLag', { last: l.last ?? '', cutoff: s.cutoff })]);
  // 7) registros operativos
  const cut = asOfR(s, sel);
  if (s.verifications.length) {
    for (const c of activeFailures(s, cut)) mk('criticalFailure', 'critical', 'control', 'sst', s.proj.get(c.projectId) ?? null, null, { control: c.id }, [ev('eng.ev.control', { control: c.id, risk: c.risk })]);
    const due = dueVerifs(s, sel); const done = due.filter((v) => isDone(v, cut)).length;
    if (due.length && (100 * done) / due.length < TH.verifCoverage) mk('verifCoverage', 'high', 'control', 'sst', null, null, { pct: n2((100 * done) / due.length), min: TH.verifCoverage }, [ev('eng.ev.ratio', { num: done, den: due.length })]);
  }
  if (s.actions.length) {
    const crit = overdueAt(s, cut).filter((a) => a.priority === 'critical');
    if (crit.length) mk('actionsOverdue', 'critical', 'action', 'sst', null, null, { n: crit.length }, crit.slice(0, 3).map((a) => ev('eng.ev.action', { id: a.id, days: delayDays(a, cut), due: a.originalDue })));
  }
  if (s.plan.length) {
    const sp = planSplit(s, sel);
    if (sp.due.length && (100 * sp.done.length) / sp.due.length < TH.planToDate) mk('planToDate', 'medium', 'plan', 'program', null, null, { pct: n2((100 * sp.done.length) / sp.due.length), min: TH.planToDate }, [ev('eng.ev.ratio', { num: sp.done.length, den: sp.due.length })]);
  }
  const hs = statsIn(s, sel, 'health_surveillance').filter((x) => isNum(x.done) && isNum(x.eligible));
  const el = hs.reduce((t, x) => t + (x.eligible as number), 0); const dn = hs.reduce((t, x) => t + (x.done as number), 0);
  if (el > 0 && (100 * dn) / el < TH.surveillance) mk('surveillance', 'medium', 'health', 'health', null, null, { pct: n2((100 * dn) / el), min: TH.surveillance }, [ev('eng.ev.ratio', { num: dn, den: el })]);
  out.sort((a, b) => ORDER.indexOf(a.priority) - ORDER.indexOf(b.priority) || a.id.localeCompare(b.id));
  cache.set(s, out);
  return out;
}
export const signalCounts = (sig: Signal[]): Record<Priority, number> => ({ critical: sig.filter((x) => x.priority === 'critical').length, high: sig.filter((x) => x.priority === 'high').length, medium: sig.filter((x) => x.priority === 'medium').length, low: sig.filter((x) => x.priority === 'low').length });

const MODULE_STEPS = ['controls', 'plan', 'actions', 'health', 'hygiene', 'cases', 'training', 'programs', 'projectsGeo'] as const;
/** Próximos pasos: de acciones reales si existen; si no, de vacíos de datos, módulos pendientes y conciliación material. */
export function nextSteps(s: Scope, r: Range): NextStep[] {
  const out: NextStep[] = []; const sig = buildSignals(s);
  if (s.actions.length) {
    const cut = asOfR(s, r);
    for (const a of overdueAt(s, cut).sort((x, y) => ORDER.indexOf(x.priority) - ORDER.indexOf(y.priority) || delayDays(y, cut) - delayDays(x, cut)).slice(0, 4))
      out.push({ id: `act:${a.id}`, text: tr('eng.next.action', { id: a.id, days: delayDays(a, cut) }), evidence: tr('eng.ev.action', { id: a.id, days: delayDays(a, cut), due: a.originalDue }), ownerRole: tr('eng.role.sst'), dueInDays: DUE[a.priority], source: 'action' });
    for (const g of sig.filter((x) => x.kind !== 'data' && x.kind !== 'action').slice(0, 3)) out.push({ id: `sig:${g.id}`, text: g.recommendation, evidence: g.whatChanged, ownerRole: g.ownerRole, dueInDays: g.dueInDays, source: 'signal' });
    return out;
  }
  for (const g of sig.filter((x) => x.kind === 'data' && x.ruleId !== 'reconMaterial').slice(0, 4)) out.push({ id: `dq:${g.id}`, text: g.recommendation, evidence: g.whatChanged, ownerRole: g.ownerRole, dueInDays: g.dueInDays, source: 'data_quality' });
  const mat = s.ds.reconciliation.filter((i) => i.severity === 'material');
  if (mat.length) out.push({ id: 'recon:material', text: tr('eng.next.recon', { n: mat.length }), evidence: { key: mat[0].issueKey, params: mat[0].params } as TextRef, ownerRole: tr('eng.role.data'), dueInDays: DUE.high, source: 'reconciliation' });
  for (const m of MODULE_STEPS) if (s.ds.modules[m]?.state === 'pending') out.push({ id: `mod:${m}`, text: tr(`eng.next.module.${m}`), evidence: tr(s.ds.modules[m].reasonKey), ownerRole: tr(m === 'health' || m === 'hygiene' ? 'eng.role.health' : m === 'plan' || m === 'training' || m === 'programs' ? 'eng.role.program' : m === 'projectsGeo' ? 'eng.role.data' : 'eng.role.sst'), dueInDays: DUE.medium, source: 'module' });
  return out;
}
