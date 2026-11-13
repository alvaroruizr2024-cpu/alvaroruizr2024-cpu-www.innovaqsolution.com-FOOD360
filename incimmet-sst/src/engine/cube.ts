import type {
  ActionRecord, CaseClass, CaseRecord, ControlRecord, CountryCode, Dataset, DatasetConfig, EventRecord, HygieneMeasurement, ISODate,
  MeasureKey, Month, MonthlyFact, PlanActivity, ProgramStat, Project, Target, VerificationRecord,
} from '../domain/types';
import { COUNTRIES } from '../domain/types';
import type { CoverageNote, Filters } from '../domain/model';
import { type Range, monthEnd, monthOf, monthsBetween } from './period';

export type V = Partial<Record<MeasureKey, number | null>>;
export interface Cell { projectId: string; country: CountryCode; month: Month; v: V; p: MonthlyFact['p'] | undefined; file: string | undefined; rec: boolean }
export interface EvX { e: EventRecord; month: Month; cases: CaseRecord[]; level: CaseClass | null }
export interface Scope {
  ds: Dataset; f: Filters; cfg: DatasetConfig; cutoff: Month; asOf: ISODate;
  projects: Project[]; ids: Set<string>; proj: Map<string, Project>;
  cells: Cell[]; byMonth: Map<Month, Cell[]>;
  hasRecords: boolean; events: EvX[];
  controls: ControlRecord[]; verifications: VerificationRecord[]; plan: PlanActivity[]; actions: ActionRecord[];
  programStats: ProgramStat[]; hygiene: HygieneMeasurement[];
  subs: Partial<Record<CountryCode, Scope>>;
}
export const CLASS_ORDER: CaseClass[] = ['fatal', 'lti', 'restricted', 'medical', 'first_aid'];
export const LEVEL_MEASURE: Record<CaseClass, MeasureKey> = { fatal: 'accFatal', lti: 'accLti', restricted: 'accNv3', medical: 'accNv2', first_aid: 'accNv1' };
export const CASE_MEASURE: Record<CaseClass, MeasureKey> = { fatal: 'fatalities', lti: 'casesLti', restricted: 'casesRestricted', medical: 'casesMedical', first_aid: 'casesFirstAid' };
export const LEVELS: MeasureKey[] = ['accFatal', 'accLti', 'accNv3', 'accNv2', 'accNv1'];
export const POTENTIAL: MeasureKey[] = ['pg56', 'pg4', 'pg3', 'pg2', 'pg1'];
const DERIVED: MeasureKey[] = [...LEVELS, 'accNoLostTime', 'accPerson', 'accProperty', 'incPerson', 'hpriLoss', 'hpriNoLoss', ...POTENTIAL,
  'fatalities', 'casesInjury', 'casesLti', 'casesRestricted', 'casesMedical', 'casesFirstAid', 'nearMiss', 'hazardReports', 'lostDays', 'chargedDays'];
const POT_KEY: Record<number, MeasureKey> = { 1: 'pg1', 2: 'pg2', 3: 'pg3', 4: 'pg4', 5: 'pg56', 6: 'pg56' };

const prepCache = new WeakMap<Dataset, EvX[]>();
function prepared(ds: Dataset): EvX[] {
  let p = prepCache.get(ds);
  if (!p) {
    const byEvent = new Map<string, CaseRecord[]>();
    const seen = new Set<string>();
    for (const c of ds.cases) { if (seen.has(c.id)) continue; seen.add(c.id); const a = byEvent.get(c.eventId); if (a) a.push(c); else byEvent.set(c.eventId, [c]); }
    const ids = new Set<string>(); p = [];
    for (const e of ds.events) {       // identificadores únicos: una fila repetida no crea otro evento
      if (ids.has(e.id)) continue; ids.add(e.id);
      const cases = byEvent.get(e.id) ?? [];
      p.push({ e, month: monthOf(e.occurredAt), cases, level: worst(cases) });
    }
    prepCache.set(ds, p);
  }
  return p;
}
export const worst = (cases: CaseRecord[]): CaseClass | null => CLASS_ORDER.find((k) => cases.some((c) => c.classification === k)) ?? null;
const add = (a: number | null | undefined, b: number | null | undefined): number | null | undefined =>
  (a === undefined ? b : b === undefined ? a : a === null || b === null ? null : a + b);
const dimOk = (sel: string[], v: string | null | undefined): boolean => !sel.length || v === null || v === undefined || sel.includes(v);
const recOk = (sel: string[], v: string | null): boolean => !sel.length || (v !== null && sel.includes(v));
function group(cells: Cell[]): Map<Month, Cell[]> {
  const m = new Map<Month, Cell[]>();
  for (const c of cells) { const a = m.get(c.month); if (a) a.push(c); else m.set(c.month, [c]); }
  return m;
}

