import type { Availability, CountryCode, Dataset, MeasureKey, ModuleKey } from '../domain/types';
import { COUNTRIES } from '../domain/types';
import type {
  Filters, KpiValue, MapCountry, MapLayer, MapMarker, MapModel, Prefs, QualityModel, Series, SheetMeta, SheetModel, SourceStatus, StatusLevel, TrendChart, TrendModel,
} from '../domain/model';
import { DEFAULT_CARDS_FULL, DEFAULT_CARDS_REPORTED, KPI_IDS } from '../domain/model';
import { buildSignals, signalCounts } from './alerts';
import { projectRows } from './attention';
import { kpi, scopeFor } from './catalog';
import { type Scope, LEVELS, agg, cellsIn, countryScope, isNum, restrict, scopeCountries, targetFor } from './cube';
import { DEF } from './defs';
import { tr } from './kpi';
import { type Ctx, actionsPanel, healthPanel, planPanel, riskPanel } from './panels';
import { type Range, addMonths, compareRange, lastN, monthsBetween, r12, resolveRange } from './period';
import { PRED, muOf, predictive } from './predictive';
import { coverageMatrix } from './quality';
import { nbQuantile, rateCI } from './stats';

const MODULES: ModuleKey[] = ['exposure', 'accidents', 'potential', 'cases', 'controls', 'plan', 'actions', 'health', 'hygiene', 'training', 'programs', 'projectsGeo', 'predictive'];
const NO_DS: Availability = { state: 'pending', reasonKey: 'eng.reason.noDataset' };
export function pendingValue(id: string, key = 'eng.reason.noDataset'): KpiValue {
  const d = DEF.get(id)!;
  return { id, state: 'pending', value: null, unit: d.unit, decimals: d.decimals, direction: d.direction, numerator: null, denominator: null, constant: d.constant, reason: tr(key),
    status: 'nodata', statusNote: null, target: null, compare: null, spark: [], interval: null, coverage: [], flags: [], byCountry: {}, secondary: [] };
}
export function defaultCards(ds: Dataset | null): string[] {
  const full = !!ds && (['controls', 'plan', 'actions', 'health'] as ModuleKey[]).every((m) => ds.modules[m]?.state === 'available');
  return [...(full ? DEFAULT_CARDS_FULL : DEFAULT_CARDS_REPORTED)];
}
const validCards = (cards: string[] | undefined): boolean => !!cards && cards.length === 8 && cards.every((id) => KPI_IDS.includes(id));

const LAYER: Record<MapLayer, { module: ModuleKey; kpi: string }> = {
  events: { module: 'accidents', kpi: 'R11' }, exposure: { module: 'exposure', kpi: 'R01' }, controls: { module: 'controls', kpi: 'P04' }, actions: { module: 'actions', kpi: 'O09' }, health: { module: 'health', kpi: 'H01' } };
