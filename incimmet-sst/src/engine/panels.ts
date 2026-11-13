import type { Dataset, MeasureKey, VerificationRecord } from '../domain/types';
import type { ActionsPanelModel, HealthPanelModel, KpiValue, PlanCell, PlanPanelModel, RiskCell, RiskPanelModel, SeriesPoint, StatusLevel } from '../domain/model';
import { nextSteps, TH } from './alerts';
import { type Scope, LEVELS, POTENTIAL, agg, isNum } from './cube';
import { DEF } from './defs';
import { evalKpi, tr } from './kpi';
import { statsIn } from './kpis/programs';
import { activeFailures, asOfR, delayDays, dueVerifs, isDone, isValid, openAt, overdueAt, planSplit } from './kpis/records';
import { type Range, dayNum, lastN, monthOf, monthsBetween } from './period';
import { median, quantile } from './stats';

export interface Ctx { ds: Dataset; s: Scope; r: Range; kv: (id: string) => KpiValue }

export function riskPanel(c: Ctx): RiskPanelModel {
  const { s, r } = c; const cut = asOfR(s, r); const ctrl = new Map(s.controls.map((x) => [x.id, x] as const));
  const groups = new Map<string, VerificationRecord[]>();
  for (const v of dueVerifs(s, r)) { const k = ctrl.get(v.controlId); if (!k) continue; const key = `${k.risk}|${k.projectId}`; const a = groups.get(key); if (a) a.push(v); else groups.set(key, [v]); }
  const fails = activeFailures(s, cut); const cells: RiskCell[] = [];
  const pairs = new Set(s.controls.map((x) => `${x.risk}|${x.projectId}`));
  for (const key of pairs) {
    const [risk, projectId] = key.split('|'); const vs = groups.get(key) ?? [];
    const done = vs.filter((v) => isDone(v, cut)); const valid = done.filter(isValid); const conform = valid.filter((v) => v.result === 'conform' && v.hasEvidence).length;
    const af = fails.filter((f) => f.risk === risk && f.projectId === projectId).length;
    const cov = vs.length ? (100 * done.length) / vs.length : null; const eff = valid.length ? (100 * conform) / valid.length : null;
    const status: StatusLevel = af > 0 ? 'crit' : cov === null ? 'nodata' : cov < TH.verifCoverage || (eff !== null && eff < 90) ? 'warn' : 'good';
    cells.push({ risk, projectId, due: vs.length, done: done.length, conform, activeFailures: af, coveragePct: cov, effectivenessPct: eff, status });
  }
  const pids = [...new Set(s.controls.map((x) => x.projectId))];
  return {
    availability: c.ds.modules.controls, risks: [...new Set(s.controls.map((x) => x.risk))].sort().map((k) => ({ key: k, label: tr(`eng.risk.${k}`) })),
    projects: pids.map((id) => ({ id, name: s.proj.get(id)?.name ?? id })), cells, coverage: c.kv('P03'), effectiveness: c.kv('P04'), activeFailures: c.kv('P05'),
  };
}

export function planPanel(c: Ctx): PlanPanelModel {
  const { s, r } = c; const sp = planSplit(s, r); const y = r.to.slice(0, 4); const months = monthsBetween(`${y}-01`, `${y}-12`); const cutMonth = monthOf(sp.cut);
  const programs = [...new Set(s.plan.map((a) => a.program))].sort(); const cells: PlanCell[] = [];
  const ok = (a: (typeof sp.year)[number]): boolean => !!a.doneAt && a.doneAt <= sp.cut && !!a.acceptedAt && a.acceptedAt <= sp.cut;
  for (const program of programs) for (const month of months) {
    const acts = sp.year.filter((a) => a.program === program && monthOf(a.baselineDue) === month); const done = acts.filter(ok).length;
    const state: PlanCell['state'] = !acts.length ? 'na' : month > cutMonth ? 'future' : done < acts.length ? 'late' : 'ok';
    cells.push({ program, month, due: acts.length, done, pct: acts.length && state !== 'future' ? (100 * done) / acts.length : null, state });
  }
  const tm = monthsBetween(lastN(r.to, 12).from, r.to);
  const monthly: SeriesPoint[] = tm.map((month) => {
    const rows = statsIn(s, { from: month, to: month }, 'training').filter((p) => isNum(p.hours));
    if (rows.length) return { month, value: rows.reduce((t, p) => t + (p.hours as number), 0) };
    const a = agg(s, { from: month, to: month }, ['trainingHours'], null, false);
    return { month, value: a.used ? a.num : null };
  });
  return {
    availability: c.ds.modules.plan, programs: programs.map((k) => ({ key: k, label: tr(`eng.plan.${k}`) })), months, cells,
    toDate: c.kv('O12'), annual: c.kv('O13'), weighted: c.kv('O14'),
    byProgram: programs.map((program) => { const due = sp.due.filter((a) => a.program === program); const done = sp.done.filter((a) => a.program === program).length; return { program, due: due.length, done, pct: due.length ? (100 * done) / due.length : null }; }),
    training: { availability: c.ds.modules.training, hours: c.kv('P17'), intensity: c.kv('P18'), monthly },
  };
}