export function buildScope(ds: Dataset, f: Filters): Scope {
  const cs = f.countries.length ? new Set<string>(f.countries) : null; const ps = f.projectIds.length ? new Set(f.projectIds) : null;
  const projects = ds.projects.filter((p) => (!cs || cs.has(p.country)) && (!ps || ps.has(p.id)));
  const ids = new Set(projects.map((p) => p.id)); const proj = new Map(ds.projects.map((p) => [p.id, p] as const));
  const hasRecords = ds.events.length > 0 || ds.cases.length > 0;
  const map = new Map<string, Cell>();
  const cellOf = (projectId: string, country: CountryCode, month: Month, rec: boolean): Cell => {
    const k = `${projectId}|${month}`; let c = map.get(k);
    if (!c) { c = { projectId, country, month, v: {}, p: undefined, file: undefined, rec }; map.set(k, c); }
    return c;
  };
  for (const fact of ds.monthly) {
    if (!ids.has(fact.projectId)) continue;
    if (!dimOk(f.companies, fact.company) || !dimOk(f.shifts, fact.shift) || !dimOk(f.activities, fact.activity)) continue;
    const c = cellOf(fact.projectId, fact.country, fact.month, fact.basis === 'records');
    for (const k of Object.keys(fact.v) as MeasureKey[]) {
      const merged = add(c.v[k], fact.v[k]);
      if (merged !== undefined) c.v[k] = merged;
    }
    if (fact.p) c.p = { ...(c.p ?? {}), ...fact.p };
    if (fact.file) c.file = fact.file;
  }
  let events: EvX[] = [];
  if (hasRecords) {
    const bp = f.bodyPart;
    for (const x0 of prepared(ds)) {
      const e = x0.e;
      if (!ids.has(e.projectId) || !recOk(f.companies, e.company) || !recOk(f.shifts, e.shift) || !recOk(f.activities, e.activity)) continue;
      if (!recOk(f.risks, e.risk) || !recOk(f.eventTypes, e.type) || (f.mechanism && e.mechanism !== f.mechanism)) continue;
      let x = x0;
      if (bp) { const cases = x0.cases.filter((c) => c.bodyParts.includes(bp)); if (!cases.length) continue; x = { ...x0, cases, level: worst(cases) }; }
      if (!recOk(f.severities, x.level)) continue;
      events.push(x);
    }
    const derived = new Map<Cell, V>();
    const dv = (c: Cell): V => { let d = derived.get(c); if (!d) { d = {}; for (const k of DERIVED) d[k] = 0; derived.set(c, d); } return d; };
    for (const c of map.values()) if (c.rec) dv(c);
    const inc = (d: V, k: MeasureKey, n = 1): void => { d[k] = (d[k] ?? 0) + n; };
    for (const x of events) {
      const p = proj.get(x.e.projectId); if (!p) continue;
      const d = dv(cellOf(x.e.projectId, p.country, x.month, true));
      if (x.e.type === 'accident_injury') { inc(d, 'accPerson'); if (x.level) inc(d, LEVEL_MEASURE[x.level]); if (x.level && x.level !== 'fatal' && x.level !== 'lti') inc(d, 'accNoLostTime'); }
      else if (x.e.type === 'accident_property') inc(d, 'accProperty');
      else if (x.e.type === 'incident') inc(d, 'incPerson');
      else if (x.e.type === 'near_miss') inc(d, 'nearMiss');
      else inc(d, 'hazardReports');
      for (const c of x.cases) { inc(d, 'casesInjury'); inc(d, CASE_MEASURE[c.classification]); inc(d, 'lostDays', c.lostDays); inc(d, 'chargedDays', c.chargedDays); }
      if (x.e.highPotential) inc(d, x.e.withLoss ? 'hpriLoss' : 'hpriNoLoss');
      if (x.e.potential !== null) inc(d, POT_KEY[x.e.potential]);
    }
    // los conteos reportados prevalecen donde existen; lo derivado de registros llena lo demás
    for (const [c, d] of derived) for (const k of DERIVED) if (c.rec || c.v[k] === undefined) c.v[k] = d[k];
  }
  const cells = [...map.values()];
  const risks = f.risks;
  const controls = ds.controls.filter((c) => ids.has(c.projectId) && (!risks.length || risks.includes(c.risk)));
  const cids = new Set(controls.map((c) => c.id));
  return {
    ds, f, cfg: ds.config, cutoff: ds.cutoffMonth, asOf: monthEnd(ds.cutoffMonth), projects, ids, proj, cells, byMonth: group(cells), hasRecords, events,
    controls, verifications: ds.verifications.filter((v) => cids.has(v.controlId)),
    plan: ds.planActivities.filter((a) => ids.has(a.projectId)), actions: ds.actions.filter((a) => ids.has(a.projectId)),
    programStats: ds.programStats.filter((a) => ids.has(a.projectId)), hygiene: ds.hygiene.filter((a) => ids.has(a.projectId)), subs: {},
  };
}
export function restrict(s: Scope, keep: (p: Project) => boolean): Scope {
  const projects = s.projects.filter(keep); const ids = new Set(projects.map((p) => p.id));
  const cells = s.cells.filter((c) => ids.has(c.projectId));
  const on = <T extends { projectId: string }>(a: T[]): T[] => a.filter((x) => ids.has(x.projectId));
  return { ...s, projects, ids, cells, byMonth: group(cells), events: s.events.filter((x) => ids.has(x.e.projectId)), controls: on(s.controls),
    verifications: on(s.verifications), plan: on(s.plan), actions: on(s.actions), programStats: on(s.programStats), hygiene: on(s.hygiene), subs: {} };
}
export function countryScope(s: Scope, c: CountryCode): Scope { return (s.subs[c] ??= restrict(s, (p) => p.country === c)); }
export const scopeCountries = (s: Scope): CountryCode[] => COUNTRIES.filter((c) => s.projects.some((p) => p.country === c));
export function cellsIn(s: Scope, r: Range): Cell[] {
  const out: Cell[] = [];
  for (const m of monthsBetween(r.from, r.to)) { const a = s.byMonth.get(m); if (a) for (const c of a) out.push(c); }
  return out;
}
export const isNum = (x: number | null | undefined): x is number => typeof x === 'number' && Number.isFinite(x);

