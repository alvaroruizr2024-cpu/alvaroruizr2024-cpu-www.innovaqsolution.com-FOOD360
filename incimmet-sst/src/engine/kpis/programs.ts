import type { ProgramKey, ProgramStat } from '../../domain/types';
import { type Scope, agg, cellsIn, isNum } from '../cube';
import { type Calc, type Core, fromCount, fromPct, fromRate, none, sec, tr } from '../kpi';
import { type Range, dateIn } from '../period';
import { median, quantile } from '../stats';
import type { Impl } from './results';

type F = 'due' | 'done' | 'onTime' | 'conform' | 'evaluated' | 'eligible' | 'applicable' | 'hours';
export const statsIn = (s: Scope, r: Range, program: ProgramKey): ProgramStat[] => s.programStats.filter((p) => p.program === program && p.month >= r.from && p.month <= r.to);
const hasProgram = (s: Scope, program: ProgramKey): boolean => s.programStats.some((p) => p.program === program);
const sumF = (rows: ProgramStat[], f: F): number => rows.reduce((t, p) => t + (isNum(p[f]) ? (p[f] as number) : 0), 0);
/** Razón genérica Σ num / Σ den × 100 sobre agregados de programa, con cobertura pareada. */
export const prog = (program: ProgramKey, nf: F, df: F, extra?: (rows: ProgramStat[]) => Partial<Core>): Calc => (s, r) => {
  if (!hasProgram(s, program)) return none('pending', 'eng.reason.programPending', { status: 'nodata' });
  const rows = statsIn(s, r, program); const ok = rows.filter((p) => isNum(p[nf]) && isNum(p[df]));
  const skipped = rows.length - ok.length;
  return fromPct(sumF(ok, nf), sumF(ok, df), ok.length, { coverage: skipped ? [{ kind: 'partial', reason: tr('eng.cov.programIncomplete', { n: skipped }) }] : [], eligible: ok.length, ...(extra ? extra(ok) : {}) });
};
const P17: Calc = (s, r) => {
  const rows = statsIn(s, r, 'training').filter((p) => isNum(p.hours));
  if (rows.length) return { state: 'ok', value: sumF(rows, 'hours'), numerator: sumF(rows, 'hours'), denominator: null, notes: [tr('eng.note.trainingUnit')] };
  return fromCount(agg(s, r, ['trainingHours'], null, false), 'trainingHours', { notes: [tr('eng.note.trainingUnit')] });
};
const P18: Calc = (s, r) => {
  if (s.ds.modules.training.state !== 'available') return none('nd', 'eng.reason.unitsNotValidated', { status: 'nodata' });
  const hours = new Map<string, number>();
  for (const p of statsIn(s, r, 'training')) if (isNum(p.hours)) hours.set(`${p.projectId}|${p.month}`, (hours.get(`${p.projectId}|${p.month}`) ?? 0) + p.hours);
  let num = 0; let den = 0; let rows = 0;
  for (const c of cellsIn(s, r)) {
    const h = hours.get(`${c.projectId}|${c.month}`) ?? (isNum(c.v.trainingHours) ? c.v.trainingHours : undefined);
    if (h === undefined || !isNum(c.v.hh) || c.v.hh <= 0) continue;
    num += h; den += c.v.hh; rows++;
  }
  return fromPct(num, den, rows, { notes: [tr('eng.note.intensityNotCompliance')] });
};
const O01: Calc = (s, r) => {
  const a = agg(s, r, ['nearMiss', 'hazardReports'], 'hh', true);
  return fromRate(a, 10000, 'nearMiss, hazardReports', s.cfg.smallExposureHH, { interval: null, statusNote: tr('eng.note.moreReportsNotWorse'),
    secondary: [sec('eng.sec.nearMiss', a.used ? a.parts[0] : null, 'events'), sec('eng.sec.hazardReports', a.used ? a.parts[1] : null, 'events')] });
};
const O05: Calc = (s, r) => {
  if (!s.hasRecords) return none('nd', 'eng.reason.needsCaseRecords', { status: 'nodata' });
  const xs = s.events.filter((x) => x.month >= r.from && x.month <= r.to && isNum(x.e.firstResponseHours)).map((x) => x.e.firstResponseHours as number);
  if (!xs.length) return none('nd', 'eng.reason.noData', { status: 'nodata' });
  return { state: 'ok', value: median(xs), numerator: null, denominator: xs.length, secondary: [sec('eng.sec.p90', quantile(xs, 0.9), 'hours', 1), sec('eng.sec.n', xs.length, 'count')] };
};
const O06: Calc = (s, r) => {
  if (!s.ds.events.some((e) => e.investigationDueAt)) return prog('investigations', 'onTime', 'due')(s, r);
  const due = s.events.filter((x) => dateIn(x.e.investigationDueAt, r) && (x.e.investigationDueAt as string) <= s.asOf);
  const ok = due.filter((x) => x.e.investigationClosedAt && x.e.investigationClosedAt <= (x.e.investigationDueAt as string)).length;
  return fromPct(ok, due.length, due.length ? 1 : s.events.length ? 1 : 0, { eligible: due.length });
};
const H04: Calc = (s, r) => {
  if (!s.hygiene.length) return none('pending', 'eng.reason.programPending', { status: 'nodata' });
  const rows = s.hygiene.filter((h) => h.month >= r.from && h.month <= r.to);
  const by = new Map<string, { v: number; o: number }>();
  for (const h of rows) { const b = by.get(h.agent) ?? { v: 0, o: 0 }; b.v += h.valid; b.o += h.overLimit; by.set(h.agent, b); }
  const v = rows.reduce((t, h) => t + h.valid, 0); const o = rows.reduce((t, h) => t + h.overLimit, 0);
  return fromPct(o, v, rows.length, { secondary: [...by].map(([k, b]) => sec(`eng.agent.${k}`, b.v > 0 ? (100 * b.o) / b.v : null, 'pct', 1)), notes: [tr('eng.note.hygieneByAgent')] });
};
const H05: Calc = (s, r) => {
  if (!s.hygiene.length) return none('pending', 'eng.reason.programPending', { status: 'nodata' });
  const rows = s.hygiene.filter((h) => h.month >= r.from && h.month <= r.to && isNum(h.peopleEvaluated) && isNum(h.peopleOverexposed));
  return fromPct(rows.reduce((t, h) => t + (h.peopleOverexposed as number), 0), rows.reduce((t, h) => t + (h.peopleEvaluated as number), 0), rows.length, { notes: [tr('eng.note.hygieneCoverage')] });
};
/** Enfermedad laboral (Colombia): evaluated = casos calificados vigentes (nuevos y antiguos), done = casos nuevos, eligible = trabajadores. */
const disease = (kind: 'prevalence' | 'incidence'): Calc => (s, r) => {
  if (!hasProgram(s, 'occupational_disease')) return none('pending', 'eng.reason.programPending', { status: 'nodata' });
  const rows = statsIn(s, { from: `${r.to.slice(0, 4)}-01`, to: r.to }, 'occupational_disease').filter((p) => isNum(p.eligible));
  if (!rows.length) return none('nd', 'eng.reason.noData', { status: 'nodata' });
  const months = [...new Set(rows.map((p) => p.month))].sort(); const last = months[months.length - 1];
  const workers = sumF(rows, 'eligible') / months.length;
  const num = kind === 'incidence' ? sumF(rows, 'done') : sumF(rows.filter((p) => p.month === last), 'evaluated');
  if (!(workers > 0)) return none('nd', 'eng.reason.zeroDenominator', { status: 'noexposure' });
  return { state: num === 0 ? 'zero' : 'ok', value: (num * 100000) / workers, numerator: num, denominator: workers, notes: [tr('eng.note.aggregatedOnly')] };
};
const CO06: Calc = (s, r) => prog('absenteeism', 'done', 'due')(s, { from: r.to, to: r.to });

