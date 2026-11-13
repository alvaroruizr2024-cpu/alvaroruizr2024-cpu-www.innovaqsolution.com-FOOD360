import type { CountryCode, Target, TextRef } from '../domain/types';
import type { CoverageNote, DataState, DetailRow, KpiDef, KpiDetail, KpiValue, StatusLevel, UnitKey } from '../domain/model';
import { type Agg, type Scope, countryScope, coverageNotes, exposedProjects, scopeCountries, targetFor } from './cube';
import { type Range, compareRange, lastN, monthsBetween } from './period';
import { rateCI } from './stats';
import { statusFor, zeroTolerance } from './status';

export interface Core {
  state: DataState; value: number | null; numerator: number | null; denominator: number | null;
  reason?: TextRef | null; coverage?: CoverageNote[]; flags?: string[]; secondary?: KpiValue['secondary'];
  status?: StatusLevel; statusNote?: TextRef | null; unit?: UnitKey; interval?: [number, number] | null;
  numRows?: DetailRow[]; denRows?: DetailRow[]; exclusions?: KpiDetail['exclusions']; notes?: TextRef[]; eligible?: number | null;
}
export type Calc = (s: Scope, r: Range) => Core;
export interface Spec {
  def: KpiDef; calc: Calc; target?: Target['indicator']; targetNote?: string; fixedTarget?: number; zeroTol?: boolean; country?: CountryCode; light?: boolean;
}
export const tr = (key: string, params?: Record<string, string | number>): TextRef => (params ? { key, params } : { key });
export const none = (state: DataState, key: string, extra: Partial<Core> = {}): Core => ({ state, value: null, numerator: null, denominator: null, reason: tr(key), ...extra });
export const sec = (key: string, value: number | null, unit: UnitKey, decimals = 0, params?: Record<string, string | number>): KpiValue['secondary'][number] =>
  ({ label: tr(key, params), value, unit, decimals });

export function fromRate(a: Agg, constant: number, fields: string, smallHH: number, extra: Partial<Core> = {}): Core {
  const coverage = coverageNotes(a, fields);
  if (a.used === 0) return none('nd', a.total === 0 ? 'eng.reason.noData' : Object.keys(a.absent).length && !Object.keys(a.empty).length && !Object.keys(a.noDen).length ? 'eng.reason.fieldAbsent' : 'eng.reason.noPairedData', { coverage, status: 'nodata', ...extra });
  if (!(a.den > 0)) return none('nd', 'eng.reason.zeroDenominator', { coverage, status: 'noexposure', numerator: a.num, denominator: a.den, ...extra });
  const flags = [...(a.den < smallHH ? ['small_exposure'] : []), ...(extra.flags ?? [])];
  return { state: a.num === 0 ? 'zero' : 'ok', value: (a.num * constant) / a.den, numerator: a.num, denominator: a.den, coverage, interval: rateCI(a.num, a.den, constant), ...extra, flags };
}
export function fromCount(a: Agg, fields: string, extra: Partial<Core> = {}): Core {
  const coverage = coverageNotes(a, fields);
  if (a.used === 0) return none('nd', a.total === 0 ? 'eng.reason.noData' : Object.keys(a.absent).length && !Object.keys(a.empty).length ? 'eng.reason.fieldAbsent' : 'eng.reason.notClosed', { coverage, status: 'nodata', ...extra });
  return { state: a.num === 0 ? 'zero' : 'ok', value: a.num, numerator: a.num, denominator: null, coverage, ...extra };
}
/** Porcentaje num/den×100: sin filas → N/D; filas con denominador 0 → N/A (nada exigible). */
export function fromPct(num: number, den: number, rows: number, extra: Partial<Core> = {}): Core {
  if (rows === 0) return none('nd', 'eng.reason.noData', { status: 'nodata', ...extra });
  if (!(den > 0)) return none('na', 'eng.reason.nothingDue', { status: 'na', numerator: num, denominator: den, ...extra });
  return { state: 'ok', value: (100 * num) / den, numerator: num, denominator: den, ...extra };
}