const BACK = new Set(['back']); const FRONT = new Set(['eyes', 'chest', 'abdomen', 'knee_l', 'knee_r']);
export function healthPanel(c: Ctx): HealthPanelModel {
  const { s, r } = c; const body = new Map<string, number>(); const mech = new Map<string, number>(); let total = 0; let multi = 0;
  for (const x of s.events) {
    if (x.month < r.from || x.month > r.to || !x.cases.length) continue;
    for (const k of x.cases) { total++; if (k.bodyParts.length > 1) multi++; for (const b of k.bodyParts) body.set(b, (body.get(b) ?? 0) + 1); }
    if (x.e.mechanism) mech.set(x.e.mechanism, (mech.get(x.e.mechanism) ?? 0) + x.cases.length);
  }
  const ms = [...mech].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])); const mt = ms.reduce((t, m) => t + m[1], 0); let cum = 0;
  const sum = (k: MeasureKey): number | null => { const a = agg(s, r, [k], null, false); return a.used ? a.num : null; };
  const acc = c.ds.modules.accidents;
  return {
    availability: c.ds.modules.health, injuries: c.ds.modules.cases,
    bodyParts: [...body].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([key, cases]) => ({ key, label: tr(`eng.body.${key}`), cases, view: BACK.has(key) ? 'back' as const : FRONT.has(key) ? 'front' as const : 'both' as const })),
    totalCases: total, multiZoneCases: multi,
    mechanisms: ms.map(([key, cases]) => { cum += cases; return { key, label: tr(`eng.mech.${key}`), cases, cumPct: mt ? (100 * cum) / mt : 0 }; }),
    denominatorNote: s.f.bodyPart || s.f.mechanism ? tr('eng.note.denominatorKept') : null,
    surveillance: c.kv('H01'), hygieneOverLimit: c.kv('H04'),
    pyramid: {
      availability: acc, levels: LEVELS.map((k, i) => ({ level: String(5 - i), label: tr(`eng.level.${5 - i}`), consequence: sum(k), potential: sum(POTENTIAL[i]) })),
      notes: [tr('eng.note.pyramidNotSummed'), ...(s.hasRecords ? [] : [tr('eng.note.reportedCount')])],
    },
    lostDays: c.kv('R10'),
  };
}

const BUCKETS: Array<{ bucket: '0-30' | '31-60' | '61-90' | '90+'; lo: number; hi: number }> = [
  { bucket: '0-30', lo: 0, hi: 30 }, { bucket: '31-60', lo: 31, hi: 60 }, { bucket: '61-90', lo: 61, hi: 90 }, { bucket: '90+', lo: 91, hi: Infinity }];
export function actionsPanel(c: Ctx): ActionsPanelModel {
  const { s, r } = c; const cut = asOfR(s, r); const open = openAt(s, cut); const over = overdueAt(s, cut);
  const age = open.map((a) => dayNum(cut) - dayNum(a.openedAt)); const delay = over.map((a) => delayDays(a, cut));
  const total = c.kv('O09');
  const critSpec = { def: DEF.get('O09')!, light: true, calc: (sc: Scope, rr: Range) => {
    const k = asOfR(sc, rr); const n = overdueAt(sc, k).filter((a) => a.priority === 'critical').length;
    return sc.ds.actions.length ? { state: n === 0 ? 'zero' as const : 'ok' as const, value: n, numerator: n, denominator: openAt(sc, k).length, status: n > 0 ? 'crit' as const : 'good' as const }
      : { state: 'pending' as const, value: null, numerator: null, denominator: null, reason: tr('eng.reason.recordsPending'), status: 'nodata' as const };
  } };
  return {
    availability: c.ds.modules.actions,
    aging: BUCKETS.map((b) => ({ bucket: b.bucket, openByAge: age.filter((d) => d >= b.lo && d <= b.hi).length, overdueByDelay: delay.filter((d) => d >= b.lo && d <= b.hi).length })),
    overdueCritical: evalKpi(critSpec, s, r, true), overdueTotal: total, closure: c.kv('O07'), onTime: c.kv('O08'),
    delay: { median: median(delay), p90: quantile(delay, 0.9) }, nextSteps: nextSteps(s, r),
  };
}
