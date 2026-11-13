import type { TextRef } from '../../domain/types';
import type { Scope } from '../cube';
import { buildSignals, signalCounts } from '../alerts';
import { type Calc, type Core, fromPct, none, sec, tr } from '../kpi';
import { addMonths, monthOf } from '../period';
import { PRED, muOf, predictive } from '../predictive';
import { nbLogPmf, nbQuantile } from '../stats';
import { asOfR, closedBy, isValid, planSplit } from './records';
import type { Impl } from './results';

const off = (s: Scope): Core | null => {
  const g = predictive(s).gate;
  if (g.enabled && g.outputs) return null;
  const reason: TextRef = g.reasons[0] ?? tr('eng.pred.reason.noEvaluation');
  return { state: 'disabled', value: null, numerator: null, denominator: null, reason, status: 'nodata', statusNote: tr('eng.pred.disabledNote', { n: g.reasons.length }) };
};
const sim = (s: Scope): string[] => (s.ds.kind === 'demo' ? ['simulation'] : []);
const D01: Calc = (s) => {
  const o = off(s); if (o) return o; const e = predictive(s).gate.outputs!.expected;
  return { state: 'ok', value: e[0].expected, numerator: null, denominator: null, interval: [e[0].lo, e[0].hi], flags: sim(s), status: 'neutral',
    secondary: e.slice(1).map((x) => sec('eng.sec.horizon', x.expected, 'events', 1, { days: x.horizonDays })), notes: [tr('eng.pred.modelNote', { model: PRED.model, version: PRED.version })] };
};
const D02: Calc = (s) => {
  const o = off(s); if (o) return o; const p = predictive(s).gate.outputs!.probability;
  return { state: 'ok', value: p[0].p, numerator: null, denominator: null, flags: sim(s), status: 'neutral', secondary: p.slice(1).map((x) => sec('eng.sec.horizon', x.p, 'probability', 2, { days: x.horizonDays })), notes: [tr('eng.pred.eventDefinition')] };
};
const D03: Calc = (s) => {
  const o = off(s); if (o) return o; const fr = predictive(s).gate.outputs!.futureRate!;
  return { state: 'ok', value: fr.value, numerator: null, denominator: fr.hhAssumed, flags: sim(s), status: 'neutral', secondary: [sec('eng.sec.hhAssumed', fr.hhAssumed, 'hh')], notes: [fr.assumption] };
};
const D04: Calc = (s) => {
  const p = predictive(s);
  if (p.z === null) return none('insufficient', 'eng.reason.insufficientSample', { status: 'nodata' });
  return { state: 'ok', value: p.z, numerator: p.y[p.y.length - 1], denominator: p.zExpected, status: Math.abs(p.z) >= 3 ? 'warn' : 'neutral', notes: [tr('eng.pred.residualNote')], secondary: [sec('eng.sec.expectedBaseline', p.zExpected, 'events', 1)] };
};
const D05: Calc = (s, r) => {
  if (!s.ds.actions.length) return none('pending', 'eng.reason.recordsPending', { status: 'nodata' });
  const cut = asOfR(s, r); const known = s.actions.filter((a) => a.originalDue <= cut).sort((a, b) => a.originalDue.localeCompare(b.originalDue));
  if (known.length < 30) return none('insufficient', 'eng.reason.insufficientSample', { status: 'nodata' });
  const late = (a: (typeof known)[number]): number => (a.closedAt && a.closedAt <= a.originalDue ? 0 : 1);
  const k = Math.floor(known.length * 0.7); const train = known.slice(0, k); const test = known.slice(k);
  const prob = (prio: string): number => { const g = train.filter((a) => a.priority === prio); return (g.reduce((t, a) => t + late(a), 0) + 1) / (g.length + 2); };
  const baseP = train.reduce((t, a) => t + late(a), 0) / train.length;
  const brier = test.reduce((t, a) => t + (prob(a.priority) - late(a)) ** 2, 0) / test.length; const brierBase = test.reduce((t, a) => t + (baseP - late(a)) ** 2, 0) / test.length;
  const secondary = [sec('eng.sec.brier', brier, 'index', 3), sec('eng.sec.brierBase', brierBase, 'index', 3)];
  if (brier > brierBase) return none('insufficient', 'eng.reason.notBetterThanBase', { status: 'nodata', secondary });
  const pending = s.actions.filter((a) => a.openedAt <= cut && a.originalDue > cut && !closedBy(a, cut));
  if (!pending.length) return none('na', 'eng.reason.nothingDue', { status: 'na', secondary });
  return { state: 'ok', value: pending.reduce((t, a) => t + prob(a.priority), 0) / pending.length, numerator: null, denominator: pending.length, status: 'neutral', flags: sim(s), secondary, notes: [tr('eng.pred.latenessNote')] };
};
const D06: Calc = (s, r) => {
  if (!s.ds.planActivities.length) return none('pending', 'eng.reason.recordsPending', { status: 'nodata' });
  const sp = planSplit(s, r);
  if (sp.due.length < 10) return none('insufficient', 'eng.reason.insufficientSample', { status: 'nodata' });
  const pOn = sp.due.filter((a) => a.doneAt && a.doneAt <= a.baselineDue).length / sp.due.length;
  const future = sp.year.filter((a) => a.baselineDue > sp.cut && !(a.doneAt && a.doneAt <= sp.cut)).length;
  return fromPct(sp.yearDone.length + pOn * future, sp.year.length, 1, { flags: sim(s), status: 'neutral', secondary: [sec('eng.sec.pOnTime', pOn, 'probability', 2)], notes: [tr('eng.pred.planNote')] });
};
const D07: Calc = (s, r) => {
  if (!s.ds.verifications.length) return none('pending', 'eng.reason.recordsPending', { status: 'nodata' });
  const cut = asOfR(s, r); const from = `${addMonths(monthOf(cut), -5)}-01`; const by = new Map<string, { n: number; f: number }>();
  for (const v of s.verifications) { if (!v.doneAt || v.doneAt < from || v.doneAt > cut || !isValid(v)) continue; const b = by.get(v.controlId) ?? { n: 0, f: 0 }; b.n++; if (v.result === 'fail') b.f++; by.set(v.controlId, b); }
  const crit = s.controls.filter((c) => c.critical && (by.get(c.id)?.n ?? 0) >= 2);
  return fromPct(crit.filter((c) => (by.get(c.id)?.f ?? 0) >= 2).length, crit.length, s.verifications.length ? 1 : 0, { notes: [tr('eng.pred.persistenceNote')] });
};
const D08: Calc = (s) => {
  const o = off(s); if (o) return o; const fit = predictive(s).fit; if (!fit) return none('disabled', 'eng.pred.reason.noEvaluation', { status: 'nodata' });
  const base = muOf(fit, 3); const up = muOf(fit, 3, 1.1); const down = muOf(fit, 3, 0.9);
  return { state: 'ok', value: up - base, numerator: null, denominator: null, flags: sim(s), status: 'neutral', interval: [nbQuantile(0.1, fit.a, down), nbQuantile(0.9, fit.a, up)],
    secondary: [sec('eng.sec.scenarioDown', down, 'events', 1), sec('eng.sec.scenarioBase', base, 'events', 1), sec('eng.sec.scenarioUp', up, 'events', 1), sec('eng.sec.pZeroBase', Math.exp(nbLogPmf(0, fit.a, base)), 'probability', 2)], notes: [tr('eng.pred.scenarioNote')] };
};
const SIG: Calc = (s) => {
  const sig = buildSignals(s); const c = signalCounts(sig);
  return { state: sig.length === 0 ? 'zero' : 'ok', value: sig.length, numerator: sig.length, denominator: null, status: c.critical > 0 ? 'crit' : c.high > 0 ? 'warn' : sig.length === 0 ? 'good' : 'neutral',
    secondary: [sec('eng.sec.sigCritical', c.critical, 'count'), sec('eng.sec.sigHigh', c.high, 'count'), sec('eng.sec.sigMedium', c.medium, 'count')], statusNote: tr('eng.note.signalsByRules') };
};
export const PREDICT: Record<string, Impl> = {
  D01: { calc: D01, light: true }, D02: { calc: D02, light: true }, D03: { calc: D03, light: true }, D04: { calc: D04, light: true }, D05: { calc: D05, light: true },
  D06: { calc: D06, light: true }, D07: { calc: D07, light: true }, D08: { calc: D08, light: true }, SIG: { calc: SIG, light: true },
};