function blank(def: KpiDef, core: Core): KpiValue {
  return {
    id: def.id, state: core.state, value: core.value, unit: core.unit ?? def.unit, decimals: def.decimals, direction: def.direction,
    numerator: core.numerator, denominator: core.denominator, constant: def.constant, reason: core.reason ?? null,
    status: core.status ?? 'nodata', statusNote: core.statusNote ?? null, target: null, compare: null, spark: [], interval: core.interval ?? null,
    coverage: core.coverage ?? [], flags: core.flags ?? [], byCountry: {}, secondary: core.secondary ?? [],
  };
}
function resolveStatus(spec: Spec, core: Core, target: number | null, warnBand: number): StatusLevel {
  if (core.status) return core.status;
  if (core.state === 'na') return 'na';
  if (core.state !== 'ok' && core.state !== 'zero') return 'nodata';
  if (spec.zeroTol) return zeroTolerance(core.value);
  return statusFor(core.value, target, spec.def.direction, warnBand);
}
export function gateState(spec: Spec, s: Scope): Core | null {
  for (const m of spec.def.requires) {
    if (m === 'predictive') continue;
    const av = s.ds.modules[m];
    if (av && av.state === 'pending') return none('pending', av.reasonKey, { status: 'nodata' });
    if (av && av.state === 'disabled') return none('disabled', av.reasonKey, { status: 'nodata' });
  }
  if (spec.country && !s.projects.some((p) => p.country === spec.country)) return none('na', 'eng.reason.outOfScope', { status: 'na' });
  return null;
}
/** Evalúa un KPI en el alcance filtrado. lite = sin comparación, minitendencia ni desglose por país. */
export function evalKpi(spec: Spec, s0: Scope, r: Range, lite = false): KpiValue {
  const gate = gateState(spec, s0);
  if (gate) return withDemo(blank(spec.def, gate), s0);
  const s = spec.country ? countryScope(s0, spec.country) : s0;
  const core = spec.calc(s, r);
  const hit = spec.target ? targetFor(s, spec.target, r.to) : null;
  const tv = hit ? hit.value : spec.fixedTarget ?? null;
  const kv = blank(spec.def, core);
  kv.status = resolveStatus(spec, core, tv, s.cfg.warnBand);
  if (hit) kv.target = { value: hit.value, kind: hit.kind, version: hit.version, note: spec.targetNote ? tr(spec.targetNote) : hit.flagKey ? tr(hit.flagKey) : null };
  else if (spec.fixedTarget !== undefined) kv.target = { value: spec.fixedTarget, kind: 'corporate', version: 'default-v1', note: tr('eng.note.defaultThreshold') };
  if (hit?.scopeUnconfirmed) kv.flags = [...kv.flags, 'target_scope_unconfirmed'];
  if (lite) return withDemo(kv, s0);
  const cr = compareRange(s.f.compare, r);
  if (cr) {
    const c2 = spec.calc(s, cr);
    const a = exposedProjects(s, r); const b = exposedProjects(s, cr);
    const equiv = a.size === b.size && [...a].every((x) => b.has(x));
    const isPct = kv.unit === 'pct';
    const both = kv.value !== null && c2.value !== null;
    const abs = both ? (kv.value as number) - (c2.value as number) : null;
    const pct = both && !isPct && c2.value !== 0 ? (100 * (abs as number)) / (c2.value as number) : null;
    kv.compare = {
      mode: s.f.compare, from: cr.from, to: cr.to, value: c2.value, abs, pct, pp: isPct ? abs : null, coverageEquivalent: equiv,
      note: !equiv ? tr('eng.note.coverageDiffers', { now: a.size, then: b.size }) : both && !isPct && c2.value === 0 ? tr('eng.note.baseZero') : !both ? tr('eng.note.compareUnavailable') : null,
    };
  }
  if (!spec.light) kv.spark = monthsBetween(lastN(r.to, 13).from, r.to).map((m) => ({ month: m, value: spec.calc(s, { from: m, to: m }).value }));
  for (const c of scopeCountries(s)) {
    const cc = spec.calc(countryScope(s, c), r);
    kv.byCountry[c] = { value: cc.value, state: cc.state, numerator: cc.numerator, denominator: cc.denominator, status: resolveStatus(spec, cc, tv, s.cfg.warnBand) };
  }
  return withDemo(kv, s0);
}
function withDemo(kv: KpiValue, s: Scope): KpiValue {
  if (s.ds.kind === 'demo' && !kv.flags.includes('demo')) kv.flags = [...kv.flags, 'demo'];
  return kv;
}
