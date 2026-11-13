import type { CountryCode, MeasureKey, Month } from '../../domain/types';
import { type Agg, type Scope, LEVELS, agg, cellsIn, isNum } from '../cube';
import { type Calc, type Core, type Spec, fromCount, fromRate, none, sec, tr } from '../kpi';
import type { Range } from '../period';

export type Impl = Omit<Spec, 'def'>;
const EV_REPORTED: MeasureKey[] = [...LEVELS, 'accNoLostTime', 'accProperty', 'incPerson', 'incProperty'];
const EV_RECORDS: MeasureKey[] = ['accPerson', 'accProperty', 'incPerson', 'nearMiss', 'hazardReports'];
const INJ_REPORTED: MeasureKey[] = [...LEVELS, 'accNoLostTime'];
const rc = (s: Scope): string[] => (s.hasRecords ? [] : ['reported_count']);
const sumOf = (s: Scope, r: Range, k: MeasureKey): number | null => { const a = agg(s, r, [k], null, false); return a.used ? a.num : null; };
const lastMonth = (r: Range): Range => ({ from: r.to, to: r.to });
const yearTo = (r: Range): Range => ({ from: `${r.to.slice(0, 4)}-01`, to: r.to });

const R01: Calc = (s, r) => { const a = agg(s, r, ['hh'], null, false); return fromCount(a, 'hh', a.used === 0 ? { reason: tr('eng.reason.noExposure'), status: 'noexposure' } : {}); };
const R02: Calc = (s, r) => {
  const per = new Map<Month, number>(); let missing = 0;
  for (const c of cellsIn(s, r)) {
    if (isNum(c.v.workers)) per.set(c.month, (per.get(c.month) ?? 0) + c.v.workers);
    else if (isNum(c.v.hh) && c.v.hh > 0) missing++;
  }
  const coverage = missing ? [{ kind: 'partial' as const, reason: tr('eng.cov.noHeadcount', { n: missing }) }] : [];
  if (!per.size) return none('nd', 'eng.reason.noHeadcount', { status: 'nodata', coverage });
  let tot = 0; for (const v of per.values()) tot += v;
  return { state: 'ok', value: tot / per.size, numerator: tot, denominator: per.size, coverage, notes: [tr('eng.note.headcountMethod')] };
};
const R03: Calc = (s, r) => {
  const keys = s.hasRecords ? EV_RECORDS : EV_REPORTED; const a = agg(s, r, keys, null, false);
  const part = (ks: MeasureKey[]): number => ks.reduce((t, k) => t + (keys.includes(k) ? a.parts[keys.indexOf(k)] : 0), 0);
  const secondary = [
    sec('eng.sec.injuryAccidents', a.used ? part(s.hasRecords ? ['accPerson'] : INJ_REPORTED) : null, 'events'),
    sec('eng.sec.propertyAccidents', a.used ? part(['accProperty']) : null, 'events'),
    sec('eng.sec.incidents', a.used ? part(['incPerson', 'incProperty']) : null, 'events'),
    ...(s.hasRecords ? [sec('eng.sec.nearMiss', part(['nearMiss']), 'events'), sec('eng.sec.hazardReports', part(['hazardReports']), 'events')] : []),
  ];
  return fromCount(a, keys.join(', '), { flags: rc(s), secondary });
};
const R04: Calc = (s, r) => {
  if (s.hasRecords) {
    const a = agg(s, r, ['casesInjury'], null, false);
    return fromCount(a, 'casesInjury', { unit: 'cases', secondary: [sec('eng.sec.injuryEvents', sumOf(s, r, 'accPerson'), 'events')] });
  }
  return fromCount(agg(s, r, INJ_REPORTED, null, false), INJ_REPORTED.join(', '), { flags: ['reported_count'], notes: [tr('eng.note.reportedCount')] });
};
const R05: Calc = (s, r) => {
  if (s.hasRecords) return fromCount(agg(s, r, ['fatalities'], null, false), 'fatalities', { unit: 'cases', secondary: [sec('eng.sec.fatalEvents', sumOf(s, r, 'accFatal'), 'events')] });
  return fromCount(agg(s, r, ['accFatal'], null, false), 'accFatal', { flags: ['reported_count'], notes: [tr('eng.note.fatalAsReported')] });
};
const R06: Calc = (s, r) => fromCount(agg(s, r, s.cfg.ltiMeasures, null, true), s.cfg.ltiMeasures.join(', '), {
  flags: rc(s), secondary: s.hasRecords ? [sec('eng.sec.casesLti', sumOf(s, r, 'casesLti'), 'cases')] : [], notes: [tr('eng.note.ltiCriterion')] });