const EVENT_INDICATORS = ['R11', 'R12', 'R15', 'C01', 'C04'];
function mapStatus(kv: KpiValue, sc: Scope, r: Range, hh: number | null): StatusLevel {
  if (kv.state === 'na') return 'na';
  if (kv.state === 'ok' || kv.state === 'zero') return kv.status;
  if (kv.state === 'nd' && cellsIn(sc, r).length > 0 && (hh === null || hh === 0)) return 'noexposure';
  return 'nodata';
}
export function mapModel(ds: Dataset, s: Scope, r: Range, prefs: Prefs): MapModel {
  const layer: MapLayer = prefs.mapLayer in LAYER ? prefs.mapLayer : 'events';
  const id = layer === 'events' && prefs.mapIndicator && EVENT_INDICATORS.includes(prefs.mapIndicator) ? prefs.mapIndicator : LAYER[layer].kpi;
  const full = scopeFor(ds, { ...s.f, countries: [], projectIds: [] }); const def = DEF.get(id)!;
  const hhOf = (sc: Scope): number | null => { const a = agg(sc, r, ['hh'], null, false); return a.used ? a.num : null; };
  const countries: MapCountry[] = COUNTRIES.map((code) => {
    const cs = countryScope(full, code); const has = cs.projects.length > 0;
    const sel = s.f.countries.includes(code);
    if (!has) return { code, status: 'nodata', state: 'nd', value: null, sizeValue: null, reason: tr('eng.reason.noProjects'), projects: 0, activeProjects: 0, selected: sel, hasData: false };
    const kv = kpi(id, cs, r, true); const hh = hhOf(cs);
    return { code, status: mapStatus(kv, cs, r, hh), state: kv.state, value: kv.value, sizeValue: hh, reason: kv.reason, projects: cs.projects.length,
      activeProjects: cs.projects.filter((p) => p.status === 'active').length, selected: sel, hasData: cs.cells.length > 0 };
  });
  const markers: MapMarker[] = []; const unlocated: MapModel['unlocated'] = [];
  for (const p of full.projects) {
    const ps = restrict(full, (x) => x.id === p.id); const kv = kpi(id, ps, r, true); const hh = hhOf(ps);
    const base = { projectId: p.id, name: p.name, country: p.country, status: mapStatus(kv, ps, r, hh), state: kv.state, value: kv.value, sizeValue: hh, isDemo: p.isDemo, selected: s.f.projectIds.includes(p.id) };
    if (p.coords) markers.push({ ...base, lat: p.coords.lat, lon: p.coords.lon }); else unlocated.push(base);
  }
  const sizes = [...markers, ...countries].map((x) => x.sizeValue).filter(isNum);
  return {
    layer, layers: (Object.keys(LAYER) as MapLayer[]).map((key) => ({ key, availability: ds.modules[LAYER[key].module] })), indicatorId: id, unit: def.unit, decimals: def.decimals, sizeUnit: 'hh',
    period: { from: r.from, to: r.to }, statusDefinition: tr(`eng.map.statusDef.${layer}`, { band: Math.round(ds.config.warnBand * 100) }), countries, markers, unlocated,
    sizeDomain: sizes.length ? [Math.min(...sizes), Math.max(...sizes)] : [0, 0],
    note: markers.some((m) => m.isDemo) ? tr('eng.map.demoCoords') : unlocated.length ? tr('eng.map.noCoords', { n: unlocated.length }) : null,
  };
}