export const PROGRAMS: Record<string, Impl> = {
  P01: { calc: prog('risk_assessment', 'done', 'due') }, P02: { calc: prog('controls_implemented', 'done', 'due') }, P06: { calc: prog('inspections', 'done', 'due') },
  P07: { calc: prog('competencies', 'conform', 'eligible') }, P08: { calc: prog('training', 'onTime', 'due') }, P09: { calc: prog('training_effectiveness', 'conform', 'evaluated') },
  P10: { calc: prog('permits', 'conform', 'evaluated', (rows) => ({ notes: [tr('eng.note.sample', { n: sumF(rows, 'evaluated') })], secondary: [sec('eng.sec.sampled', sumF(rows, 'evaluated'), 'count')] })) },
  P11: { calc: prog('maintenance', 'onTime', 'due') }, P12: { calc: prog('emergency', 'conform', 'evaluated') }, P13: { calc: prog('drills', 'done', 'due') },
  P14: { calc: prog('audits', 'done', 'due') }, P15: { calc: prog('moc', 'done', 'due') },
  P16: { calc: prog('legal', 'conform', 'evaluated', (rows) => { const ap = sumF(rows, 'applicable'); return { secondary: [sec('eng.sec.evaluatedOfApplicable', ap > 0 ? (100 * sumF(rows, 'evaluated')) / ap : null, 'pct', 1)] }; }) },
  P17: { calc: P17 }, P18: { calc: P18 }, O01: { calc: O01 },
  O02: { calc: prog('participation', 'done', 'eligible') }, O03: { calc: prog('report_quality', 'conform', 'evaluated') }, O04: { calc: prog('leadership', 'done', 'due') },
  O05: { calc: O05 }, O06: { calc: O06 }, O16: { calc: prog('interventions', 'done', 'due') },
  H01: { calc: prog('health_surveillance', 'done', 'eligible'), fixedTarget: 95 }, H02: { calc: prog('restrictions', 'done', 'due') }, H03: { calc: prog('hygiene_monitoring', 'done', 'due') },
  H04: { calc: H04 }, H05: { calc: H05 }, H06: { calc: prog('ergonomics', 'done', 'eligible') },
  H07: { calc: prog('fatigue', 'conform', 'evaluated', (rows) => { const el = sumF(rows, 'eligible'); return { secondary: [sec('eng.sec.evaluatedOfEligible', el > 0 ? (100 * sumF(rows, 'evaluated')) / el : null, 'pct', 1)] }; }) },
  H08: { calc: prog('psychosocial', 'done', 'due', () => ({ notes: [tr('eng.note.aggregatedOnly')] })) },
  CO04: { calc: disease('prevalence'), country: 'CO' }, CO05: { calc: disease('incidence'), country: 'CO' }, CO06: { calc: CO06, country: 'CO' },
};
