import type { Dataset, Lang, MeasureKey, StatRow, TextRef } from '../domain/types';
import type { ExportTable, Filters } from '../domain/model';
import { KPI_IDS } from '../domain/model';
import { translate } from '../i18n/core';
import { buildSignals } from './alerts';
import { projectRows } from './attention';
import { kpi, scopeFor } from './catalog';
import { cellsIn } from './cube';
import { METHOD_VERSION } from './defs';
import { lastN, resolveRange } from './period';

const UNIT: Partial<Record<MeasureKey, string>> = { hh: 'hh', workers: 'people', lostDays: 'days', chargedDays: 'days', trainingHours: 'hours', ssomaScore: 'score',
  fatalities: 'cases', casesInjury: 'cases', casesLti: 'cases', casesRestricted: 'cases', casesMedical: 'cases', casesFirstAid: 'cases' };
export const measureUnit = (k: string): string => UNIT[k as MeasureKey] ?? 'events';

/** Tablas de exportación: mismas cifras que la vista (sin formato regional), con filas de metadatos y marca DEMO. */
export function exportTables(ds: Dataset, f: Filters, lang: Lang): ExportTable[] {
  const t = (key: string, params?: Record<string, string | number>): string => translate(lang, key, params);
  const tx = (x: TextRef | null): string => (x ? translate(lang, x.key, x.params) : '');
  const s = scopeFor(ds, f); const r = resolveRange(f);
  const meta: Array<[string, string]> = [
    [t('eng.export.meta.dataset'), ds.label], [t('eng.export.meta.demo'), t(ds.kind === 'demo' ? 'eng.export.demoYes' : 'eng.export.demoNo')],
    [t('eng.export.meta.period'), `${r.from} – ${r.to} (${f.periodMode})`], [t('eng.export.meta.compare'), f.compare],
    [t('eng.export.meta.filters'), JSON.stringify({ countries: f.countries, projectIds: f.projectIds, companies: f.companies, activities: f.activities, shifts: f.shifts, risks: f.risks, severities: f.severities, eventTypes: f.eventTypes, bodyPart: f.bodyPart, mechanism: f.mechanism })],
    [t('eng.export.meta.language'), lang], [t('eng.export.meta.cutoff'), ds.cutoffMonth], [t('eng.export.meta.units'), t('eng.export.unitsNote')], [t('eng.export.meta.version'), METHOD_VERSION],
  ];
  const col = (...keys: string[]): string[] => keys.map((k) => t(`eng.export.col.${k}`));
  const kpis = KPI_IDS.map((id) => kpi(id, s, r, true));
  const cells = cellsIn(s, lastN(r.to, 24)).sort((a, b) => a.month.localeCompare(b.month) || a.projectId.localeCompare(b.projectId));
  const mk = [...new Set(cells.flatMap((c) => Object.keys(c.v)))].sort();
  const sig = buildSignals(s);
  return [
    { key: 'kpis', title: t('eng.export.kpis'), meta, columns: col('id', 'indicator', 'value', 'unit', 'state', 'numerator', 'denominator', 'constant', 'target', 'status', 'flags', 'reason'),
      rows: kpis.map((k) => [k.id, t(`kpi.${k.id}.name`), k.value, t(`unit.${k.unit}`), t(`eng.state.${k.state}`), k.numerator, k.denominator, k.constant, k.target ? k.target.value : null, t(`eng.status.${k.status}`), k.flags.join(' · '), tx(k.reason)]) },
    { key: 'monthly', title: t('eng.export.monthly'), meta, columns: [...col('country', 'project', 'month'), ...mk],
      rows: cells.map((c) => [c.country, s.proj.get(c.projectId)?.name ?? c.projectId, c.month, ...mk.map((k) => { const v = c.v[k as MeasureKey]; return v === undefined ? null : v; })]) },
    { key: 'projects', title: t('eng.export.projects'), meta, columns: col('country', 'project', 'projectStatus', 'hh', 'workers', 'fatal', 'lti', 'tri', 'hipo', 'lostDays', 'ltifr', 'trifr', 'ssoma', 'attention', 'status'),
      rows: projectRows(s, r).map((p) => [p.country, p.name, p.status, p.hh, p.workers, p.fatal, p.lti, p.tri, p.hipo, p.lostDays, p.ltifr, p.trifr, p.ssoma, p.attention, t(`eng.status.${p.statusLevel}`)]) },
    { key: 'signals', title: t('eng.export.signals'), meta, columns: col('priority', 'rule', 'title', 'whatChanged', 'evidence', 'country', 'project', 'ownerRole', 'dueInDays', 'recommendation'),
      rows: sig.map((g) => [t(`eng.priority.${g.priority}`), g.ruleId, tx(g.title), tx(g.whatChanged), g.evidence.map((e) => tx(e.text)).join(' | '), g.scope.country, g.scope.projectName, tx(g.ownerRole), g.dueInDays, tx(g.recommendation)]) },
    { key: 'reconciliation', title: t('eng.export.reconciliation'), meta, columns: col('severity', 'country', 'project', 'months', 'kpis', 'issue', 'reported', 'recalculated', 'delta', 'sourceChosen', 'rule'),
      rows: ds.reconciliation.filter((i) => i.projectId === null || s.ids.has(i.projectId)).map((i) => [i.severity, i.country, i.projectName, i.months ? i.months.join(', ') : null, i.kpisAffected.join(', '), t(i.issueKey, i.params), i.reportedValue, i.recalculatedValue, i.delta, t(i.sourceChosenKey), t(i.ruleKey)]) },
  ];
}
/** Tabla larga de estadísticas mensuales (sección 19.5): hechos + cifras guardadas en el origen. No equivale a un registro de eventos. */
export function statRows(ds: Dataset): StatRow[] {
  const name = new Map(ds.projects.map((p) => [p.id, p.name] as const)); const out: StatRow[] = [];
  const split = (c: string | undefined): [string, string] => { if (!c) return ['', '']; const i = c.lastIndexOf('!'); return i >= 0 ? [c.slice(0, i), c.slice(i + 1)] : ['', c]; };
  for (const fact of ds.monthly) for (const k of Object.keys(fact.v) as MeasureKey[]) {
    const v = fact.v[k]; if (v === undefined) continue; const p = fact.p?.[k]; const [sheet, cell] = split(p?.c);
    out.push({ country: fact.country, project: name.get(fact.projectId) ?? fact.projectId, month: fact.month, population: fact.company ?? 'total', indicator: k, rawValue: p?.raw ?? v, value: v, unit: measureUnit(k),
      periodType: 'month', file: fact.file ?? '', sheet, cell, formula: p?.f ?? null, quality: p?.q ?? (v === null ? 'empty' : 'ok'), version: ds.config.taxonomyVersion, valueKind: 'stored' });
  }
  for (const x of ds.reported) out.push({ country: x.country, project: x.projectId ? name.get(x.projectId) ?? x.projectId : '', month: x.month, population: 'total', indicator: x.indicator, rawValue: x.raw, value: x.value,
    unit: ['IF', 'IS', 'TRIFR', 'TACSA', 'TF', 'TG'].includes(x.indicator) ? 'per1e6hh' : x.indicator === 'IA' ? 'index' : x.indicator === 'trainingPct' ? 'pct' : measureUnit(x.indicator),
    periodType: x.periodType, file: x.ref.file, sheet: x.ref.sheet, cell: x.ref.cell, formula: x.ref.formula ?? null, quality: x.quality, version: ds.config.taxonomyVersion, valueKind: 'stored' });
  return out;
}
