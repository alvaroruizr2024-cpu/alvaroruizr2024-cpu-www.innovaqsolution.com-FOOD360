import type { CountryCode, Dataset } from '../domain/types';
import { COUNTRIES } from '../domain/types';
import type { Engine, FilterOptions, Filters } from '../domain/model';
import { KPI_IDS } from '../domain/model';
import '../i18n/eng';
import { kpi, scopeFor } from './catalog';
import { DEFS } from './defs';
import { demoDataset } from './demo';
import { kpiDetail, localMethodology, projectSheet } from './detail';
import { exportTables, statRows } from './exportTables';
import { resolveRange } from './period';
import { buildSheet, defaultCards, pendingValue } from './sheet';

const uniq = (xs: Array<string | null | undefined>): string[] => [...new Set(xs.filter((x): x is string => typeof x === 'string' && x.length > 0))].sort();
function defaultFilters(ds: Dataset | null): Filters {
  const month = ds?.cutoffMonth ?? '2026-10';
  return { periodMode: 'month', month, from: month, to: month, compare: 'yoy', countries: [], projectIds: [], companies: [], activities: [], shifts: [], risks: [], severities: [], eventTypes: [], bodyPart: null, mechanism: null };
}
function filterOptions(ds: Dataset | null): FilterOptions {
  if (!ds) return { months: [], minMonth: null, maxMonth: null, countries: COUNTRIES.map((code) => ({ code, hasData: false })), projects: [], companies: [], activities: [], shifts: [], risks: [], severities: [], eventTypes: [],
    availableDims: { company: false, activity: false, shift: false, risk: false, severity: false, eventType: false, bodyPart: false, mechanism: false } };
  const months = uniq(ds.monthly.map((m) => m.month)).filter((m) => m <= ds.cutoffMonth);
  const withData = new Set<CountryCode>(ds.monthly.map((m) => m.country));
  const companies = uniq([...ds.monthly.map((m) => m.company), ...ds.events.map((e) => e.company)]);
  const activities = uniq([...ds.monthly.map((m) => m.activity), ...ds.events.map((e) => e.activity)]);
  const shifts = uniq([...ds.monthly.map((m) => m.shift), ...ds.events.map((e) => e.shift)]);
  const risks = uniq([...ds.events.map((e) => e.risk), ...ds.controls.map((c) => c.risk)]);
  const severities = uniq(ds.cases.map((c) => c.classification)); const eventTypes = uniq(ds.events.map((e) => e.type));
  return {
    months, minMonth: months[0] ?? null, maxMonth: months[months.length - 1] ?? null, countries: COUNTRIES.map((code) => ({ code, hasData: withData.has(code) })),
    projects: ds.projects.map((p) => ({ id: p.id, name: p.name, country: p.country, status: p.status, isDemo: p.isDemo })), companies, activities, shifts, risks, severities, eventTypes,
    availableDims: { company: companies.length > 0, activity: activities.length > 0, shift: shifts.length > 0, risk: risks.length > 0, severity: severities.length > 0, eventType: eventTypes.length > 0,
      bodyPart: ds.cases.some((c) => c.bodyParts.length > 0), mechanism: ds.events.some((e) => e.mechanism !== null) },
  };
}
/** Capa de cálculo pura y síncrona (sin DOM): el mismo conjunto y los mismos filtros producen siempre el mismo resultado. */
export function createEngine(): Engine {
  return {
    catalog: () => DEFS.map((d) => ({ ...d, requires: [...d.requires] })),
    defaultFilters, defaultCards, filterOptions,
    sheet: buildSheet,
    kpiValues: (ds, f) => (ds ? (() => { const s = scopeFor(ds, f); const r = resolveRange(f); return KPI_IDS.map((id) => kpi(id, s, r)); })() : KPI_IDS.map((id) => pendingValue(id))),
    kpiDetail, projectSheet, localMethodology, exportTables, statRows, demoDataset,
  };
}
export { demoDataset } from './demo';
export { METHOD_VERSION } from './defs';
export { ATTENTION_WEIGHTS } from './attention';
export { TH as SIGNAL_THRESHOLDS } from './alerts';
export { PRED as PREDICTIVE_PARAMS } from './predictive';
export { pendingModule, PENDING_CAPABLE } from './modules';
