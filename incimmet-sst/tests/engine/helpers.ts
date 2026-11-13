/** Utilidades de prueba: solo datos sintéticos con nombres «DEMO». */
import type { ActionRecord, Availability, CountryCode, Dataset, MeasureKey, ModuleKey, MonthlyFact, PlanActivity, Project } from '../../src/domain/types';
import type { Filters, KpiValue, Prefs } from '../../src/domain/model';
import { createEngine } from '../../src/engine';

export const E = createEngine();
export const PREFS: Prefs = { cards: [], mapLayer: 'events', mapIndicator: null };
const MODS: ModuleKey[] = ['exposure', 'accidents', 'potential', 'cases', 'controls', 'plan', 'actions', 'health', 'hygiene', 'training', 'programs', 'projectsGeo', 'predictive'];
export const AV: Availability = { state: 'available', reasonKey: 'eng.module.demo' };
export const PENDING: Availability = { state: 'pending', reasonKey: 'eng.reason.recordsPending' };
export function proj(id: string, country: CountryCode): Project {
  return { id, name: `DEMO · ${id}`, country, entity: null, client: null, activity: null, status: 'active', coords: null, coordsVerified: false, coordsSource: null, timezone: null, isDemo: true,
    firstMonth: null, lastMonth: null, sourceKey: null, sourceBlock: null };
}
export function fact(projectId: string, country: CountryCode, month: string, v: Partial<Record<MeasureKey, number | null>>, basis: MonthlyFact['basis'] = 'reported_counts'): MonthlyFact {
  return { projectId, country, month, basis, v };
}
/** Conjunto mínimo; por defecto solo conteos reportados (módulos de registros pendientes). */
export function mkDs(over: Partial<Dataset> = {}, available: ModuleKey[] = ['exposure', 'accidents', 'potential']): Dataset {
  return {
    schema: 1, id: 'DEMO-test', kind: 'real', label: 'DEMO prueba', createdAt: '2026-11-13T00:00:00.000Z', cutoffMonth: '2026-10', sources: [], projects: [], monthly: [], reported: [], targets: [],
    events: [], cases: [], controls: [], verifications: [], planActivities: [], actions: [], programStats: [], hygiene: [], reconciliation: [],
    modules: Object.fromEntries(MODS.map((m) => [m, available.includes(m) ? AV : PENDING])) as Record<ModuleKey, Availability>,
    config: { taxonomyVersion: 'DEMO-1', triMeasures: ['accFatal', 'accLti', 'accNv3', 'accNv2'], ltiMeasures: ['accLti'], rateConstant: 1_000_000, warnBand: 0.2, smallExposureHH: 100_000, predictiveApproved: false },
    ...over,
  };
}
export function flt(month = '2026-10', over: Partial<Filters> = {}): Filters {
  return { periodMode: 'month', month, from: month, to: month, compare: 'none', countries: [], projectIds: [], companies: [], activities: [], shifts: [], risks: [], severities: [], eventTypes: [], bodyPart: null, mechanism: null, ...over };
}
export const val = (ds: Dataset | null, f: Filters, id: string): KpiValue => {
  const k = E.kpiValues(ds, f).find((x) => x.id === id);
  if (!k) throw new Error(`KPI ${id}`);
  return k;
};
export function action(id: string, over: Partial<ActionRecord>): ActionRecord {
  return { id, projectId: 'DEMO-A', source: 'inspection', findingKey: null, priority: 'medium', owner: null, openedAt: '2026-10-01', originalDue: '2026-10-20', currentDue: '2026-10-20', reschedules: [], closedAt: null, acceptedAt: null,
    effectivenessRequired: false, effectivenessOk: null, ...over };
}
export function activity(id: string, baselineDue: string, done: boolean, over: Partial<PlanActivity> = {}): PlanActivity {
  return { id, projectId: 'DEMO-A', program: 'training', owner: null, weight: 1, baselineDue, currentDue: baselineDue, reschedules: [], doneAt: done ? baselineDue : null, acceptedAt: done ? baselineDue : null, hasEvidence: done, ...over };
}
/** Recorre un objeto y devuelve todas las claves i18n (TextRef.key) que contiene. */
export function textKeys(x: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(x)) for (const v of x) textKeys(v, out);
  else if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>;
    if (typeof o.key === 'string' && /^[a-z]+\.[\w.]+$/i.test(o.key) && (o.params === undefined || typeof o.params === 'object')) out.add(o.key);
    for (const v of Object.values(o)) textKeys(v, out);
  }
  return out;
}