const R07: Calc = (s, r) => fromCount(agg(s, r, s.cfg.triMeasures, null, true), s.cfg.triMeasures.join(', '), { flags: rc(s), notes: [tr('eng.note.triProfile')] });
const R08: Calc = (s, r) => (s.hasRecords
  ? fromCount(agg(s, r, ['casesFirstAid'], null, false), 'casesFirstAid')
  : none('nd', 'eng.reason.taxonomyNotValidated', { status: 'nodata', secondary: [sec('eng.sec.accNv1', sumOf(s, r, 'accNv1'), 'events')] }));
const R09: Calc = (s, r) => fromCount(agg(s, r, ['accProperty'], null, false), 'accProperty', { flags: rc(s) });
const R10: Calc = (s, r) => {
  const ch = sumOf(s, r, 'chargedDays');
  return fromCount(agg(s, r, ['lostDays'], null, false), 'lostDays', { secondary: ch === null ? [] : [sec('eng.sec.chargedDays', ch, 'days')], notes: [tr(ch === null ? 'eng.note.chargedNotSeparate' : 'eng.note.chargedSeparate')] });
};
const rate = (nums: (s: Scope) => MeasureKey[], secKey: string, extra: Partial<Core> = {}): Calc => (s, r) => {
  const ks = nums(s); const a = agg(s, r, ks, 'hh', true);
  return fromRate(a, s.cfg.rateConstant, ks.join(', '), s.cfg.smallExposureHH, { secondary: [sec(secKey, a.used ? a.num : null, 'events'), sec('eng.sec.hh', a.used ? a.den : null, 'hh')], ...extra });
};
const R11 = rate((s) => s.cfg.ltiMeasures, 'eng.sec.ltiCount', { statusNote: tr('eng.note.ltifrExcludesFatal') });
const R12 = rate((s) => s.cfg.triMeasures, 'eng.sec.triCount', { statusNote: tr('eng.note.trifrReported') });
const caseRate = (ks: MeasureKey[]): Calc => (s, r) => (s.hasRecords
  ? fromRate(agg(s, r, ks, 'hh', true), 200000, ks.join(', '), s.cfg.smallExposureHH, { statusNote: tr('eng.note.referenceNotOsha') })
  : none('nd', 'eng.reason.needsCaseRecords', { status: 'nodata' }));
