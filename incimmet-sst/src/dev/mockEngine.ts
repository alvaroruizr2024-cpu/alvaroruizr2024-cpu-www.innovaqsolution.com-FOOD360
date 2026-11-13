/** SIMULADOR DE DESARROLLO — implementa `Engine` con cifras sintéticas (semilla fija) y nombres «DEMO · …». No contiene datos reales.
 *  Variantes: 'reported' (solo estadísticas mensuales: plan, controles, acciones, salud y casos pendientes; predicción deshabilitada)
 *  y 'full' (todas las bases disponibles y pronóstico marcado como simulación). Sus textos viven en ui.mock.* (src/i18n/ui.ts). */
import type { Availability, CellRef, CountryCode, Dataset, Lang, ModuleKey, Month, MonthlyFact, Priority, Project, ReconItem, StatRow, TextRef } from '../domain/types';
import { COUNTRIES } from '../domain/types';
import { DEFAULT_CARDS_FULL, DEFAULT_CARDS_REPORTED, KPI_IDS } from '../domain/model';
import type {
  ActionsPanelModel, DataState, Engine, ExportTable, FilterOptions, Filters, HealthPanelModel, KpiCompare, KpiDef, KpiDetail, KpiGroup, KpiValue, LocalMethodology,
  MapLayer, MapModel, NextStep, PlanCell, PlanPanelModel, PredictiveGate, Prefs, ProjectRow, ProjectSheet, QualityModel, RiskCell, RiskPanelModel, Series, SheetModel,
  Signal, SignalsModel, SourceStatus, StatusLevel, TrendModel, UnitKey,
} from '../domain/model';
import { makeT } from '../i18n/core';

export type MockVariant = 'reported' | 'full';
const CUTOFF: Month = '2026-10';
const LOADED = '2026-11-10T14:05:00Z';
const NM = 36;
const addM = (m: Month, n: number): Month => { const d = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
const diffM = (a: Month, b: Month): number => (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7));
const MONTHS: Month[] = Array.from({ length: NM }, (_, i) => addM(CUTOFF, i - NM + 1));
const T = (key: string, params?: Record<string, string | number>): TextRef => (params ? { key: `ui.mock.${key}`, params } : { key: `ui.mock.${key}` });
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const pois = (r: () => number, lam: number): number => { const L = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; };

const PROJ: Array<{ id: string; name: string; country: CountryCode; lat: number; lon: number; size: number }> = [
  { id: 'demo-pe-1', name: 'DEMO · Andes Norte', country: 'PE', lat: -9.3, lon: -77.4, size: 1.6 },
  { id: 'demo-pe-2', name: 'DEMO · Quebrada Sur', country: 'PE', lat: -15.6, lon: -71.8, size: 1.1 },
  { id: 'demo-pe-3', name: 'DEMO · Túnel Central', country: 'PE', lat: -12.4, lon: -75.6, size: 0.2 },
  { id: 'demo-co-1', name: 'DEMO · Valle Alto', country: 'CO', lat: 6.6, lon: -75.3, size: 1.0 },
  { id: 'demo-co-2', name: 'DEMO · Cordillera', country: 'CO', lat: 4.2, lon: -73.9, size: 0.7 },
  { id: 'demo-br-1', name: 'DEMO · Serra Azul', country: 'BR', lat: -19.8, lon: -43.6, size: 1.3 },
  { id: 'demo-br-2', name: 'DEMO · Rio Claro', country: 'BR', lat: -6.1, lon: -50.2, size: 0.8 },
];
const RISKS = ['rock_fall', 'vehicles', 'energy', 'explosives', 'height', 'confined'];
const PROGS = ['risk_assessment', 'inspections', 'training', 'drills', 'audits', 'leadership', 'maintenance', 'health_surveillance'];
const BODY: Array<[string, 'front' | 'back' | 'both', number]> = [['hand', 'both', 9], ['back', 'back', 6], ['foot', 'both', 5], ['arm', 'both', 4], ['leg', 'both', 4], ['head', 'both', 3], ['shoulder', 'both', 3], ['trunk', 'front', 2], ['eyes', 'front', 2], ['knee', 'front', 2]];
const MECH: Array<[string, number]> = [['struck_by', 12], ['caught', 8], ['fall_same', 6], ['overexertion', 5], ['fall_height', 3], ['contact', 2]];

interface Row { pi: number; mi: number; hh: number; workers: number; fatal: number; lti: number; nv3: number; nv2: number; nv1: number; hipo: number; pg: number[]; lost: number; train: number }
interface Agg { hh: number; workers: number; fatal: number; lti: number; nv3: number; nv2: number; nv1: number; hipo: number; lost: number; train: number; pg: number[]; n: number }
function build(seed: number): Row[] {
  const r = mulberry32(seed); const rows: Row[] = [];
  PROJ.forEach((p, pi) => MONTHS.forEach((_, mi) => {
    const workers = Math.round(p.size * (205 + 28 * Math.sin(mi / 4 + pi)) * (0.94 + 0.12 * r()));
    const hh = Math.round(workers * (184 + 16 * r()));
    const k = hh / 1e6, drift = 1 + 0.35 * Math.sin((mi + pi * 5) / 7);
    const lti = pois(r, 1.5 * k * drift), nv3 = pois(r, 2.4 * k * drift), nv2 = pois(r, 3.4 * k), nv1 = pois(r, 7 * k), hipo = pois(r, 5 * k * drift);
    const pg = [pois(r, 9 * k), pois(r, 6 * k), pois(r, 4 * k), pois(r, 2.2 * k), pois(r, 0.9 * k)];
    rows.push({ pi, mi, hh, workers, fatal: 0, lti, nv3, nv2, nv1, hipo, pg, lost: lti * Math.round(6 + 22 * r()) + nv3 * Math.round(2 * r()), train: Math.round(workers * (2 + 1.6 * r())) });
  }));
  return rows;
}

