import type { ActionRecord, ControlRecord, ISODate, PlanActivity, VerificationRecord } from '../../domain/types';
import type { Scope } from '../cube';
import { type Calc, fromPct, none, sec, tr } from '../kpi';
import { type Range, dateIn, dayNum, monthEnd } from '../period';
import { median, quantile } from '../stats';
import type { Impl } from './results';

/** Fecha de corte efectiva de un rango: fin del período o corte del conjunto, lo que ocurra primero. */
export const asOfR = (s: Scope, r: Range): ISODate => { const e = monthEnd(r.to); return e < s.asOf ? e : s.asOf; };
const pendingIf = (empty: boolean) => (empty ? none('pending', 'eng.reason.recordsPending', { status: 'nodata' }) : null);

export const dueVerifs = (s: Scope, r: Range): VerificationRecord[] => { const cut = asOfR(s, r); return s.verifications.filter((v) => dateIn(v.dueAt, r) && v.dueAt <= cut); };
export const isDone = (v: VerificationRecord, cut: ISODate): boolean => !!v.doneAt && v.doneAt <= cut;
export const isValid = (v: VerificationRecord): boolean => v.result === 'conform' || v.result === 'fail';
/** Controles críticos cuya última verificación válida falló y no tienen recuperación verificada a la fecha. */
export function activeFailures(s: Scope, cut: ISODate): ControlRecord[] {
  const last = new Map<string, VerificationRecord>();
  for (const v of s.verifications) {
    if (!isDone(v, cut) || !isValid(v)) continue;
    const p = last.get(v.controlId);
    if (!p || (v.doneAt as string) > (p.doneAt as string)) last.set(v.controlId, v);
  }
  return s.controls.filter((c) => { if (!c.critical) return false; const v = last.get(c.id); return !!v && v.result === 'fail' && !(v.recoveredAt && v.recoveredAt <= cut); });
}
const P03: Calc = (s, r) => {
  const p = pendingIf(!s.ds.verifications.length); if (p) return p;
  const due = dueVerifs(s, r); const cut = asOfR(s, r);
  return fromPct(due.filter((v) => isDone(v, cut)).length, due.length, due.length ? 1 : s.verifications.length ? 1 : 0, { eligible: due.length });
};
const P04: Calc = (s, r) => {
  const p = pendingIf(!s.ds.verifications.length); if (p) return p;
  const cut = asOfR(s, r); const valid = dueVerifs(s, r).filter((v) => isDone(v, cut) && isValid(v));
  const core = fromPct(valid.filter((v) => v.result === 'conform' && v.hasEvidence).length, valid.length, valid.length ? 1 : s.verifications.length ? 1 : 0, { eligible: valid.length });
  const fails = activeFailures(s, cut).length;
  // Ningún promedio verde oculta una falla crítica activa.
  return fails > 0 ? { ...core, status: 'crit', flags: ['active_critical_failure'], statusNote: tr('eng.note.activeFailure', { n: fails }), secondary: [sec('eng.sec.activeFailures', fails, 'count')] } : { ...core, notes: [tr('eng.note.sampleCaveat')] };
};
const P05: Calc = (s, r) => {
  const p = pendingIf(!s.ds.verifications.length); if (p) return p;
  const n = activeFailures(s, asOfR(s, r)).length;
  return { state: n === 0 ? 'zero' : 'ok', value: n, numerator: n, denominator: s.controls.filter((c) => c.critical).length, flags: n > 0 ? ['active_critical_failure'] : [] };
};
export const closedBy = (a: ActionRecord, cut: ISODate): boolean => !!a.closedAt && a.closedAt <= cut;
export const openAt = (s: Scope, cut: ISODate): ActionRecord[] => s.actions.filter((a) => a.openedAt <= cut && !closedBy(a, cut));
/** Vencidas = abiertas con vencimiento ORIGINAL anterior al corte (reprogramar no borra el retraso). */
export const overdueAt = (s: Scope, cut: ISODate): ActionRecord[] => openAt(s, cut).filter((a) => a.originalDue < cut);
export const delayDays = (a: ActionRecord, cut: ISODate): number => dayNum(cut) - dayNum(a.originalDue);
const O07: Calc = (s, r) => {
  const p = pendingIf(!s.ds.actions.length); if (p) return p;
  const cut = asOfR(s, r); const cohort = s.actions.filter((a) => dateIn(a.openedAt, r) && a.openedAt <= cut);
  return fromPct(cohort.filter((a) => closedBy(a, cut) && !!a.acceptedAt && a.acceptedAt <= cut).length, cohort.length, cohort.length ? 1 : s.actions.length ? 1 : 0, { eligible: cohort.length, notes: [tr('eng.note.cohortOpened')] });
};
const O08: Calc = (s, r) => {
  const p = pendingIf(!s.ds.actions.length); if (p) return p;
  const cut = asOfR(s, r); const cohort = s.actions.filter((a) => dateIn(a.originalDue, r) && a.originalDue <= cut);
  return fromPct(cohort.filter((a) => !!a.closedAt && a.closedAt <= a.originalDue).length, cohort.length, cohort.length ? 1 : s.actions.length ? 1 : 0, { eligible: cohort.length, notes: [tr('eng.note.cohortDue')] });
};
const O09: Calc = (s, r) => {
  const p = pendingIf(!s.ds.actions.length); if (p) return p;
  const cut = asOfR(s, r); const open = openAt(s, cut); const over = open.filter((a) => a.originalDue < cut);
  const crit = over.filter((a) => a.priority === 'critical').length;
  return { state: over.length === 0 ? 'zero' : 'ok', value: over.length, numerator: over.length, denominator: open.length, status: crit > 0 ? 'crit' : over.length > 0 ? 'warn' : 'good',
    secondary: [sec('eng.sec.overdueCritical', crit, 'count'), sec('eng.sec.pctOfOpen', open.length ? (100 * over.length) / open.length : null, 'pct', 1), sec('eng.sec.rescheduled', over.filter((a) => a.reschedules.length > 0).length, 'count')],
    notes: [tr('eng.note.originalDueKept')] };
};
const O10: Calc = (s, r) => {
  const p = pendingIf(!s.ds.actions.length); if (p) return p;
  const req = s.actions.filter((a) => a.effectivenessRequired && dateIn(a.closedAt, r) && a.effectivenessOk !== null);
  return fromPct(req.filter((a) => a.effectivenessOk === true).length, req.length, req.length ? 1 : s.actions.length ? 1 : 0, { eligible: req.length });
};
const O11: Calc = (s, r) => {
  const p = pendingIf(!s.ds.actions.length); if (p) return p;
  const ev = s.actions.filter((a) => a.findingKey !== null && dateIn(a.openedAt, r));
  const rep = ev.filter((a) => s.actions.some((b) => b.id !== a.id && b.projectId === a.projectId && b.findingKey === a.findingKey && b.openedAt < a.openedAt && dayNum(a.openedAt) - dayNum(b.openedAt) <= 365));
  return fromPct(rep.length, ev.length, ev.length ? 1 : s.actions.length ? 1 : 0, { eligible: ev.length, notes: [tr('eng.note.recurrenceWindow')] });
};
export interface PlanSplit { due: PlanActivity[]; done: PlanActivity[]; year: PlanActivity[]; yearDone: PlanActivity[]; cut: ISODate }
/** PAS: exigibles a la fecha (vencimiento BASE ≤ corte, año del período) vs. todas las aprobadas del año. Las futuras no reducen O12. */
export function planSplit(s: Scope, r: Range): PlanSplit {
  const cut = asOfR(s, r); const y = r.to.slice(0, 4);
  const year = s.plan.filter((a) => a.baselineDue.slice(0, 4) === y);
  const due = year.filter((a) => a.baselineDue <= cut);
  const ok = (a: PlanActivity): boolean => !!a.doneAt && a.doneAt <= cut && !!a.acceptedAt && a.acceptedAt <= cut;
  return { due, done: due.filter(ok), year, yearDone: year.filter((a) => !!a.doneAt && a.doneAt <= cut), cut };
}
const O12: Calc = (s, r) => {
  const p = pendingIf(!s.ds.planActivities.length); if (p) return p;
  const sp = planSplit(s, r);
  return fromPct(sp.done.length, sp.due.length, sp.year.length ? 1 : s.plan.length ? 1 : 0, { eligible: sp.due.length, notes: [tr('eng.note.planToDate', { cut: sp.cut })], secondary: [sec('eng.sec.futureActivities', sp.year.length - sp.due.length, 'count')] });
};
const O13: Calc = (s, r) => {
  const p = pendingIf(!s.ds.planActivities.length); if (p) return p;
  const sp = planSplit(s, r);
  return fromPct(sp.yearDone.length, sp.year.length, sp.year.length ? 1 : s.plan.length ? 1 : 0, { eligible: sp.year.length, notes: [tr('eng.note.planAnnual')] });
};
const O14: Calc = (s, r) => {
  const p = pendingIf(!s.ds.planActivities.length); if (p) return p;
  const sp = planSplit(s, r); const w = (a: PlanActivity[]): number => a.reduce((t, x) => t + x.weight, 0);
  return fromPct(w(sp.done), w(sp.due), sp.year.length ? 1 : s.plan.length ? 1 : 0, { eligible: sp.due.length, notes: [tr('eng.note.planWeights')] });
};
const O15: Calc = (s, r) => {
  const p = pendingIf(!s.ds.actions.length); if (p) return p;
  const cut = asOfR(s, r); const d = overdueAt(s, cut).map((a) => delayDays(a, cut));
  if (!d.length) return { state: 'zero', value: 0, numerator: 0, denominator: 0, status: 'good' };
  return { state: 'ok', value: median(d), numerator: null, denominator: d.length, secondary: [sec('eng.sec.p90', quantile(d, 0.9), 'days'), sec('eng.sec.n', d.length, 'count')], notes: [tr('eng.note.originalDueKept')] };
};
export const RECORDS: Record<string, Impl> = {
  P03: { calc: P03, fixedTarget: 90 }, P04: { calc: P04, fixedTarget: 90 }, P05: { calc: P05, zeroTol: true },
  O07: { calc: O07 }, O08: { calc: O08 }, O09: { calc: O09 }, O10: { calc: O10 }, O11: { calc: O11 },
  O12: { calc: O12, fixedTarget: 85 }, O13: { calc: O13 }, O14: { calc: O14 }, O15: { calc: O15 },
};