const R15: Calc = (s, r) => {
  const a: Agg = { num: 0, den: 0, used: 0, total: 0, parts: [0], absent: {}, empty: {}, noDen: {}, usedCells: [] };
  const kinds = new Map<CountryCode, Set<string>>();
  for (const c of cellsIn(s, r)) {
    a.total++;
    const hl = c.v.hpriLoss; const hn = c.v.hpriNoLoss; let n: number | null | undefined; let kind = 'hpri';
    if (hl !== undefined || hn !== undefined) n = hl === undefined ? hn : hn === undefined ? hl : hl === null || hn === null ? null : hl + hn;
    else { n = c.v.pg56; kind = 'pg56'; }
    if (n === undefined) { a.absent[c.country] = (a.absent[c.country] ?? 0) + 1; continue; }
    if (n === null) { (a.empty[c.country] ??= []).push(c.month); continue; }
    if (!isNum(c.v.hh)) { a.noDen[c.country] = (a.noDen[c.country] ?? 0) + 1; continue; }
    a.num += n; a.den += c.v.hh; a.used++; a.usedCells.push(c);
    const k = kinds.get(c.country); if (k) k.add(kind); else kinds.set(c.country, new Set([kind]));
  }
  const all = new Set<string>(); for (const k of kinds.values()) for (const x of k) all.add(x);
  return fromRate(a, s.cfg.rateConstant, 'hpriLoss, hpriNoLoss, pg56', s.cfg.smallExposureHH, {
    flags: all.size > 1 ? ['mixed_definitions'] : [], secondary: [sec('eng.sec.hipoCount', a.used ? a.num : null, 'events')], statusNote: tr('eng.note.potentialNotConsequence') });
};
const R16: Calc = (s, r) => {
  if (!s.hasRecords) return none('nd', 'eng.reason.needsCaseRecords', { status: 'nodata' });
  let all = 0; let withData = 0; let multi = 0;
  for (const x of s.events) if (x.month >= r.from && x.month <= r.to) for (const c of x.cases) { all++; if (c.bodyParts.length) withData++; if (c.bodyParts.length > 1) multi++; }
  return { state: withData === 0 ? 'zero' : 'ok', value: withData, numerator: withData, denominator: all, secondary: [sec('eng.sec.multiZone', multi, 'cases')], notes: [tr('eng.note.multiSelect')] };
};
const C01 = rate(() => ['accFatal', 'accLti'], 'eng.sec.incapFatal');
const withCharged = (s: Scope, r: Range, den: MeasureKey, constant: number, small: number, extra: Partial<Core> = {}): Core => {
  const a = agg(s, r, ['lostDays'], den, true); let ch = 0; let any = false;
  for (const c of a.usedCells) if (isNum(c.v.chargedDays)) { ch += c.v.chargedDays; any = true; }
  a.num += ch;
  return fromRate(a, constant, 'lostDays', small, { secondary: [sec('eng.sec.lostDays', a.used ? a.num - ch : null, 'days'), ...(any ? [sec('eng.sec.chargedDays', ch, 'days')] : [])],
    notes: [tr(any ? 'eng.note.chargedSeparate' : 'eng.note.chargedNotSeparate')], interval: null, ...extra });
};
const C02: Calc = (s, r) => withCharged(s, r, 'hh', s.cfg.rateConstant, s.cfg.smallExposureHH);
const C03: Calc = (s, r) => {
  const a = agg(s, r, ['accFatal', 'accLti', 'lostDays'], 'hh', true);
  const base = fromRate(a, 1, 'accFatal, accLti, lostDays', s.cfg.smallExposureHH);
  if (base.value === null) return base;
  let ch = 0; for (const c of a.usedCells) if (isNum(c.v.chargedDays)) ch += c.v.chargedDays;
  const k = s.cfg.rateConstant; const IF = ((a.parts[0] + a.parts[1]) * k) / a.den; const IS = ((a.parts[2] + ch) * k) / a.den; const v = (IF * IS) / 1000;
  return { ...base, state: v === 0 ? 'zero' : 'ok', value: v, numerator: IF * IS, denominator: 1000, interval: null, secondary: [sec('eng.sec.if', IF, 'per1e6hh', 2), sec('eng.sec.is', IS, 'per1e6hh', 2)] };
};
const pe = (c: Calc): Calc => (s, r) => { const o = c(s, r); return { ...o, notes: [...(o.notes ?? []), tr('eng.note.peRegulatory')] }; };
const CO01: Calc = (s, r) => fromRate(agg(s, lastMonth(r), LEVELS, 'workers', false), 100, LEVELS.join(', '), 0, { notes: [tr('eng.note.coNotComparable'), tr('eng.note.cutoffMonthOnly', { month: r.to })], interval: null });
const CO02: Calc = (s, r) => withCharged(s, lastMonth(r), 'workers', 100, 0, { notes: [tr('eng.note.coNotComparable'), tr('eng.note.cutoffMonthOnly', { month: r.to })] });
const CO03: Calc = (s, r) => {
  const y = yearTo(r); const tot = agg(s, y, LEVELS, null, false); const fat = agg(s, y, ['accFatal'], null, false);
  if (!tot.used || !fat.used) return none('nd', 'eng.reason.noData', { status: 'nodata' });
  if (tot.num === 0) return none('nd', 'eng.reason.noAccidentsYear', { status: 'nodata', numerator: 0, denominator: 0 });
  return { state: fat.num === 0 ? 'zero' : 'ok', value: (100 * fat.num) / tot.num, numerator: fat.num, denominator: tot.num, notes: [tr('eng.note.yearToDate', { from: y.from, to: y.to })] };
};
const BR01: Calc = (s, r) => fromRate(agg(s, r, ['accNoLostTime', 'accLti'], 'hh', true), s.cfg.rateConstant, 'accNoLostTime, accLti', s.cfg.smallExposureHH, { notes: [tr('eng.note.brTfScope')] });
const BR02: Calc = (s, r) => withCharged(s, r, 'hh', s.cfg.rateConstant, s.cfg.smallExposureHH, { notes: [tr('eng.note.brConfigured')] });

export const RESULTS: Record<string, Impl> = {
  R01: { calc: R01 }, R02: { calc: R02 }, R03: { calc: R03 }, R04: { calc: R04 }, R05: { calc: R05, zeroTol: true }, R06: { calc: R06 }, R07: { calc: R07 },
  R08: { calc: R08 }, R09: { calc: R09 }, R10: { calc: R10 },
  R11: { calc: R11, target: 'IF', targetNote: 'eng.note.targetIfProxy' }, R12: { calc: R12, target: 'TRIFR' },
  R13: { calc: caseRate(['fatalities', 'casesLti', 'casesRestricted', 'casesMedical']) }, R14: { calc: caseRate(['casesLti', 'casesRestricted']) },
  R15: { calc: R15 }, R16: { calc: R16 },
  C01: { calc: C01, target: 'IF' }, C02: { calc: C02, target: 'IS' }, C03: { calc: C03, target: 'IA' }, C04: { calc: R12, target: 'TRIFR' },
  PE01: { calc: pe(C01), target: 'IF', country: 'PE' }, PE02: { calc: pe(C02), target: 'IS', country: 'PE' }, PE03: { calc: pe(C03), target: 'IA', country: 'PE' },
  CO01: { calc: CO01, country: 'CO' }, CO02: { calc: CO02, country: 'CO' }, CO03: { calc: CO03, country: 'CO' },
  BR01: { calc: BR01, country: 'BR' }, BR02: { calc: BR02, country: 'BR' },
};
