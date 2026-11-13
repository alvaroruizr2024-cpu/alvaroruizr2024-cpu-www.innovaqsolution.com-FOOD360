import type { CountryCode, Dataset, TextRef } from '../domain/types';
import { COUNTRIES } from '../domain/types';
import type { Filters, KpiDetail, KpiValue, LocalMethodology, ProjectSheet } from '../domain/model';
import { buildSignals } from './alerts';
import { attentionScores } from './attention';
import { kpi, reportedFor, scopeFor, spec } from './catalog';
import { countryScope, restrict, scopeCountries } from './cube';
import { gateState, tr } from './kpi';
import { lastN, monthsBetween, resolveRange } from './period';
import { pendingValue, trendModel } from './sheet';

export function kpiDetail(ds: Dataset | null, f: Filters, id: string): KpiDetail {
  const sp = spec(id);
  if (!ds) return { def: sp.def, value: pendingValue(id), numeratorRows: [], denominatorRows: [], eligibleRecords: null, exclusions: [], reported: null, series: [], byProject: [], notes: [], lastUpdated: null };
  const s0 = scopeFor(ds, f); const r = resolveRange(f); const value = kpi(id, s0, r);
  const gate = gateState(sp, s0); const s = sp.country && !gate ? countryScope(s0, sp.country) : s0;
  const core = gate ?? sp.calc(s, r); const live = !gate && !sp.light;
  const cc = scopeCountries(s);
  const rep = gate ? null : reportedFor(s, r, id);
  const delta = rep && rep.value !== null && value.value !== null ? value.value - rep.value : null;
  const notes: TextRef[] = [...(core.notes ?? []), ...(value.statusNote ? [value.statusNote] : []), ...value.flags.map((x) => tr(`eng.flag.${x}`))];
  return {
    def: sp.def, value,
    numeratorRows: [...(core.numRows ?? []), ...cc.map((c) => ({ label: tr(`country.${c}`), value: value.byCountry[c]?.numerator ?? null }))],
    denominatorRows: [...(core.denRows ?? []), ...cc.map((c) => ({ label: tr(`country.${c}`), value: value.byCountry[c]?.denominator ?? null }))],
    eligibleRecords: core.eligible ?? null,
    exclusions: value.coverage.filter((c) => c.kind !== 'included').map((c) => ({ reason: c.reason, count: typeof c.reason.params?.n === 'number' ? c.reason.params.n : null })),
    reported: rep ? { value: rep.value, ref: rep.ref, delta, note: tr(value.flags.includes('recalculated_differs') ? 'eng.note.recalcDiffers' : rep.value === null ? 'eng.note.storedEmpty' : 'eng.note.recalcMatches') } : null,
    series: live ? monthsBetween(lastN(r.to, 24).from, r.to).map((month) => { const c = sp.calc(s, { from: month, to: month }); return { month, value: c.value, numerator: c.numerator, denominator: c.denominator }; }) : [],
    byProject: live ? s.projects.map((p) => { const c = sp.calc(restrict(s, (x) => x.id === p.id), r); return { projectId: p.id, name: p.name, country: p.country, value: c.value, numerator: c.numerator, denominator: c.denominator, state: c.state }; }) : [],
    notes, lastUpdated: ds.createdAt,
  };
}
const PROJECT_KPIS = ['R01', 'R02', 'R05', 'R06', 'R07', 'R10', 'R11', 'R12', 'R15', 'C01', 'C02', 'C03', 'P04', 'O09', 'O12'];
export function projectSheet(ds: Dataset, f: Filters, projectId: string): ProjectSheet {
  const project = ds.projects.find((p) => p.id === projectId);
  if (!project) throw new Error(`engine: proyecto desconocido ${projectId}`);
  const f2: Filters = { ...f, countries: [], projectIds: [projectId] }; const s = scopeFor(ds, f2); const r = resolveRange(f2);
  const notes: TextRef[] = [...(project.notes ?? [])];
  const at = attentionScores(ds, f2, r.to < ds.cutoffMonth ? r.to : ds.cutoffMonth).get(projectId);
  notes.push(tr('eng.note.attentionScore'));
  if (at && at.missing.length) notes.push(tr('eng.note.attentionReweighted', { n: at.missing.length, vars: at.missing.join(', ') }));
  if (!project.coords) notes.push(tr('eng.map.noCoords', { n: 1 })); else if (!project.coordsVerified) notes.push(tr('eng.map.demoCoords'));
  return { project, kpis: PROJECT_KPIS.map((id) => kpi(id, s, r)), trend: trendModel(s, r), signals: buildSignals(s),
    recon: ds.reconciliation.filter((i) => i.projectId === projectId), notes };
}
const LOCAL: Record<CountryCode, string[]> = { PE: ['PE01', 'PE02', 'PE03'], CO: ['CO01', 'CO02', 'CO03', 'CO04', 'CO05', 'CO06'], BR: ['BR01', 'BR02'] };
const SCHEME = ['C01', 'C02', 'C03', 'C04'];
export function localMethodology(ds: Dataset | null, f: Filters): LocalMethodology {
  const r = resolveRange(f);
  return {
    countries: COUNTRIES.map((code) => {
      let kpis: KpiValue[]; let reportedScheme: KpiValue[];
      if (!ds) { kpis = LOCAL[code].map((id) => pendingValue(id)); reportedScheme = SCHEME.map((id) => pendingValue(id)); }
      else { const s = scopeFor(ds, { ...f, countries: [code], projectIds: [] }); kpis = LOCAL[code].map((id) => kpi(id, s, r)); reportedScheme = SCHEME.map((id) => kpi(id, s, r)); }
      return { code, profile: tr(`eng.local.${code}.profile`), validity: tr(`eng.local.${code}.validity`), population: tr(`eng.local.${code}.population`), kpis, reportedScheme,
        notes: [tr(`eng.local.${code}.note`), tr('eng.local.notComparable')] };
    }),
    rules: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => tr(`eng.rule.${i}`)),
  };
}