export interface Agg {
  num: number; den: number; used: number; total: number; parts: number[];
  absent: Partial<Record<CountryCode, number>>; empty: Partial<Record<CountryCode, Month[]>>; noDen: Partial<Record<CountryCode, number>>;
  usedCells: Cell[];
}
/** Σ numeradores / Σ denominadores con COBERTURA PAREADA. strict=false (conteos): suma lo informado y lista lo que falta. */
export function agg(s: Scope, r: Range, nums: MeasureKey[], den: MeasureKey | null, strict = true): Agg {
  const a: Agg = { num: 0, den: 0, used: 0, total: 0, parts: nums.map(() => 0), absent: {}, empty: {}, noDen: {}, usedCells: [] };
  for (const c of cellsIn(s, r)) {
    a.total++;
    const vals = nums.map((k) => c.v[k]);
    const nNum = vals.filter(isNum).length;
    if (vals.every((x) => x === undefined)) { a.absent[c.country] = (a.absent[c.country] ?? 0) + 1; continue; }
    if (strict && vals.some((x) => x === undefined)) { a.absent[c.country] = (a.absent[c.country] ?? 0) + 1; continue; }
    if ((strict && nNum < vals.length) || nNum === 0) { (a.empty[c.country] ??= []).push(c.month); continue; }
    if (!strict && vals.some((x) => x === null)) (a.empty[c.country] ??= []).push(c.month);
    let d = 1;
    if (den) { const dv = c.v[den]; if (!isNum(dv)) { a.noDen[c.country] = (a.noDen[c.country] ?? 0) + 1; continue; } d = dv; }
    vals.forEach((x, i) => { if (isNum(x)) { a.num += x; a.parts[i] += x; } });
    a.den += d; a.used++; a.usedCells.push(c);
  }
  return a;
}
export function coverageNotes(a: Agg, fields: string): CoverageNote[] {
  const out: CoverageNote[] = [];
  for (const c of COUNTRIES) {
    const ab = a.absent[c]; if (ab) out.push({ country: c, kind: 'excluded', reason: { key: 'eng.cov.absent', params: { n: ab, fields } } });
    const em = a.empty[c];
    if (em?.length) { const ms = [...new Set(em)].sort(); out.push({ country: c, kind: 'partial', reason: { key: 'eng.cov.notClosed', params: { n: em.length, months: ms.slice(-3).join(', ') } } }); }
    const nd = a.noDen[c]; if (nd) out.push({ country: c, kind: 'partial', reason: { key: 'eng.cov.noExposure', params: { n: nd } } });
  }
  return out;
}
export interface TargetHit { value: number; kind: Target['kind']; version: string; flagKey: string | null; scopeUnconfirmed: boolean }
/** Meta vigente en el último mes del período: la del proyecto si hay exactamente uno filtrado; si no, la corporativa. */
export function targetFor(s: Scope, ind: Target['indicator'], month: Month): TargetHit | null {
  const live = s.ds.targets.filter((t) => t.indicator === ind && t.effective !== null && t.month <= month);
  const single = s.f.projectIds.length === 1 && s.projects.length === 1 ? s.projects[0].id : null;
  let c = single ? live.filter((t) => t.scope === 'project' && t.projectId === single) : [];
  if (!c.length) c = live.filter((t) => t.scope === 'corporate');
  if (!c.length) return null;
  const t = c.reduce((a, b) => (b.month >= a.month ? b : a));
  const cc = scopeCountries(s);
  return { value: t.effective as number, kind: t.kind, version: t.version, flagKey: t.flagKey, scopeUnconfirmed: s.ds.kind !== 'demo' && t.scope === 'corporate' && cc.some((x) => x !== (t.country ?? 'PE')) };
}
/** Conjunto de proyectos con exposición válida en un rango (para cobertura equivalente al comparar). */
export function exposedProjects(s: Scope, r: Range): Set<string> {
  const out = new Set<string>();
  for (const c of cellsIn(s, r)) if (isNum(c.v.hh) && c.v.hh > 0) out.add(c.projectId);
  return out;
}