type Spec = { num(a: Agg): number; den?(a: Agg): number; k?: number; target?: number };
const hhOf = (a: Agg) => a.hh, tri = (a: Agg) => a.fatal + a.lti + a.nv3 + a.nv2;
const SPECS: Record<string, Spec> = {
  R01: { num: hhOf }, R02: { num: (a) => a.workers }, R03: { num: (a) => tri(a) + a.nv1 + a.hipo }, R05: { num: (a) => a.fatal }, R06: { num: (a) => a.lti },
  R11: { num: (a) => a.lti, den: hhOf, k: 1e6, target: 1.6 }, R12: { num: tri, den: hhOf, k: 1e6, target: 7 }, R15: { num: (a) => a.hipo, den: hhOf, k: 1e6 },
  C01: { num: (a) => a.fatal + a.lti, den: hhOf, k: 1e6 }, C02: { num: (a) => a.lost, den: hhOf, k: 1e6 }, C03: { num: (a) => a.fatal + a.lti, den: hhOf, k: 1e6 }, C04: { num: tri, den: hhOf, k: 1e6 },
};
const groupOf = (id: string): KpiGroup => (id === 'SIG' ? 'SIG' : (id.replace(/\d+$/, '') as KpiGroup));
const CAT: Record<KpiGroup, KpiDef['category']> = { R: 'result', P: 'preventive', O: 'proactive', H: 'health', PE: 'national', CO: 'national', BR: 'national', D: 'predictive', Q: 'quality', C: 'reconciliation', SIG: 'signals' };
const REQ: Record<KpiGroup, ModuleKey[]> = { R: ['exposure', 'accidents'], P: ['controls'], O: ['plan', 'actions'], H: ['health'], PE: ['exposure', 'accidents'], CO: ['exposure', 'accidents'], BR: ['exposure', 'accidents'], D: ['predictive'], Q: ['exposure'], C: ['exposure', 'accidents'], SIG: ['exposure'] };
const SPECIAL: Record<string, Partial<KpiDef>> = {
  R01: { unit: 'hh', decimals: 0, direction: 'context', category: 'exposure', constant: null }, R02: { unit: 'people', decimals: 0, direction: 'context', category: 'exposure', constant: null },
  R03: { unit: 'events', decimals: 0, constant: null }, R05: { unit: 'count', decimals: 0, constant: null }, R06: { unit: 'cases', decimals: 0, constant: null },
  O09: { unit: 'count', decimals: 0, direction: 'down' }, SIG: { unit: 'count', decimals: 0, direction: 'down' },
  D01: { unit: 'events', decimals: 1, direction: 'context' }, D02: { unit: 'probability', decimals: 2, direction: 'context' }, D03: { unit: 'per1e6hh', decimals: 2, direction: 'context' },
};
function def(id: string): KpiDef {
  const g = groupOf(id); const rate = g === 'R' || g === 'C' || g === 'PE' || g === 'CO' || g === 'BR';
  return { id, group: g, category: CAT[g] ?? 'result', unit: rate ? 'per1e6hh' : 'pct', decimals: rate ? 2 : 1, direction: rate ? 'down' : 'up', constant: rate ? 1e6 : null,
    profile: g === 'PE' || g === 'CO' || g === 'BR' ? g : 'corporate', requires: REQ[g] ?? [], version: 'demo-1', effectiveDate: '2026-01-01', ...SPECIAL[id] };
}
const DEFS: Record<string, KpiDef> = Object.fromEntries(KPI_IDS.map((id) => [id, def(id)]));
const AV = (state: Availability['state'], reason: string, requirements?: string[], template?: string): Availability => ({
  state, reasonKey: `ui.mock.${reason}`, ...(requirements ? { requirements: requirements.map((r) => `ui.mock.${r}`) } : {}), ...(template ? { templateFile: `/templates/${template}.csv` } : {}),
});
function modules(v: MockVariant): Record<ModuleKey, Availability> {
  const ok = AV('available', 'av.ok'), full = v === 'full';
  const p = (reason: string, req: string[], tpl: string) => (full ? ok : AV('pending', reason, req, tpl));
  return {
    exposure: ok, accidents: ok, potential: ok, training: ok,
    cases: p('av.cases', ['req.events', 'req.cases'], 'casos'), controls: p('av.controls', ['req.controls', 'req.verifications'], 'controles_criticos'),
    plan: p('av.plan', ['req.plan'], 'plan_anual'), actions: p('av.actions', ['req.actions'], 'acciones'), health: p('av.health', ['req.health'], 'salud_agregada'),
    hygiene: p('av.hygiene', ['req.hygiene'], 'higiene'), programs: p('av.programs', ['req.health'], 'salud_agregada'), projectsGeo: p('av.geo', ['req.geo'], 'proyectos_geo'),
    predictive: full ? AV('partial', 'av.predictiveSim') : AV('disabled', 'av.predictiveOff'),
  };
}
const RECON: ReconItem[] = [
  { id: 'rec-1', severity: 'material', country: 'PE', projectId: 'demo-pe-1', projectName: PROJ[0].name, months: [addM(CUTOFF, -2)], kpisAffected: ['C02', 'R12'], issueKey: 'ui.mock.rec.i1', params: { n: 2 },
    sourceChosenKey: 'ui.mock.rec.src', reasonKey: 'ui.mock.rec.reason', ruleKey: 'ui.mock.rec.rule', reportedValue: 46.1, recalculatedValue: 44.3, delta: -1.8, refs: [{ file: 'DEMO_estadisticas_PE.xlsx', sheet: 'DEMO consolidado', cell: 'M14', formula: '=K14*1000000/D14' }] },
  { id: 'rec-2', severity: 'minor', country: 'CO', projectId: 'demo-co-2', projectName: PROJ[4].name, months: [addM(CUTOFF, -5), addM(CUTOFF, -4)], kpisAffected: ['R01'], issueKey: 'ui.mock.rec.i2', params: { n: 2 },
    sourceChosenKey: 'ui.mock.rec.src', reasonKey: 'ui.mock.rec.reason', ruleKey: 'ui.mock.rec.rule', reportedValue: 131200, recalculatedValue: 130840, delta: -360, refs: [{ file: 'DEMO_estadisticas_CO.xlsx', sheet: 'DEMO proyecto', cell: 'D9' }] },
  { id: 'rec-3', severity: 'info', country: 'BR', projectId: null, projectName: null, months: [CUTOFF], kpisAffected: ['R05', 'R06', 'R11', 'R12'], issueKey: 'ui.mock.rec.i3', params: { n: 1 },
    sourceChosenKey: 'ui.mock.rec.src', reasonKey: 'ui.mock.rec.reason', ruleKey: 'ui.mock.rec.rule', reportedValue: null, recalculatedValue: null, delta: null, refs: [{ file: 'DEMO_estadisticas_BR.xlsx', sheet: 'DEMO consolidado', cell: 'F22' }] },
];

