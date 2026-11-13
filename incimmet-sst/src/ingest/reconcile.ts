/**
 * Conciliación: (a) consolidado de la fuente frente a la suma de bloques de proyecto, nombrando la causa a partir de las referencias de la
 * fórmula; (b) índices reportados frente a recalculados (mes, año acumulado, 12 meses) con meses pareados numerador/denominador.
 * Los hallazgos estructurales (c) los emite cada perfil. Los meses consecutivos del mismo hallazgo se fusionan en un solo registro.
 */
import type { CellRef, CountryCode, MeasureKey, Month, MonthlyFact, ReconItem, ReportedStat } from '../domain/types';
import { kpisFor, mkItem, monthAdd, monthRuns, type ParsedSource } from './profiles/shared';

const COUNT_FREE = new Set<string>(['hh', 'workers', 'ssomaScore', 'trainingHours']);
const NUMERATOR: Record<string, MeasureKey[]> = {
  TRIFR: ['accFatal', 'accLti', 'accNv3', 'accNv2'], TACSA: ['accFatal', 'accLti', 'accNv3', 'accNv2'],
  IF: ['accFatal', 'accLti'], IS: ['lostDays'], TF: ['accNoLostTime', 'accLti'], TG: ['lostDays'],
};
const close = (a: number, b: number, tol = 1e-6): boolean => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));

interface Entry { month: Month; reported: number; recalc: number; ref: CellRef }

function consolidatedVsBlocks(src: ParsedSource): ReconItem[] {
  const items: ReconItem[] = [];
  if (!src.consol.length) return items;
  const names = new Map(src.projects.map((p) => [p.id, p.name] as [string, string]));
  const sums = new Map<string, number>();
  const parts = new Map<string, Array<[string, number]>>();
  const flagged = new Map<string, number>(); // valores brutos de meses marcados (marcador de posición o resto de plantilla)
  for (const f of src.monthly) {
    for (const k of Object.keys(f.v) as MeasureKey[]) {
      const key = f.month + '|' + k;
      const v = f.v[k];
      if (!sums.has(key)) sums.set(key, 0);
      if (typeof v === 'number') { sums.set(key, (sums.get(key) as number) + v); if (v !== 0) { const l = parts.get(key) ?? []; l.push([f.projectId, v]); parts.set(key, l); } }
    }
    for (const k of Object.keys(f.p ?? {}) as MeasureKey[]) {
      const pr = f.p?.[k];
      if (pr && (pr.q === 'placeholder' || pr.q === 'template_duplicate') && typeof pr.raw === 'number') flagged.set(f.month + '|' + k, (flagged.get(f.month + '|' + k) ?? 0) + pr.raw);
    }
  }
  const groups = new Map<string, { type: string; measure: MeasureKey; label: string; params: Record<string, string | number>; entries: Entry[] }>();
  const add = (type: string, sig: string, c: ParsedSource['consol'][number], params: Record<string, string | number>, recalc: number): void => {
    const gk = `${type}|${c.measure}|${sig}`;
    let g = groups.get(gk);
    if (!g) { g = { type, measure: c.measure, label: c.label, params, entries: [] }; groups.set(gk, g); }
    g.entries.push({ month: c.month, reported: c.value as number, recalc, ref: c.ref });
  };
  for (const c of src.consol) {
    if (c.value === null) continue;
    const key = c.month + '|' + c.measure;
    if (!sums.has(key)) continue;
    const recalc = sums.get(key) as number;
    const targets = [...new Set(c.mismatch.map((x) => x.label ?? '∅'))].sort();
    if (close(recalc, c.value)) { if (c.mismatch.length) add('ref_mismatch_no_effect', targets.join('/'), c, { label: c.label, target: targets.join(' / ') }, recalc); continue; }
    const included = new Set(c.sameRow);
    const omitted = (parts.get(key) ?? []).filter(([pid]) => !included.has(pid)).map(([pid]) => names.get(pid) ?? pid).sort();
    if (flagged.has(key) && close(recalc + (flagged.get(key) as number), c.value)) add('consol_flagged', '', c, { label: c.label }, recalc);
    else if (c.mismatch.length) add('consol_ref_shifted', targets.join('/') + '|' + omitted.join(','), c, { label: c.label, target: targets.join(' / '), blocks: omitted.join(' · ') || '—', nBlocks: omitted.length }, recalc);
    else if (omitted.length) add('consol_omits_blocks', omitted.join(','), c, { label: c.label, blocks: omitted.join(' · '), nBlocks: omitted.length }, recalc);
    else if (c.hardcoded || !c.isFormula) add('consol_hardcoded', '', c, { label: c.label }, recalc);
    else if (flagged.has(key) && close(recalc + (flagged.get(key) as number), c.value)) add('consol_flagged', '', c, { label: c.label }, recalc);
    else add('consol_differs', '', c, { label: c.label }, recalc);
  }
  for (const g of groups.values()) {
    const byMonth = new Map(g.entries.map((e) => [e.month, e] as [Month, Entry]));
    for (const run of monthRuns(g.entries.map((e) => e.month))) {
      const es = run.map((m) => byMonth.get(m) as Entry);
      const rep = es.reduce((s, e) => s + e.reported, 0);
      const rec = es.reduce((s, e) => s + e.recalc, 0);
      const maxRel = Math.max(...es.map((e) => Math.abs(e.recalc - e.reported) / Math.max(Math.abs(e.reported), 1e-9)));
      const noEffect = g.type === 'ref_mismatch_no_effect';
      items.push(mkItem(g.type, {
        severity: noEffect ? 'info' : !COUNT_FREE.has(g.measure) || maxRel > 0.005 ? 'material' : 'minor',
        country: src.country, months: run, kpis: kpisFor(g.measure, src.country), params: { ...g.params, n: run.length },
        reported: rep, recalculated: rec, refs: es.map((e) => e.ref),
      }));
    }
  }
  return items;
}

