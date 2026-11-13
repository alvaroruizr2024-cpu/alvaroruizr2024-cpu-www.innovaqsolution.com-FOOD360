import type { CellRef, Dataset, ReportedIndicator, ReportedStat } from '../domain/types';
import type { Filters, KpiValue } from '../domain/model';
import { type Scope, buildScope, scopeCountries } from './cube';
import { DEFS } from './defs';
import { type Spec, evalKpi, tr } from './kpi';
import { PREDICT } from './kpis/predict';
import { PROGRAMS } from './kpis/programs';
import { RECORDS } from './kpis/records';
import { type Impl, RESULTS } from './kpis/results';
import type { Range } from './period';
import { QUALITY } from './quality';

const IMPL: Record<string, Impl> = { ...RESULTS, ...PROGRAMS, ...RECORDS, ...QUALITY, ...PREDICT };
export const SPECS: Map<string, Spec> = new Map(DEFS.map((def) => {
  const impl = IMPL[def.id];
  if (!impl) throw new Error(`engine: KPI sin cálculo ${def.id}`);
  return [def.id, { def, ...impl }] as const;
}));
export const spec = (id: string): Spec => { const s = SPECS.get(id); if (!s) throw new Error(`engine: KPI desconocido ${id}`); return s; };

const REPORTED: Record<string, ReportedIndicator[]> = { C01: ['IF'], C02: ['IS'], C03: ['IA'], C04: ['TRIFR', 'TACSA'] };
export interface ReportedHit { value: number | null; ref: CellRef | null; stat: ReportedStat }
/** Cifra guardada en el origen para el mismo alcance y período (solo un proyecto o un país completo; mes, acumulado o 12 meses). */
export function reportedFor(s: Scope, r: Range, id: string): ReportedHit | null {
  const inds = REPORTED[id]; if (!inds) return null;
  const pt = s.f.periodMode === 'month' ? 'month' : s.f.periodMode === 'ytd' ? 'ytd' : s.f.periodMode === 'r12' ? 'rolling12' : null;
  if (!pt) return null;
  const cc = scopeCountries(s); if (cc.length !== 1) return null;
  const single = s.f.projectIds.length === 1 && s.projects.length === 1 ? s.projects[0].id : null;
  const whole = s.ds.projects.filter((p) => p.country === cc[0]).length === s.projects.length;
  const st = s.ds.reported.find((x) => inds.includes(x.indicator) && x.periodType === pt && x.month === r.to && x.country === cc[0]
    && (single ? x.scope === 'project' && x.projectId === single : whole && x.scope === 'country'));
  return st ? { value: st.value, ref: st.ref, stat: st } : null;
}
export function kpi(id: string, s: Scope, r: Range, lite = false): KpiValue {
  const kv = evalKpi(spec(id), s, r, lite);
  const rep = reportedFor(s, r, id);
  if (rep && rep.value !== null && kv.value !== null) {
    const d = kv.value - rep.value;
    if (rep.value === 0 ? Math.abs(d) > 1e-9 : Math.abs(d / rep.value) > 0.005) kv.flags = [...kv.flags, 'recalculated_differs'];
    kv.secondary = [...kv.secondary, { label: tr('eng.sec.storedInSource'), value: rep.value, unit: kv.unit, decimals: kv.decimals }];
  }
  return kv;
}
/** Alcances memorizados por conjunto y filtros (los cálculos son puros: mismo conjunto + mismos filtros = mismo resultado). */
const scopes = new WeakMap<Dataset, Map<string, Scope>>();
export function scopeFor(ds: Dataset, f: Filters): Scope {
  let m = scopes.get(ds); if (!m) { m = new Map(); scopes.set(ds, m); }
  const key = JSON.stringify(f);
  let s = m.get(key);
  if (!s) { if (m.size >= 12) m.delete(m.keys().next().value as string); s = buildScope(ds, f); m.set(key, s); }
  return s;
}