export function trendModel(s: Scope, r: Range): TrendModel {
  const months = monthsBetween(lastN(r.to, 24).from, r.to); const K = s.cfg.rateConstant; const pred = predictive(s);
  const monthly = (k: MeasureKey) => months.map((month) => {
    const a = agg(s, { from: month, to: month }, [k], null, false);
    return { month, value: a.used ? a.num : null, flag: Object.keys(a.empty).length ? 'not_closed' : month > s.cutoff ? 'future' : null };
  });
  const counts: Series[] = LEVELS.map((k, i) => ({ key: k, label: tr(`eng.measure.${k}`), kind: 'bar' as const, colorRole: `seq-${i + 1}`, points: monthly(k) }));
  if (!s.hasRecords && scopeCountries(s).includes('BR')) counts.push({ key: 'accNoLostTime', label: tr('eng.measure.accNoLostTime'), kind: 'bar', colorRole: 'series-3', points: monthly('accNoLostTime') });
  if (pred.gate.enabled && pred.fit && pred.end === r.to) {
    const fit = pred.fit; const mu = muOf(fit, 1);
    counts.push({ key: 'forecast', label: tr('eng.trend.forecast'), kind: 'forecast', colorRole: 'forecast',
      points: [1, 2, 3].map((i) => ({ month: addMonths(pred.end, i), value: mu, lo: nbQuantile(0.1, fit.a, mu), hi: nbQuantile(0.9, fit.a, mu), flag: pred.gate.isSimulation ? 'simulation' : null })) });
  }
  const rate12 = (ks: MeasureKey[]) => months.map((month) => {
    const a = agg(s, r12(month), ks, 'hh', true); const ok = a.used > 0 && a.den > 0; const ci = ok ? rateCI(a.num, a.den, K) : null;
    return { month, value: ok ? (a.num * K) / a.den : null, lo: ci ? ci[0] : null, hi: ci ? ci[1] : null, flag: ok && a.den < s.cfg.smallExposureHH ? 'small_exposure' : null };
  });
  const charts: TrendChart[] = [
    { key: 'counts', title: tr('eng.trend.counts'), unit: 'events', decimals: 0, stacked: true, series: counts, notes: [tr(s.hasRecords ? 'eng.trend.countsRecordsNote' : 'eng.note.reportedCount')] },
    { key: 'rates', title: tr('eng.trend.rates'), unit: 'per1e6hh', decimals: 2, stacked: false, notes: [tr('eng.trend.ratesNote')], series: [
      { key: 'R11', label: tr('eng.trend.ltifr12'), kind: 'line', colorRole: 'series-1', points: rate12(s.cfg.ltiMeasures) },
      { key: 'R12', label: tr('eng.trend.trifr12'), kind: 'line', colorRole: 'series-2', points: rate12(s.cfg.triMeasures) },
      { key: 'target', label: tr('eng.trend.targetTrifr'), kind: 'target', colorRole: 'target', points: months.map((month) => ({ month, value: targetFor(s, 'TRIFR', month)?.value ?? null })) },
    ] },
    { key: 'exposure', title: tr('eng.trend.exposure'), unit: 'hh', decimals: 0, stacked: false, series: [{ key: 'hh', label: tr('eng.measure.hh'), kind: 'bar', colorRole: 'series-1', points: monthly('hh') }],
      notes: [tr('eng.trend.headcountNote', { workers: Math.round(agg(s, { from: r.to, to: r.to }, ['workers'], null, false).num) })] },
  ];
  return { months, selected: { from: r.from, to: r.to }, charts,
    forecast: { enabled: pred.gate.enabled, isSimulation: pred.gate.isSimulation, cutoff: pred.months.length ? pred.end : null, reason: pred.gate.enabled ? (pred.gate.isSimulation ? tr('eng.pred.simulation') : null) : pred.gate.reasons[0] ?? tr('eng.pred.reason.noEvaluation') } };
}
export function qualityModel(c: Ctx): QualityModel {
  const cc = new Set<CountryCode>(scopeCountries(c.s)); const items = c.ds.reconciliation.filter((i) => i.country === null || cc.has(i.country));
  const n = (sev: string): number => items.filter((i) => i.severity === sev).length;
  return { completeness: c.kv('Q01'), exposureCoverage: c.kv('Q02'), duplicates: c.kv('Q03'), timeliness: c.kv('Q04'), freshness: c.kv('Q05'), coverage: coverageMatrix(c.s, c.r.to),
    recon: { material: n('material'), minor: n('minor'), info: n('info') } };
}
function metaOf(ds: Dataset, s: Scope, f: Filters, r: Range): SheetMeta {
  const sources: SourceStatus[] = ds.sources.map((x) => { const stale = !!x.lastDataMonth && x.lastDataMonth < ds.cutoffMonth;
    return { key: x.key, file: x.name, country: x.country, loadedAt: x.loadedAt, lastDataMonth: x.lastDataMonth, state: stale ? 'stale' as const : 'loaded' as const, note: stale ? tr('eng.source.stale', { last: x.lastDataMonth ?? '', cutoff: ds.cutoffMonth }) : null }; });
  for (const c of COUNTRIES) if (!ds.projects.some((p) => p.country === c)) sources.push({ key: `missing-${c}`, file: null, country: c, loadedAt: null, lastDataMonth: null, state: 'missing', note: tr('eng.source.missing') });
  const banners: SheetMeta['banners'] = [];
  if (ds.kind === 'demo') banners.push({ level: 'info', text: tr('eng.banner.demo') });
  if (r.to > ds.cutoffMonth) banners.push({ level: 'warn', text: tr('eng.banner.afterCutoff', { cutoff: ds.cutoffMonth }) });
  for (const c of scopeCountries(s)) {
    const open = cellsIn(countryScope(s, c), { from: r.to, to: r.to }).some((x) => isNum(x.v.hh) && x.v.hh > 0 && [...LEVELS, 'accNoLostTime' as MeasureKey].some((k) => x.v[k] === null));
    if (open) banners.push({ level: 'warn', text: tr('eng.banner.notClosed', { country: c, month: r.to }) });
  }
  const g = predictive(s).gate; if (g.enabled && g.isSimulation) banners.push({ level: 'info', text: tr('eng.banner.simulation') });
  const loaded = ds.sources.map((x) => x.loadedAt).sort(); const cmp = compareRange(f.compare, r);
  return { datasetKind: ds.kind, datasetLabel: ds.label, isDemo: ds.kind === 'demo', live: false, cutoffMonth: ds.cutoffMonth, lastLoadedAt: loaded.length ? loaded[loaded.length - 1] : ds.createdAt,
    period: { mode: f.periodMode, from: r.from, to: r.to }, comparePeriod: cmp, sources, modules: ds.modules, banners };
}
function emptySheet(f: Filters, prefs: Prefs): SheetModel {
  const r = resolveRange(f); const pv = (id: string): KpiValue => pendingValue(id);
  const mods = Object.fromEntries(MODULES.map((m) => [m, NO_DS])) as Record<ModuleKey, Availability>;
  const months = monthsBetween(lastN(r.to, 24).from, r.to); const layer: MapLayer = prefs.mapLayer in LAYER ? prefs.mapLayer : 'events';
  return {
    meta: { datasetKind: 'none', datasetLabel: '', isDemo: false, live: false, cutoffMonth: null, lastLoadedAt: null, period: { mode: f.periodMode, from: r.from, to: r.to }, comparePeriod: compareRange(f.compare, r),
      sources: COUNTRIES.map((c) => ({ key: `missing-${c}`, file: null, country: c, loadedAt: null, lastDataMonth: null, state: 'missing' as const, note: tr('eng.source.missing') })), modules: mods, banners: [{ level: 'info', text: tr('eng.banner.noDataset') }] },
    context: { hh: pv('R01'), workers: pv('R02') }, cards: (validCards(prefs.cards) ? prefs.cards : DEFAULT_CARDS_REPORTED).map(pv),
    map: { layer, layers: (Object.keys(LAYER) as MapLayer[]).map((key) => ({ key, availability: NO_DS })), indicatorId: LAYER[layer].kpi, unit: DEF.get(LAYER[layer].kpi)!.unit, decimals: DEF.get(LAYER[layer].kpi)!.decimals, sizeUnit: 'hh',
      period: { from: r.from, to: r.to }, statusDefinition: tr(`eng.map.statusDef.${layer}`, { band: 20 }),
      countries: COUNTRIES.map((code) => ({ code, status: 'nodata' as const, state: 'pending' as const, value: null, sizeValue: null, reason: tr('eng.reason.noDataset'), projects: 0, activeProjects: 0, selected: f.countries.includes(code), hasData: false })),
      markers: [], unlocated: [], sizeDomain: [0, 0], note: null },
    trend: { months, selected: { from: r.from, to: r.to }, charts: [], forecast: { enabled: false, isSimulation: false, cutoff: null, reason: tr('eng.reason.noDataset') } },
    risk: { availability: NO_DS, risks: [], projects: [], cells: [], coverage: pv('P03'), effectiveness: pv('P04'), activeFailures: pv('P05') },
    signals: { signals: [], counts: { critical: 0, high: 0, medium: 0, low: 0 }, predictive: { enabled: false, isSimulation: false, reasons: [tr('eng.reason.noDataset')], validation: null, outputs: null } },
    plan: { availability: NO_DS, programs: [], months: [], cells: [], toDate: pv('O12'), annual: pv('O13'), weighted: pv('O14'), byProgram: [], training: { availability: NO_DS, hours: pv('P17'), intensity: pv('P18'), monthly: [] } },
    health: { availability: NO_DS, injuries: NO_DS, bodyParts: [], totalCases: 0, multiZoneCases: 0, mechanisms: [], denominatorNote: null, surveillance: pv('H01'), hygieneOverLimit: pv('H04'),
      pyramid: { availability: NO_DS, levels: [], notes: [] }, lostDays: pv('R10') },
    actions: { availability: NO_DS, aging: [], overdueCritical: pv('O09'), overdueTotal: pv('O09'), closure: pv('O07'), onTime: pv('O08'), delay: { median: null, p90: null }, nextSteps: [] },
    projects: [],
    quality: { completeness: pv('Q01'), exposureCoverage: pv('Q02'), duplicates: pv('Q03'), timeliness: pv('Q04'), freshness: pv('Q05'), coverage: [], recon: { material: 0, minor: 0, info: 0 } },
  };
}
export function buildSheet(ds: Dataset | null, f: Filters, prefs: Prefs): SheetModel {
  if (!ds) return emptySheet(f, prefs);
  const s = scopeFor(ds, f); const r = resolveRange(f); const memo = new Map<string, KpiValue>();
  const kv = (id: string): KpiValue => { let v = memo.get(id); if (!v) { v = kpi(id, s, r); memo.set(id, v); } return v; };
  const c: Ctx = { ds, s, r, kv }; const sig = buildSignals(s);
  return {
    meta: metaOf(ds, s, f, r), context: { hh: kv('R01'), workers: kv('R02') }, cards: (validCards(prefs.cards) ? prefs.cards : defaultCards(ds)).map(kv),
    map: mapModel(ds, s, r, prefs), trend: trendModel(s, r), risk: riskPanel(c),
    signals: { signals: sig, counts: signalCounts(sig), predictive: predictive(s).gate },
    plan: planPanel(c), health: healthPanel(c), actions: actionsPanel(c), projects: projectRows(s, r), quality: qualityModel(c),
  };
}
export { PRED };