interface Comp { hh: number | null; n: Partial<Record<MeasureKey, number>>; open: boolean }

function indicesVsRecalculated(src: ParsedSource, K: number): ReconItem[] {
  const items: ReconItem[] = [];
  const names = new Map(src.projects.map((p) => [p.id, p.name] as [string, string]));
  const comp = new Map<string, Map<Month, Comp>>(); // alcance ('*' = país) → mes → componentes
  const put = (scope: string, f: MonthlyFact): void => {
    let mp = comp.get(scope);
    if (!mp) { mp = new Map(); comp.set(scope, mp); }
    let c = mp.get(f.month);
    if (!c) { c = { hh: null, n: {}, open: false }; mp.set(f.month, c); }
    if (typeof f.v.hh === 'number') c.hh = (c.hh ?? 0) + f.v.hh;
    for (const k of Object.keys(f.v) as MeasureKey[]) {
      if (k === 'hh') continue;
      const v = f.v[k];
      if (typeof v === 'number') c.n[k] = (c.n[k] ?? 0) + v;
      else if (f.p?.[k]?.q === 'not_closed') c.open = true;
    }
  };
  for (const f of src.monthly) { put(f.projectId, f); put('*', f); }
  const rate = (scope: string, ind: string, months: Month[]): { value: number | null; unpaired: boolean } => {
    const mp = comp.get(scope);
    if (!mp) return { value: null, unpaired: false };
    if (ind === 'IA') {
      const a = rate(scope, 'IF', months);
      const b = rate(scope, 'IS', months);
      return { value: a.value !== null && b.value !== null ? (a.value * b.value) / 1000 : null, unpaired: a.unpaired || b.unpaired };
    }
    const keys = NUMERATOR[ind];
    if (!keys) return { value: null, unpaired: false };
    let num = 0;
    let hh = 0;
    let unpaired = false;
    for (const m of months) {
      const c = mp.get(m);
      if (!c) continue;
      const hasNum = keys.some((k) => c.n[k] !== undefined && c.n[k] !== 0);
      if (c.open || c.hh === null) { if (c.hh !== null || hasNum) unpaired = true; continue; } // mes sin pareja numerador/denominador
      hh += c.hh;
      for (const k of keys) num += c.n[k] ?? 0;
    }
    return { value: hh > 0 ? (num * K) / hh : null, unpaired };
  };
  const windowOf = (m: Month, p: ReportedStat['periodType']): Month[] => {
    if (p === 'month') return [m];
    const out: Month[] = [];
    if (p === 'ytd') for (let x = m.slice(0, 4) + '-01'; x <= m; x = monthAdd(x, 1)) out.push(x);
    else for (let i = 11; i >= 0; i--) out.push(monthAdd(m, -i));
    return out;
  };
  const groups = new Map<string, { st: ReportedStat; type: string; entries: Array<{ month: Month; reported: number; recalc: number; ref: CellRef; rel: number }> }>();
  for (const st of src.reported) {
    if (!(st.indicator in NUMERATOR) && st.indicator !== 'IA') continue;
    if (st.value === null || st.quality === 'error' || st.quality === 'not_closed') continue;
    const scope = st.scope === 'country' ? '*' : (st.projectId as string);
    const r = rate(scope, st.indicator, windowOf(st.month, st.periodType));
    if (r.value === null) continue;
    const diff = Math.abs(r.value - st.value);
    const rel = diff / Math.max(Math.abs(st.value), 1e-9);
    if (diff <= 1e-6 || (st.value !== 0 && rel <= 1e-4)) continue;
    const type = r.unpaired ? 'index_coverage' : 'index_differs';
    const gk = `${scope}|${st.indicator}|${st.periodType}|${type}`;
    let g = groups.get(gk);
    if (!g) { g = { st, type, entries: [] }; groups.set(gk, g); }
    g.entries.push({ month: st.month, reported: st.value, recalc: r.value, ref: st.ref, rel });
  }
  for (const g of groups.values()) {
    const byMonth = new Map(g.entries.map((e) => [e.month, e] as [Month, (typeof g.entries)[number]]));
    for (const run of monthRuns(g.entries.map((e) => e.month))) {
      const es = run.map((m) => byMonth.get(m) as (typeof g.entries)[number]);
      const lastE = es[es.length - 1];
      const maxRel = Math.max(...es.map((e) => e.rel));
      items.push(mkItem(`${g.type}.${g.st.periodType}`, {
        severity: maxRel > 0.005 ? 'material' : 'minor', country: src.country as CountryCode, projectId: g.st.projectId, projectName: g.st.projectId ? names.get(g.st.projectId) ?? null : null,
        months: run, kpis: kpisFor(g.st.indicator, src.country), params: { indicator: g.st.indicator, period: g.st.periodType, n: run.length, at: lastE.month },
        reported: lastE.reported, recalculated: lastE.recalc, refs: [lastE.ref, ...es.slice(0, -1).map((e) => e.ref)],
      }));
    }
  }
  return items;
}

const SEV: Record<ReconItem['severity'], number> = { material: 0, minor: 1, info: 2 };
/** Registro de conciliación de una fuente ya convertida (hallazgos estructurales del perfil + comparaciones a y b). */
export function reconcileSource(src: ParsedSource, rateConstant = 1e6): ReconItem[] {
  return [...consolidatedVsBlocks(src), ...indicesVsRecalculated(src, rateConstant), ...src.items];
}
/** Ordena por severidad, país y tipo, y numera los registros. */
export function finalizeItems(items: ReconItem[]): ReconItem[] {
  const sorted = [...items].sort((a, b) => SEV[a.severity] - SEV[b.severity] || (a.country ?? 'ZZ').localeCompare(b.country ?? 'ZZ') || a.issueKey.localeCompare(b.issueKey)
    || (a.projectId ?? '').localeCompare(b.projectId ?? '') || (b.months?.[0] ?? '').localeCompare(a.months?.[0] ?? ''));
  return sorted.map((it, i) => ({ ...it, id: 'REC-' + String(i + 1).padStart(3, '0') }));
}