export function createMockEngine(forced: MockVariant | null = null): Engine {
  const ROWS = build(7);
  const variantOf = (ds: Dataset | null): MockVariant => forced ?? (ds?.kind === 'real' ? 'reported' : 'full');
  type Scope = { country?: CountryCode; projectId?: string };
  type FSel = Pick<Filters, 'countries' | 'projectIds'>;
  const ALL: FSel = { countries: [], projectIds: [] };
  const matchP = (f: FSel) => (p: { id: string; country: CountryCode }) => (!f.countries.length || f.countries.includes(p.country)) && (!f.projectIds.length || f.projectIds.includes(p.id));
  const monthsIn = (from: Month, to: Month) => MONTHS.filter((m) => m >= from && m <= to);
  const sparkMonths = (to: Month) => { const end = to > CUTOFF ? CUTOFF : to; return Array.from({ length: 13 }, (_, i) => addM(end, i - 12)); };

  function agg(f: FSel, from: Month, to: Month, o: Scope = {}): Agg {
    const a: Agg = { hh: 0, workers: 0, fatal: 0, lti: 0, nv3: 0, nv2: 0, nv1: 0, hipo: 0, lost: 0, train: 0, pg: [0, 0, 0, 0, 0], n: 0 };
    const last = to > CUTOFF ? CUTOFF : to;
    for (const r of ROWS) {
      const m = MONTHS[r.mi]; if (m < from || m > to) continue;
      const p = PROJ[r.pi];
      if (!matchP(f)(p) || (o.country && p.country !== o.country) || (o.projectId && p.id !== o.projectId)) continue;
      a.hh += r.hh; a.fatal += r.fatal; a.lti += r.lti; a.nv3 += r.nv3; a.nv2 += r.nv2; a.nv1 += r.nv1; a.hipo += r.hipo; a.lost += r.lost; a.train += r.train; a.n++;
      r.pg.forEach((x, i) => { a.pg[i] += x; });
      if (m === last) a.workers += r.workers;
    }
    return a;
  }
  function raw(id: string, f: FSel, from: Month, to: Month, o: Scope = {}): { v: number | null; n: number; d: number | null; hh: number } {
    const s = SPECS[id], a = agg(f, from, to, o);
    if (id === 'C03') { const fr = a.hh > 0 ? ((a.fatal + a.lti) * 1e6) / a.hh : null, sv = a.hh > 0 ? (a.lost * 1e6) / a.hh : null; return { v: fr != null && sv != null ? (fr * sv) / 1000 : null, n: a.fatal + a.lti, d: a.hh, hh: a.hh }; }
    const n = s.num(a);
    if (!s.den) return { v: a.n ? n : null, n, d: null, hh: a.hh };
    const d = s.den(a);
    return { v: d > 0 ? (n * (s.k ?? 1)) / d : null, n, d, hh: a.hh };
  }
  const blank = (id: string, o: Partial<KpiValue>): KpiValue => {
    const d = DEFS[id] ?? def(id);
    return { id, state: 'nd', value: null, unit: d.unit, decimals: d.decimals, direction: d.direction, numerator: null, denominator: null, constant: d.constant, reason: null, status: 'nodata', statusNote: null,
      target: null, compare: null, spark: [], interval: null, coverage: [], flags: ['demo'], byCountry: {}, secondary: [], ...o };
  };
  const statusFor = (id: string, v: number): StatusLevel => { const tg = SPECS[id]?.target; if (tg == null) return id === 'R05' ? (v === 0 ? 'good' : 'crit') : 'neutral'; return v <= tg ? 'good' : v <= tg * 1.2 ? 'warn' : 'crit'; };
  function cmpRange(f: Filters): { from: Month; to: Month } | null {
    if (f.compare === 'none') return null;
    if (f.compare === 'yoy') return { from: addM(f.from, -12), to: addM(f.to, -12) };
    if (f.compare === 'r12') return { from: addM(f.to, -11), to: f.to };
    const len = diffM(f.from, f.to) + 1;
    return { from: addM(f.from, -len), to: addM(f.to, -len) };
  }
  function compare(cur: number | null, base: number | null, f: Filters, unit: UnitKey, c: { from: Month; to: Month }): KpiCompare {
    const abs = cur != null && base != null ? cur - base : null, isPct = unit === 'pct';
    return { mode: f.compare, from: c.from, to: c.to, value: base, abs, pct: !isPct && abs != null && base ? (abs / base) * 100 : null, pp: isPct ? abs : null,
      coverageEquivalent: c.from >= MONTHS[0], note: base === 0 ? T('cmp.zeroBase') : c.from < MONTHS[0] ? T('cmp.coverage') : null };
  }
  function specKpi(id: string, f: Filters, v: MockVariant): KpiValue {
    const s = SPECS[id], d = DEFS[id], cur = raw(id, f, f.from, f.to);
    const spark = sparkMonths(f.to).map((m) => ({ month: m, value: s.den ? raw(id, f, addM(m, -11), m).v : raw(id, f, m, m).v }));
    if (cur.v == null) return blank(id, { state: 'nd', reason: T('reason.noExposure'), status: 'noexposure', spark });
    const c = cmpRange(f), base = c ? raw(id, f, c.from, c.to).v : null, sq = Math.sqrt(Math.max(cur.n, 1));
    const byCountry: KpiValue['byCountry'] = {};
    for (const code of COUNTRIES) {
      if (f.countries.length && !f.countries.includes(code)) continue;
      const r = raw(id, f, f.from, f.to, { country: code });
      byCountry[code] = { value: r.v, state: r.v == null ? 'nd' : r.v === 0 ? 'zero' : 'ok', numerator: r.n, denominator: r.d, status: r.v == null ? 'noexposure' : statusFor(id, r.v) };
    }
    const flags = ['demo'];
    if (s.den && cur.hh < 100000) flags.push('small_exposure');
    if (v === 'reported') { if (id === 'R12') flags.push('mixed_definitions'); if (id === 'C02') flags.push('recalculated_differs'); if (!s.den && id !== 'R01' && id !== 'R02') flags.push('reported_count'); }
    return blank(id, {
      state: cur.v === 0 ? 'zero' : 'ok', value: cur.v, numerator: cur.n, denominator: cur.d, status: statusFor(id, cur.v), reason: cur.v === 0 ? T('reason.zero') : null,
      target: s.target != null ? { value: s.target, kind: 'corporate', version: 'demo-1', note: null } : null, compare: c ? compare(cur.v, base, f, d.unit, c) : null, spark,
      interval: s.den && s.k && cur.d ? [(Math.max(0, cur.n - 1.96 * sq) * s.k) / cur.d, ((cur.n + 1.96 * sq) * s.k) / cur.d] : null,
      coverage: v === 'reported' ? [{ country: 'BR', kind: 'partial', reason: T('cov.unclosed') }] : [], flags, byCountry,
      secondary: s.den ? [{ label: T('sec.r12'), value: raw(id, f, addM(f.to, -11), f.to).v, unit: d.unit, decimals: d.decimals }, { label: T('sec.count'), value: cur.n, unit: 'count', decimals: 0 }] : [],
    });
  }
  const synth = (id: string, m: Month): number => { const h = hash(id), r = mulberry32(h ^ hash(m)); return Math.max(40, Math.min(100, 80 + (h % 17) + (r() - 0.5) * 8 + 3 * Math.sin((diffM(MONTHS[0], m) + (h % 7)) / 5))); };
  function pctKpi(id: string, f: Filters, value: number | null, num: number | null, den: number | null, target = 90, extra: Partial<KpiValue> = {}): KpiValue {
    if (value == null) return blank(id, { state: 'nd', reason: T('reason.noBase'), ...extra });
    const c = cmpRange(f), end = f.to > CUTOFF ? CUTOFF : f.to;
    const shift = (m: Month) => Math.max(0, Math.min(100, value + synth(id, m) - synth(id, end)));
    return blank(id, { state: value === 0 ? 'zero' : 'ok', value, numerator: num, denominator: den, unit: 'pct', decimals: 1, direction: 'up', status: value >= target ? 'good' : value >= target * 0.9 ? 'warn' : 'crit',
      target: { value: target, kind: 'corporate', version: 'demo-1', note: null }, compare: c ? compare(value, shift(c.to), f, 'pct', c) : null, spark: sparkMonths(f.to).map((m) => ({ month: m, value: shift(m) })), ...extra });
  }
  const synthKpi = (id: string, f: Filters, target = 90): KpiValue => {
    const den = 60 + (hash(id) % 140), vals = monthsIn(f.from, f.to).map((m) => synth(id, m));
    const num = vals.length ? Math.round((den * vals.reduce((x, y) => x + y, 0)) / vals.length / 100) : null;
    return pctKpi(id, f, num == null ? null : (num / den) * 100, num, den, target);
  };
  function pred(id: string, f: Filters): KpiValue {
    const a = agg(f, addM(CUTOFF, -11), CUTOFF), lam = tri(a) / 12, hhM = a.hh / 12;
    const base: Partial<KpiValue> = { state: 'ok', status: 'neutral', flags: ['demo', 'simulation'], statusNote: T('note.simulation') };
    if (id === 'D01') return blank(id, { ...base, value: lam, interval: [Math.max(0, lam - 1.96 * Math.sqrt(lam)), lam + 1.96 * Math.sqrt(lam)] });
    if (id === 'D02') return blank(id, { ...base, value: 1 - Math.exp(-lam) });
    if (id === 'D03') return blank(id, { ...base, value: hhM > 0 ? (lam * 1e6) / hhM : null, state: hhM > 0 ? 'ok' : 'nd' });
    return blank(id, { state: 'disabled', status: 'na', reason: T('reason.predictiveOff') });
  }
  function nat(id: string, c: CountryCode, f: Filters, v: MockVariant): KpiValue {
    if (f.countries.length && !f.countries.includes(c)) return blank(id, { state: 'na', status: 'na', reason: T('reason.countryFiltered') });
    const k = specKpi(['R11', 'R12', 'C02', 'C01'][Number(id.replace(/\D/g, '')) % 4], { ...f, countries: [c] }, v);
    return { ...k, id, flags: [...k.flags, 'target_scope_unconfirmed'], target: null, status: k.state === 'nd' ? k.status : 'neutral' };
  }
  function kpi(id: string, f: Filters, v: MockVariant): KpiValue {
    const g = groupOf(id);
    if (!DEFS[id]) return blank(id, { state: 'na', status: 'na' });
    if (SPECS[id]) return specKpi(id, f, v);
    if (id === 'SIG') {
      const s = signalsModel(f, v), n = s.signals.length;
      return blank(id, { state: n === 0 ? 'zero' : 'ok', value: n, status: s.counts.critical ? 'crit' : s.counts.high ? 'warn' : 'good', statusNote: s.predictive.enabled ? T('note.simulation') : T('note.rulesOnly'),
        secondary: [{ label: T('sec.critical'), value: s.counts.critical, unit: 'count', decimals: 0 }, { label: T('sec.high'), value: s.counts.high, unit: 'count', decimals: 0 }],
        flags: s.predictive.isSimulation ? ['demo', 'simulation'] : ['demo'] });
    }
    if (id === 'Q02') { const den = monthsIn(f.from, f.to).length * PROJ.filter(matchP(f)).length, num = v === 'reported' ? Math.max(0, den - 2) : den; return pctKpi(id, f, den ? (num / den) * 100 : null, num, den, 98); }
    if (g === 'PE' || g === 'CO' || g === 'BR') return nat(id, g, f, v);
    if (g === 'D') return v === 'full' ? pred(id, f) : blank(id, { state: 'disabled', status: 'na', reason: T('reason.predictiveOff') });
    if (g === 'R') {
      if (v === 'reported') return blank(id, { state: 'insufficient', status: 'nodata', reason: T('reason.records') });
      const b = specKpi('R12', f, v); const k = 0.25 + (hash(id) % 80) / 100;
      return { ...b, id, value: b.value == null ? null : b.value * k, target: null, status: b.state === 'nd' ? b.status : 'neutral', interval: null, compare: null, secondary: [], spark: b.spark.map((p) => ({ month: p.month, value: p.value == null ? null : p.value * k })) };
    }
    if (v === 'reported' && (g === 'P' || g === 'O' || g === 'H')) return blank(id, { state: 'pending', status: 'nodata', reason: T(`reason.pending.${g}`) });
    if (id === 'O09') return actionsModel(f, v).overdueCritical;
    if (id === 'O12') return planModel(f, v).toDate;
    if (id === 'O13') return planModel(f, v).annual;
    if (id === 'P04') return riskModel(f, v).effectiveness;
    return synthKpi(id, f, id === 'H01' ? 95 : 90);
  }

  function trend(f: Filters, v: MockVariant, o: Scope = {}): TrendModel {
    const hist = MONTHS.slice(-18), fc = v === 'full';
    const months = fc ? [...hist, addM(CUTOFF, 1), addM(CUTOFF, 2), addM(CUTOFF, 3)] : hist;
    const a = hist.map((m) => agg(f, m, m, o)), a12 = hist.map((m) => agg(f, addM(m, -11), m, o));
    const bar = (key: string, role: string, fn: (x: Agg) => number): Series => ({ key, label: T(`series.${key}`), kind: 'bar', colorRole: role,
      points: hist.map((m, i) => ({ month: m, value: a[i].n ? fn(a[i]) : null, ...(v === 'reported' && m === CUTOFF && key === 'lti' ? { flag: 'not_closed' } : {}) })) });
    const rate12 = (key: string, role: string, fn: (x: Agg) => number): Series => ({ key, label: T(`series.${key}`), kind: 'line', colorRole: role, points: hist.map((m, i) => ({ month: m, value: a12[i].hh > 0 ? (fn(a12[i]) * 1e6) / a12[i].hh : null })) });
    const trifr = rate12('trifr12', 'seq-5', tri), lastV = trifr.points[trifr.points.length - 1]?.value ?? null;
    const rates: Series[] = [rate12('ltifr12', 'seq-3', (x) => x.lti), trifr, { key: 'target', label: T('series.target'), kind: 'target', colorRole: 'target', points: months.map((m) => ({ month: m, value: 7 })) }];
    if (fc && lastV != null) {
      const fut = [0, 1, 2, 3].map((n) => ({ month: addM(CUTOFF, n), value: lastV * (1 - 0.012 * n), lo: lastV * (1 - 0.012 * n) * (1 - 0.07 * n), hi: lastV * (1 - 0.012 * n) * (1 + 0.07 * n) }));
      rates.push({ key: 'band', label: T('series.band'), kind: 'band', colorRole: 'seq-5', points: fut.map((p) => ({ month: p.month, value: null, lo: p.lo, hi: p.hi })) });
      rates.push({ key: 'forecast', label: T('series.forecast'), kind: 'forecast', colorRole: 'seq-5', points: fut.map((p) => ({ month: p.month, value: p.value })) });
    }
    return {
      months, selected: { from: f.from, to: f.to },
      charts: [
        { key: 'counts', title: T('chart.counts'), unit: 'events', decimals: 0, stacked: true, notes: [],
          series: [bar('nv1', 'seq-1', (x) => x.nv1), bar('nv2', 'seq-2', (x) => x.nv2), bar('nv3', 'seq-3', (x) => x.nv3), bar('lti', 'seq-4', (x) => x.lti), bar('fatal', 'seq-5', (x) => x.fatal)] },
        { key: 'rates', title: T('chart.rates'), unit: 'per1e6hh', decimals: 2, stacked: false, series: rates, notes: [] },
        { key: 'exposure', title: T('chart.exposure'), unit: 'hh', decimals: 0, stacked: false, series: [bar('hh', 'seq-3', hhOf)], notes: [] },
      ],
      forecast: fc ? { enabled: true, isSimulation: true, cutoff: CUTOFF, reason: null } : { enabled: false, isSimulation: false, cutoff: CUTOFF, reason: T('reason.forecastOff') },
    };
  }
  function mapModel(f: Filters, prefs: Prefs, v: MockVariant, mods: Record<ModuleKey, Availability>): MapModel {
    const ind = prefs.mapIndicator && SPECS[prefs.mapIndicator]?.den ? prefs.mapIndicator : 'R12';
    const st = (val: number | null, hh: number): { status: StatusLevel; state: DataState } => (hh <= 0 ? { status: 'noexposure', state: 'nd' } : val == null ? { status: 'nodata', state: 'nd' } : { status: statusFor(ind, val), state: val === 0 ? 'zero' : 'ok' });
    const countries = COUNTRIES.map((code) => {
      const r = raw(ind, ALL, f.from, f.to, { country: code }), n = PROJ.filter((p) => p.country === code).length;
      return { code, ...st(r.v, r.hh), value: r.v, sizeValue: r.hh, reason: null, projects: n, activeProjects: n, selected: f.countries.includes(code), hasData: r.hh > 0 };
    });
    const mk = PROJ.map((p) => { const r = raw(ind, ALL, f.from, f.to, { projectId: p.id }); return { projectId: p.id, name: p.name, country: p.country, lat: p.lat, lon: p.lon, ...st(r.v, r.hh), value: r.v, sizeValue: r.hh, isDemo: true, selected: f.projectIds.includes(p.id) }; });
    const located = v === 'full';
    const layers = (['events', 'exposure', 'controls', 'actions', 'health'] as MapLayer[]).map((key) => ({ key, availability: key === 'events' ? mods.accidents : key === 'exposure' ? mods.exposure : mods[key] }));
    return { layer: prefs.mapLayer, layers, indicatorId: ind, unit: 'per1e6hh', decimals: 2, sizeUnit: 'hh', period: { from: f.from, to: f.to }, statusDefinition: T('map.statusDef'), countries,
      markers: located ? mk : [], unlocated: located ? [] : mk.map(({ lat: _lat, lon: _lon, ...rest }) => rest), sizeDomain: [0, Math.max(1, ...mk.map((m) => m.sizeValue ?? 0))],
      note: located ? T('map.demoCoords') : T('map.unlocated', { n: mk.length }) };
  }
  function riskModel(f: Filters, v: MockVariant): RiskPanelModel {
    const mods = modules(v);
    const pend = (id: string) => blank(id, { state: 'pending', status: 'nodata', reason: T('reason.pending.P') });
    if (v === 'reported') return { availability: mods.controls, risks: [], projects: [], cells: [], coverage: pend('P03'), effectiveness: pend('P04'), activeFailures: pend('P05') };
    const projects = PROJ.filter(matchP(f)), cells: RiskCell[] = [];
    for (const risk of RISKS) for (const p of projects) {
      const r = mulberry32(hash(risk + p.id + f.to));
      const due = 6 + Math.floor(r() * 10), done = Math.min(due, Math.round(due * (0.76 + 0.26 * r()))), conform = Math.min(done, Math.round(done * (0.8 + 0.22 * r())));
      const activeFailures = risk === 'vehicles' && p.id === 'demo-br-1' ? 1 : 0, cov = due ? (done / due) * 100 : null, eff = done ? (conform / done) * 100 : null, low = Math.min(cov ?? 0, eff ?? 0);
      cells.push({ risk, projectId: p.id, due, done, conform, activeFailures, coveragePct: cov, effectivenessPct: eff, status: activeFailures ? 'crit' : low >= 90 ? 'good' : low >= 75 ? 'warn' : 'crit' });
    }
    const sum = (fn: (c: RiskCell) => number) => cells.reduce((s, c) => s + fn(c), 0);
    const due = sum((c) => c.due), done = sum((c) => c.done), conform = sum((c) => c.conform), fails = sum((c) => c.activeFailures);
    const eff = pctKpi('P04', f, done ? (conform / done) * 100 : null, conform, done, 90);
    return {
      availability: mods.controls, risks: RISKS.map((key) => ({ key, label: T(`risk.${key}`) })), projects: projects.map((p) => ({ id: p.id, name: p.name })), cells,
      coverage: pctKpi('P03', f, due ? (done / due) * 100 : null, done, due, 95),
      effectiveness: fails ? { ...eff, status: 'crit', statusNote: T('note.activeFailure'), flags: [...eff.flags, 'active_critical_failure'] } : eff,
      activeFailures: blank('P05', { state: fails ? 'ok' : 'zero', value: fails, unit: 'count', decimals: 0, direction: 'down', status: fails ? 'crit' : 'good' }),
    };
  }
  function signalsModel(f: Filters, v: MockVariant): SignalsModel {
    const mk = (id: string, ruleId: string, priority: Priority, kind: Signal['kind'], key: string, p: (typeof PROJ)[number] | null, country: CountryCode | null, role: string, due: number, params: Record<string, string | number> = {}): Signal => ({
      id, ruleId, priority, kind, title: T(`sig.${key}.title`, params), whatChanged: T(`sig.${key}.what`, params),
      evidence: [{ text: T(`sig.${key}.ev`, params), ref: { file: `DEMO_estadisticas_${p?.country ?? country ?? 'PE'}.xlsx`, sheet: 'DEMO consolidado', cell: `H${12 + key.length}` } }],
      scope: { country: p?.country ?? country, projectId: p?.id ?? null, projectName: p?.name ?? null }, ownerRole: T(`role.${role}`), dueInDays: due, recommendation: T(`sig.${key}.rec`, params), isDemo: true,
    });
    const signals = [
      ...(v === 'full' ? [mk('sig-ctl', 'DEMO-CTL-01', 'critical', 'control', 'ctl', PROJ[5], null, 'ops', 2), mk('sig-act', 'DEMO-ACT-02', 'high', 'action', 'act', PROJ[0], null, 'sst', 7, { n: 3 })] : []),
      mk('sig-trend', 'DEMO-TRD-01', 'high', 'safety', 'trend', PROJ[3], null, 'sst', 14, { n: 3 }),
      mk('sig-hh', 'DEMO-EXP-03', 'medium', 'exposure', 'hh', PROJ[1], null, 'ops', 14, { pct: 18 }),
      ...(v === 'reported' ? [mk('sig-close', 'DEMO-DAT-01', 'medium', 'data', 'close', null, 'BR', 'data', 5)] : []),
    ].filter((s) => (!f.countries.length || !s.scope.country || f.countries.includes(s.scope.country)) && (!f.projectIds.length || !s.scope.projectId || f.projectIds.includes(s.scope.projectId)));
    const counts: Record<Priority, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    signals.forEach((s) => { counts[s.priority]++; });
    const a = agg(f, addM(CUTOFF, -11), CUTOFF), lam = tri(a) / 12, hhM = a.hh / 12;
    const predictive: PredictiveGate = v === 'full'
      ? { enabled: true, isSimulation: true, reasons: [T('gate.sim')],
          validation: { model: 'DEMO · Poisson con exposición', version: 'demo-0.1', trainedAt: '2026-11-01', window: { from: MONTHS[0], to: CUTOFF }, horizons: [30, 60, 90], sample: { months: NM, events: tri(agg(f, MONTHS[0], CUTOFF)) },
            baselineName: 'DEMO · media móvil 12M', baselineScore: 0.31, candidateScore: 0.27, intervalCoverage: 0.9, calibration: T('gate.calibration'), lastValidatedAt: '2026-11-01' },
          outputs: { expected: ([30, 60, 90] as const).map((h, i) => ({ horizonDays: h, expected: lam * (i + 1), lo: Math.max(0, lam * (i + 1) - 1.96 * Math.sqrt(lam * (i + 1))), hi: lam * (i + 1) + 1.96 * Math.sqrt(lam * (i + 1)) })),
            probability: ([30, 60, 90] as const).map((h, i) => ({ horizonDays: h, p: 1 - Math.exp(-lam * (i + 1)) })), futureRate: hhM > 0 ? { value: (lam * 1e6) / hhM, hhAssumed: hhM, assumption: T('gate.assumption') } : null } }
      : { enabled: false, isSimulation: false, reasons: [T('gate.r1'), T('gate.r2'), T('gate.r3')], validation: null, outputs: null };
    return { signals, counts, predictive };
  }
  function planModel(f: Filters, v: MockVariant): PlanPanelModel {
    const mods = modules(v), year = (f.to > CUTOFF ? CUTOFF : f.to).slice(0, 4);
    const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
    const a12 = months.map((m) => agg(f, m, m)), tot = agg(f, f.from, f.to);
    const hours = blank('O15', { state: tot.n ? 'ok' : 'nd', value: tot.n ? tot.train : null, unit: 'hours', decimals: 0, direction: 'up', status: tot.n ? 'neutral' : 'nodata' });
    const intensity = blank('O16', { state: tot.workers ? 'ok' : 'nd', value: tot.workers ? tot.train / Math.max(1, diffM(f.from, f.to) + 1) / tot.workers : null, unit: 'hours', decimals: 2, direction: 'up', status: tot.workers ? 'neutral' : 'nodata', numerator: tot.train, denominator: tot.workers });
    const training = { availability: mods.training, hours, intensity, monthly: months.map((m, i) => ({ month: m, value: a12[i].n ? a12[i].train : null })) };
    const pend = (id: string) => blank(id, { state: 'pending', status: 'nodata', reason: T('reason.pending.O') });
    if (v === 'reported') return { availability: mods.plan, programs: [], months, cells: [], toDate: pend('O12'), annual: pend('O13'), weighted: pend('O14'), byProgram: [], training };
    const share = Math.max(0.15, PROJ.filter(matchP(f)).length / PROJ.length), lim = f.to > CUTOFF ? CUTOFF : f.to, cells: PlanCell[] = [];
    for (const program of PROGS) months.forEach((m, i) => {
      const r = mulberry32(hash(program + m)), due = Math.max(1, Math.round((4 + Math.floor(r() * 9)) * share));
      if (program === 'drills' && i % 3 !== 2) { cells.push({ program, month: m, due: 0, done: 0, pct: null, state: 'na' }); return; }
      if (m > lim) { cells.push({ program, month: m, due, done: 0, pct: null, state: 'future' }); return; }
      const done = Math.min(due, Math.round(due * (0.72 + 0.32 * r()))), pct = (done / due) * 100;
      cells.push({ program, month: m, due, done, pct, state: pct < 80 ? 'late' : 'ok' });
    });
    const past = cells.filter((c) => c.state === 'ok' || c.state === 'late'), sum = (xs: PlanCell[], fn: (c: PlanCell) => number) => xs.reduce((s, c) => s + fn(c), 0);
    const due = sum(past, (c) => c.due), done = sum(past, (c) => c.done), dueYear = sum(cells, (c) => c.due);
    return {
      availability: mods.plan, programs: PROGS.map((key) => ({ key, label: T(`prog.${key}`) })), months, cells,
      toDate: pctKpi('O12', f, due ? (done / due) * 100 : null, done, due, 90), annual: pctKpi('O13', f, dueYear ? (done / dueYear) * 100 : null, done, dueYear, 75),
      weighted: pctKpi('O14', f, due ? Math.min(100, (done / due) * 100 * 0.97) : null, null, null, 90),
      byProgram: PROGS.map((program) => { const xs = past.filter((c) => c.program === program), d = sum(xs, (c) => c.due), n = sum(xs, (c) => c.done); return { program, due: d, done: n, pct: d ? (n / d) * 100 : null }; }),
      training,
    };
  }
  function healthModel(f: Filters, v: MockVariant): HealthPanelModel {
    const mods = modules(v), a = agg(f, f.from, f.to), full = v === 'full';
    const pend = (id: string) => blank(id, { state: 'pending', status: 'nodata', reason: T('reason.pending.H') });
    const total = a.lti + a.nv3 + a.nv2 + a.nv1, wB = BODY.reduce((s, b) => s + b[2], 0), wM = MECH.reduce((s, m) => s + m[1], 0);
    const kB = f.mechanism ? (MECH.find((m) => m[0] === f.mechanism)?.[1] ?? 0) / wM : 1, kM = f.bodyPart ? (BODY.find((b) => b[0] === f.bodyPart)?.[2] ?? 0) / wB : 1;
    const mech = MECH.map(([key, w]) => ({ key, label: T(`mech.${key}`), cases: Math.round((total * kM * w) / wM) })).sort((x, y) => y.cases - x.cases);
    const mt = mech.reduce((s, m) => s + m.cases, 0); let run = 0;
    const levels: Array<[string, number, number]> = [['5', a.fatal, a.pg[4]], ['4', a.lti, a.pg[3]], ['3', a.nv3, a.pg[2]], ['2', a.nv2, a.pg[1]], ['1', a.nv1, a.pg[0]]];
    return {
      availability: mods.health, injuries: mods.cases,
      bodyParts: full ? BODY.map(([key, view, w]) => ({ key, label: T(`body.${key}`), cases: Math.round((total * kB * w * 1.15) / wB), view })) : [],
      totalCases: full ? Math.round(total * kB * kM) : 0, multiZoneCases: full ? Math.round(total * kB * kM * 0.15) : 0,
      mechanisms: full ? mech.map((m) => { run += m.cases; return { ...m, cumPct: mt ? (run / mt) * 100 : 0 }; }) : [],
      denominatorNote: full && (f.bodyPart || f.mechanism) ? T('health.denominator') : null,
      surveillance: full ? synthKpi('H01', f, 95) : pend('H01'), hygieneOverLimit: full ? { ...synthKpi('H05', f, 90), direction: 'down' } : pend('H05'),
      pyramid: { availability: mods.potential, levels: levels.map(([level, c, p]) => ({ level, label: T(`lvl.${level}`), consequence: a.n ? c : null, potential: a.n ? p : null })), notes: [T('health.pyramidNote')] },
      lostDays: blank('R09', { state: a.n ? (a.lost ? 'ok' : 'zero') : 'nd', value: a.n ? a.lost : null, unit: 'days', decimals: 0, direction: 'down', status: a.n ? 'neutral' : 'nodata' }),
    };
  }
  function actionsModel(f: Filters, v: MockVariant): ActionsPanelModel {
    const mods = modules(v);
    const step = (id: string, key: string, role: string, due: number | null, source: NextStep['source'], ev = false): NextStep => ({ id, text: T(`step.${key}`), evidence: ev ? T(`step.${key}.ev`) : null, ownerRole: T(`role.${role}`), dueInDays: due, source });
    const pend = (id: string) => blank(id, { state: 'pending', status: 'nodata', reason: T('reason.pending.O') });
    if (v === 'reported') {
      return { availability: mods.actions, aging: [], overdueCritical: pend('O09'), overdueTotal: pend('O09'), closure: pend('O10'), onTime: pend('O11'), delay: { median: null, p90: null },
        nextSteps: [step('st-close', 'close', 'data', 5, 'data_quality'), step('st-recon', 'recon', 'data', 10, 'reconciliation', true), step('st-plan', 'plan', 'sst', 15, 'module', true)] };
    }
    const share = Math.max(0.15, PROJ.filter(matchP(f)).length / PROJ.length), r = mulberry32(hash('act' + f.to));
    const aging = (['0-30', '31-60', '61-90', '90+'] as const).map((bucket, i) => ({ bucket, openByAge: Math.round([22, 14, 9, 6][i] * share * (0.8 + 0.4 * r())), overdueByDelay: Math.round([9, 5, 3, 2][i] * share * (0.7 + 0.6 * r())) }));
    const open = aging.reduce((s, b) => s + b.openByAge, 0), overdue = aging.reduce((s, b) => s + b.overdueByDelay, 0), crit = Math.max(0, Math.round(overdue * 0.18));
    return {
      availability: mods.actions, aging,
      overdueCritical: blank('O09', { state: crit ? 'ok' : 'zero', value: crit, status: crit ? 'crit' : 'good', target: { value: 0, kind: 'corporate', version: 'demo-1', note: null },
        secondary: [{ label: T('sec.total'), value: overdue, unit: 'count', decimals: 0 }, { label: T('sec.pctOpen'), value: open ? (overdue / open) * 100 : null, unit: 'pct', decimals: 1 }],
        spark: sparkMonths(f.to).map((m) => ({ month: m, value: Math.round(crit + (synth('O09', m) - synth('O09', f.to > CUTOFF ? CUTOFF : f.to)) / 3) })).map((p) => ({ ...p, value: Math.max(0, p.value) })) }),
      overdueTotal: blank('O09', { state: overdue ? 'ok' : 'zero', value: overdue, status: overdue ? 'warn' : 'good' }),
      closure: synthKpi('O10', f, 85), onTime: synthKpi('O11', f, 85), delay: { median: Math.round(9 + 8 * r()), p90: Math.round(38 + 20 * r()) },
      nextSteps: [step('st-ctl', 'ctl', 'ops', 2, 'signal', true), step('st-act', 'act', 'sst', 7, 'action'), step('st-trend', 'trend', 'sst', 14, 'signal')],
    };
  }
  function projectRows(f: Filters, v: MockVariant): ProjectRow[] {
    return PROJ.filter((p) => !f.countries.length || f.countries.includes(p.country)).map((p) => {
      const a = agg(ALL, f.from, f.to, { projectId: p.id }), n = tri(a), small = a.hh < 100000;
      const ci = (k: number): [number, number] | null => (a.hh > 0 ? [(Math.max(0, k - 1.96 * Math.sqrt(k)) * 1e6) / a.hh, ((k + 1.96 * Math.sqrt(Math.max(k, 1))) * 1e6) / a.hh] : null);
      const trifr = a.hh > 0 ? (n * 1e6) / a.hh : null, ltifr = a.hh > 0 ? (a.lti * 1e6) / a.hh : null;
      return { projectId: p.id, name: p.name, country: p.country, status: 'active', isDemo: true, hasCoords: v === 'full', state: a.hh > 0 ? 'ok' : 'nd', hh: a.hh, workers: a.workers, fatal: a.fatal, lti: a.lti, tri: n, hipo: a.hipo,
        lostDays: a.lost, ltifr, ltifrCI: ci(a.lti), trifr, trifrCI: ci(n), ssoma: null, attention: trifr == null ? null : Math.round(Math.min(100, 18 + trifr * 4.5 + a.hipo * 2.5 + (small ? 8 : 0))),
        statusLevel: trifr == null ? 'nodata' : statusFor('R12', trifr), smallExposure: small, selected: f.projectIds.includes(p.id) };
    });
  }
  function qualityModel(f: Filters, v: MockVariant, ds: Dataset | null): QualityModel {
    const last12 = MONTHS.slice(-12);
    type CovState = QualityModel['coverage'][number]['months'][number]['state'];
    const recon = { material: 0, minor: 0, info: 0 };
    (ds?.reconciliation ?? []).forEach((r) => { recon[r.severity]++; });
    return {
      completeness: synthKpi('Q01', f, 95), exposureCoverage: kpi('Q02', f, v), duplicates: synthKpi('Q03', f, 95), timeliness: synthKpi('Q04', f, 90), freshness: synthKpi('Q05', f, 90),
      coverage: COUNTRIES.map((country) => ({ country, measure: T('q.measure'), months: last12.map((m, i) => { const state: CovState = v === 'reported' && country === 'BR' && m === CUTOFF ? 'not_closed' : v === 'reported' && country === 'CO' && i === 3 ? 'missing' : 'ok'; return { month: m, state }; }) })),
      recon,
    };
  }
  function sheet(ds: Dataset | null, f: Filters, prefs: Prefs): SheetModel {
    const v = variantOf(ds), mods = modules(v), defaults = v === 'full' ? DEFAULT_CARDS_FULL : DEFAULT_CARDS_REPORTED;
    const ids = Array.from({ length: 8 }, (_, i) => (prefs.cards[i] && DEFS[prefs.cards[i]] ? prefs.cards[i] : defaults[i]));
    const sources: SourceStatus[] = COUNTRIES.map((c) => ({ key: c.toLowerCase(), file: `DEMO_estadisticas_${c}.xlsx`, country: c, loadedAt: LOADED, lastDataMonth: v === 'reported' && c === 'BR' ? addM(CUTOFF, -1) : CUTOFF,
      state: v === 'reported' && c === 'BR' ? 'stale' : 'loaded', note: v === 'reported' && c === 'BR' ? T('src.stale') : null }));
    return {
      meta: { datasetKind: ds ? ds.kind : 'none', datasetLabel: ds?.label ?? '', isDemo: true, live: false, cutoffMonth: CUTOFF, lastLoadedAt: LOADED, period: { mode: f.periodMode, from: f.from, to: f.to }, comparePeriod: cmpRange(f), sources, modules: mods,
        banners: [...(v === 'reported' ? [{ level: 'warn' as const, text: T('banner.unclosed') }] : []), ...(ds?.kind === 'real' ? [{ level: 'info' as const, text: T('banner.mockEngine') }] : [])] },
      context: { hh: kpi('R01', f, v), workers: kpi('R02', f, v) }, cards: ids.map((id) => kpi(id, f, v)),
      map: mapModel(f, prefs, v, mods), trend: trend(f, v), risk: riskModel(f, v), signals: signalsModel(f, v), plan: planModel(f, v), health: healthModel(f, v), actions: actionsModel(f, v),
      projects: projectRows(f, v), quality: qualityModel(f, v, ds),
    };
  }
  function kpiDetail(ds: Dataset | null, f: Filters, id: string): KpiDetail {
    const v = variantOf(ds), value = kpi(id, f, v), s = SPECS[id];
    const cref = (c: CountryCode, col: string): CellRef => ({ file: `DEMO_estadisticas_${c}.xlsx`, sheet: 'DEMO consolidado', cell: `${col}${14 + COUNTRIES.indexOf(c)}` });
    const cs = COUNTRIES.filter((c) => !f.countries.length || f.countries.includes(c));
    const row = (c: CountryCode, pick: 'n' | 'd', unit: UnitKey, col: string) => ({ label: { key: `country.${c}` }, value: raw(id, f, f.from, f.to, { country: c })[pick], unit, ref: cref(c, col) });
    return {
      def: DEFS[id] ?? def(id), value,
      numeratorRows: s ? cs.map((c) => row(c, 'n', s.den ? 'count' : (DEFS[id]?.unit ?? 'count'), 'F')) : [], denominatorRows: s?.den ? cs.map((c) => row(c, 'd', 'hh', 'D')) : [],
      eligibleRecords: s ? agg(f, f.from, f.to).n : null, exclusions: s ? [{ reason: T('excl.future'), count: 0 }, { reason: T('excl.noHH'), count: v === 'reported' ? 2 : 0 }] : [],
      reported: v === 'reported' && id === 'C02' && value.value != null ? { value: value.value * 1.04, ref: cref('PE', 'M'), delta: value.value * 0.04, note: T('note.recalc') } : null,
      series: s ? sparkMonths(f.to).map((m) => { const r = raw(id, f, m, m); return { month: m, value: r.v, numerator: r.n, denominator: r.d }; }) : value.spark.map((p) => ({ month: p.month, value: p.value, numerator: null, denominator: null })),
      byProject: s ? PROJ.filter(matchP(f)).map((p) => { const r = raw(id, ALL, f.from, f.to, { projectId: p.id }); return { projectId: p.id, name: p.name, country: p.country, value: r.v, numerator: r.n, denominator: r.d, state: (r.v == null ? 'nd' : r.v === 0 ? 'zero' : 'ok') as DataState }; }) : [],
      notes: [T('note.demo')], lastUpdated: LOADED,
    };
  }
  function demoDataset(): Dataset {
    const projects: Project[] = PROJ.map((p) => ({ id: p.id, name: p.name, country: p.country, entity: 'DEMO · Entidad', client: 'DEMO · Cliente', activity: 'DEMO · Minería subterránea', status: 'active', coords: { lat: p.lat, lon: p.lon },
      coordsVerified: false, coordsSource: 'DEMO', timezone: null, isDemo: true, firstMonth: MONTHS[0], lastMonth: CUTOFF, sourceKey: null, sourceBlock: null }));
    const monthly: MonthlyFact[] = ROWS.map((r) => ({ projectId: PROJ[r.pi].id, country: PROJ[r.pi].country, month: MONTHS[r.mi], basis: 'reported_counts',
      v: { hh: r.hh, workers: r.workers, accFatal: r.fatal, accLti: r.lti, accNv3: r.nv3, accNv2: r.nv2, accNv1: r.nv1, hpriNoLoss: r.hipo, lostDays: r.lost, trainingHours: r.train } }));
    return { schema: 1, id: 'demo-mock', kind: 'demo', label: 'DEMO · Conjunto sintético', createdAt: LOADED, cutoffMonth: CUTOFF, sources: [], projects, monthly, reported: [], targets: [], events: [], cases: [], controls: [], verifications: [],
      planActivities: [], actions: [], programStats: [], hygiene: [], reconciliation: RECON, modules: modules(forced ?? 'full'),
      config: { taxonomyVersion: 'demo-1', triMeasures: ['accFatal', 'accLti', 'accNv3', 'accNv2'], ltiMeasures: ['accLti'], rateConstant: 1e6, warnBand: 0.2, smallExposureHH: 100000, predictiveApproved: false } };
  }
  const defaultFilters = (): Filters => ({ periodMode: 'ytd', month: CUTOFF, from: `${CUTOFF.slice(0, 4)}-01`, to: CUTOFF, compare: 'yoy', countries: [], projectIds: [], companies: [], activities: [], shifts: [], risks: [], severities: [], eventTypes: [], bodyPart: null, mechanism: null });
  function filterOptions(ds: Dataset | null): FilterOptions {
    const has = !!ds && variantOf(ds) === 'full';
    return { months: ds ? MONTHS : [], minMonth: ds ? MONTHS[0] : null, maxMonth: ds ? CUTOFF : null, countries: COUNTRIES.map((code) => ({ code, hasData: !!ds })),
      projects: ds ? PROJ.map((p) => ({ id: p.id, name: p.name, country: p.country, status: 'active' as const, isDemo: true })) : [],
      companies: has ? ['DEMO · Propio', 'DEMO · Contratista A', 'DEMO · Contratista B'] : [], activities: has ? ['DEMO · Desarrollo', 'DEMO · Sostenimiento', 'DEMO · Transporte'] : [], shifts: has ? ['DEMO · Día', 'DEMO · Noche'] : [],
      risks: has ? ['DEMO · Caída de rocas', 'DEMO · Vehículos', 'DEMO · Energías'] : [], severities: has ? ['DEMO · Nivel 1', 'DEMO · Nivel 2', 'DEMO · Nivel 3'] : [], eventTypes: has ? ['DEMO · Accidente', 'DEMO · Incidente', 'DEMO · Casi accidente'] : [],
      availableDims: { company: has, activity: has, shift: has, risk: has, severity: has, eventType: has, bodyPart: has, mechanism: has } };
  }
  function localMethodology(ds: Dataset | null, f: Filters): LocalMethodology {
    const v = variantOf(ds);
    return {
      countries: COUNTRIES.map((code) => ({ code, profile: T('meth.profile', { country: code }), validity: T('meth.validity'), population: T('meth.population'),
        kpis: KPI_IDS.filter((id) => groupOf(id) === code).map((id) => kpi(id, f, v)), reportedScheme: ['C01', 'C02', 'C03', 'C04'].map((id) => kpi(id, { ...f, countries: [code] }, v)), notes: [T('meth.note')] })),
      rules: [T('meth.rule1'), T('meth.rule2'), T('meth.rule3')],
    };
  }
  function exportTables(ds: Dataset, f: Filters, lang: Lang): ExportTable[] {
    const t = makeT(lang), v = variantOf(ds);
    const meta: Array<[string, string]> = [[t('ui.export.meta.dataset'), ds.label], [t('ui.export.meta.period'), `${f.from} – ${f.to}`], [t('ui.export.meta.countries'), (f.countries.length ? f.countries : COUNTRIES).join(' ')],
      [t('ui.export.meta.cutoff'), CUTOFF], [t('ui.export.meta.methodology'), 'demo-1'], [t('ui.export.meta.kind'), t('ui.demo.badge')]];
    const rows = ROWS.filter((r) => { const m = MONTHS[r.mi]; return m >= f.from && m <= f.to && matchP(f)(PROJ[r.pi]); });
    return [
      { key: 'kpi', title: t('ui.export.table.kpi'), columns: [t('ui.col.code'), t('ui.col.value'), t('ui.col.unit'), t('ui.col.state')], meta,
        rows: KPI_IDS.map((id) => { const k = kpi(id, f, v); return [id, k.value == null ? null : Number(k.value.toFixed(k.decimals)), t(`unit.${k.unit}`), t(`ui.state.${k.state}`)]; }) },
      { key: 'monthly', title: t('ui.export.table.monthly'), columns: [t('ui.col.month'), t('ui.col.country'), t('ui.col.project'), t('ui.col.hh'), t('ui.col.workers'), 'LTI', 'TRI', t('ui.col.hipo'), t('ui.col.lostDays')], meta,
        rows: rows.map((r) => [MONTHS[r.mi], PROJ[r.pi].country, PROJ[r.pi].name, r.hh, r.workers, r.lti, r.fatal + r.lti + r.nv3 + r.nv2, r.hipo, r.lost]) },
      { key: 'projects', title: t('ui.export.table.projects'), columns: [t('ui.col.project'), t('ui.col.country'), t('ui.col.hh'), 'LTIFR', 'TRIFR', t('ui.col.attention')], meta,
        rows: projectRows(f, v).map((p) => [p.name, p.country, p.hh, p.ltifr == null ? null : Number(p.ltifr.toFixed(2)), p.trifr == null ? null : Number(p.trifr.toFixed(2)), p.attention]) },
    ];
  }
  const statRows = (): StatRow[] => ROWS.map((r) => ({ country: PROJ[r.pi].country, project: PROJ[r.pi].name, month: MONTHS[r.mi], population: 'DEMO', indicator: 'hh', rawValue: r.hh, value: r.hh, unit: 'HH', periodType: 'month',
    file: `DEMO_estadisticas_${PROJ[r.pi].country}.xlsx`, sheet: 'DEMO proyecto', cell: `D${r.mi + 2}`, formula: null, quality: 'ok', version: 'demo-1', valueKind: 'stored' }));

  return {
    catalog: () => KPI_IDS.map((id) => DEFS[id]),
    defaultFilters, defaultCards: (ds) => (variantOf(ds) === 'full' ? DEFAULT_CARDS_FULL : DEFAULT_CARDS_REPORTED), filterOptions, sheet,
    kpiValues: (ds, f) => KPI_IDS.map((id) => kpi(id, f, variantOf(ds))), kpiDetail,
    projectSheet: (ds, f, projectId): ProjectSheet => {
      const v = variantOf(ds), pf: Filters = { ...f, countries: [], projectIds: [projectId] };
      return { project: ds.projects.find((p) => p.id === projectId) ?? demoDataset().projects.find((p) => p.id === projectId) ?? demoDataset().projects[0],
        kpis: ['R01', 'R02', 'R05', 'R06', 'R11', 'R12', 'R15', 'C02'].map((id) => kpi(id, pf, v)), trend: trend(pf, v), signals: signalsModel(pf, v).signals.filter((s) => s.scope.projectId === projectId),
        recon: ds.reconciliation.filter((r) => r.projectId === projectId), notes: [T('note.demo')] };
    },
    localMethodology, exportTables, statRows, demoDataset,
  };
}
