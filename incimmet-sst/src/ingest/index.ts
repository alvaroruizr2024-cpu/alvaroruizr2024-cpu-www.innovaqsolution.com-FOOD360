/**
 * Importador local: detecta el perfil de cada libro, convierte las matrices mensuales en hechos con procedencia y concilia.
 * Todo ocurre en memoria del equipo del usuario: este módulo no hace peticiones de red ni usa APIs de Node.
 * Fuente canónica por país/proyecto/mes/medida = bloques de proyecto: PE desde la hoja MediaMovilNN más reciente del libro corporativo,
 * CO solo desde el libro de Colombia (nunca la copia oculta del corporativo), BR desde el formulario de contratista.
 */
import type { Availability, CountryCode, Dataset, MeasureKey, ModuleKey, MonthlyFact, QualityFlag, ReconItem, SourceFile, StatRow, TextRef } from '../domain/types';
import type { IngestApi, IngestPreviewBlock, IngestResult, InputFile } from '../domain/model';
import { readWorkbook } from './xlsx/read';
import { writeWorkbook } from './xlsx/write';
import { detectProfile, type Profile } from './profiles/detect';
import { parseCorporate, type SourceMeta } from './profiles/corporate';
import { parseColombia } from './profiles/colombia';
import { parseIncired } from './profiles/incired';
import { mkItem, type ParsedSource } from './profiles/shared';
import { finalizeItems, reconcileSource } from './reconcile';

export { readWorkbook } from './xlsx/read';
export { writeWorkbook } from './xlsx/write';
export { detectProfile } from './profiles/detect';

const PROFILE_COUNTRY: Record<Exclude<Profile, 'unknown'>, CountryCode> = { corporate: 'PE', colombia: 'CO', incired: 'BR' };
const RATE_CONSTANT = 1_000_000;

async function sha256(bytes: Uint8Array): Promise<string | null> {
  try {
    const c = (globalThis as { crypto?: Crypto }).crypto;
    if (!c || !c.subtle) return null;
    const d = await c.subtle.digest('SHA-256', bytes as unknown as BufferSource);
    return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('');
  } catch { return null; }
}
const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const tpl = (n: string): string => `/templates/${n}.csv`;
function buildModules(monthly: MonthlyFact[]): Record<ModuleKey, Availability> {
  const has = (keys: MeasureKey[]): boolean => monthly.some((f) => keys.some((k) => typeof f.v[k] === 'number'));
  const pend = (m: string, reqs: string[], file: string): Availability => ({ state: 'pending', reasonKey: `rec.module.${m}.pending`, requirements: reqs.map((r) => 'rec.req.' + r), templateFile: tpl(file) });
  const avail = (m: string, ok: boolean): Availability => (ok ? { state: 'available', reasonKey: `rec.module.${m}.available` } : { state: 'pending', reasonKey: 'rec.module.source_pending' });
  return {
    exposure: avail('exposure', has(['hh'])),
    accidents: avail('accidents', has(['accFatal', 'accLti', 'accNv3', 'accNv2', 'accNv1', 'accNoLostTime'])),
    potential: avail('potential', has(['pg56', 'pg4', 'pg3', 'pg2', 'pg1', 'hpriLoss', 'hpriNoLoss'])),
    training: has(['trainingHours'])
      ? { state: 'partial', reasonKey: 'rec.module.training.partial', requirements: ['rec.req.programas'], templateFile: tpl('programas') }
      : pend('training', ['programas'], 'programas'),
    cases: pend('cases', ['eventos', 'casos'], 'casos'),
    controls: pend('controls', ['controles', 'verificaciones'], 'controles'),
    plan: pend('plan', ['plan_anual'], 'plan_anual'),
    actions: pend('actions', ['acciones'], 'acciones'),
    health: pend('health', ['salud_agregada'], 'salud_agregada'),
    hygiene: pend('hygiene', ['higiene'], 'higiene'),
    programs: pend('programs', ['programas'], 'programas'),
    projectsGeo: pend('projectsGeo', ['proyectos'], 'proyectos'),
    predictive: { state: 'disabled', reasonKey: 'rec.module.predictive.disabled', templateFile: null },
  };
}

export async function ingestFiles(files: InputFile[], previous?: Dataset | null): Promise<IngestResult> {
  const t0 = now();
  const loadedAt = new Date().toISOString();
  const errors: TextRef[] = [];
  const outFiles: SourceFile[] = [];
  const parsed = new Map<Exclude<Profile, 'unknown'>, ParsedSource>();
  let cellsRead = 0;
  for (const f of files) {
    const base: SourceMeta = { name: f.name, sha256: await sha256(f.bytes), sizeBytes: f.bytes.byteLength, loadedAt, modifiedAt: typeof f.lastModified === 'number' ? new Date(f.lastModified).toISOString() : null };
    const unknown = (): SourceFile => ({ key: 'unknown:' + f.name, profile: 'unknown', country: null, ...base, lastDataMonth: null, sheets: [], warnings: [] });
    try {
      const wb = readWorkbook(f.bytes);
      const meta: SourceMeta = { ...base, modifiedAt: wb.props.modified ?? base.modifiedAt };
      const profile = detectProfile(wb);
      if (profile === 'unknown') {
        errors.push({ key: 'rec.error.unknown_profile', params: { file: f.name } });
        outFiles.push({ ...unknown(), sheets: wb.sheets.map((s) => ({ name: s.name, state: s.state === 'visible' ? 'visible' : 'hidden', used: false })) });
        continue;
      }
      const ps = profile === 'corporate' ? parseCorporate(wb, meta) : profile === 'colombia' ? parseColombia(wb, meta) : parseIncired(wb, meta);
      cellsRead += ps.stats.cellsRead;
      const prev = parsed.get(profile);
      if (prev) {
        errors.push({ key: 'rec.error.duplicate_profile', params: { file: f.name, profile } });
        if ((prev.source.lastDataMonth ?? '') >= (ps.source.lastDataMonth ?? '')) { outFiles.push(ps.source); continue; }
      }
      parsed.set(profile, ps);
      outFiles.push(ps.source);
    } catch (e) {
      errors.push({ key: 'rec.error.unreadable', params: { file: f.name, detail: e instanceof Error ? e.message.slice(0, 120) : 'error' } });
      outFiles.push(unknown());
    }
  }
  const sources: SourceFile[] = [];
  const projects: Dataset['projects'] = [];
  const monthly: Dataset['monthly'] = [];
  const reported: Dataset['reported'] = [];
  const targets: Dataset['targets'] = [];
  const blocks: IngestPreviewBlock[] = [];
  let recon: ReconItem[] = [];
  let duplicatesFlagged = 0;
  let errorCells = 0;
  let factsCreated = 0;
  for (const key of ['corporate', 'colombia', 'incired'] as const) {
    const country = PROFILE_COUNTRY[key];
    const ps = parsed.get(key);
    if (ps) {
      sources.push(ps.source);
      projects.push(...ps.projects);
      monthly.push(...ps.monthly);
      reported.push(...ps.reported);
      targets.push(...ps.targets);
      blocks.push(...ps.blocks);
      recon.push(...reconcileSource(ps, RATE_CONSTANT));
      duplicatesFlagged += ps.stats.duplicatesFlagged;
      errorCells += ps.stats.errorCells;
      factsCreated += ps.monthly.length;
      continue;
    }
    const old = previous && previous.kind === 'real' ? previous.sources.find((s) => s.key === key) : undefined;
    if (previous && old) { // se conserva lo ya cargado de esa fuente
      sources.push(old);
      projects.push(...previous.projects.filter((p) => p.country === country));
      monthly.push(...previous.monthly.filter((x) => x.country === country));
      reported.push(...previous.reported.filter((x) => x.country === country));
      targets.push(...previous.targets.filter((x) => (x.ref ? x.ref.file === old.name : x.country === country)));
      recon.push(...previous.reconciliation.filter((x) => x.country === country && x.issueKey !== 'rec.issue.source_missing'));
    } else {
      recon.push(mkItem('source_missing', { country, kpis: ['Q02', 'Q05'], params: { source: key } }));
    }
  }
  recon = finalizeItems(recon);
  const ms = Math.round(now() - t0);
  const stats = { cellsRead, factsCreated, duplicatesFlagged, errorCells, ms };
  if (!sources.length) return { dataset: null, files: outFiles, blocks, issues: [], errors, stats };
  const cutoffMonth = sources.map((s) => s.lastDataMonth ?? '').sort().pop() || loadedAt.slice(0, 7);
  const dataset: Dataset = {
    schema: 1, id: `real-${cutoffMonth}-${loadedAt.replace(/[-:.TZ]/g, '').slice(0, 14)}`, kind: 'real', label: `INCIMMET ${cutoffMonth}`, createdAt: loadedAt, cutoffMonth,
    sources, projects, monthly, reported, targets,
    events: [], cases: [], controls: [], verifications: [], planActivities: [], actions: [], programStats: [], hygiene: [],
    reconciliation: recon, modules: buildModules(monthly),
    config: { taxonomyVersion: 'reportado-v1', triMeasures: ['accFatal', 'accLti', 'accNv3', 'accNv2'], ltiMeasures: ['accLti'], rateConstant: RATE_CONSTANT, warnBand: 0.2, smallExposureHH: 100000, predictiveApproved: false },
  };
  return { dataset, files: outFiles, blocks, issues: recon, errors, stats };
}

const UNITS: Record<string, string> = {
  hh: 'hh', workers: 'people', lostDays: 'days', chargedDays: 'days', trainingHours: 'hours', ssomaScore: 'score',
  IF: 'per1e6hh', IS: 'per1e6hh', TRIFR: 'per1e6hh', TACSA: 'per1e6hh', TF: 'per1e6hh', TG: 'per1e6hh', IA: 'index', trainingPct: 'pct',
};
/**
 * Tabla larga de estadísticas mensuales (sección 19.5): una fila por país/proyecto/mes/indicador/tipo de período.
 * project = '*' identifica el consolidado del país; population = 'all' (la fuente no separa personal propio y contratista).
 * valueKind 'stored' = cifra guardada en la fuente; 'recalculated' = suma de bloques de proyecto.
 */
export function toStatRows(ds: Dataset): StatRow[] {
  const rows: StatRow[] = [];
  const names = new Map(ds.projects.map((p) => [p.id, p.name] as [string, string]));
  const version = ds.config.taxonomyVersion;
  const sums = new Map<string, number | null>();
  for (const f of ds.monthly) {
    const project = names.get(f.projectId) ?? f.projectId;
    for (const k of Object.keys(f.v) as MeasureKey[]) {
      const value = f.v[k] ?? null;
      const prov = f.p?.[k];
      const at = prov ? prov.c.lastIndexOf('!') : -1;
      const quality: QualityFlag = prov?.q ?? (value === null ? 'empty' : 'ok');
      rows.push({
        country: f.country, project, month: f.month, population: 'all', indicator: k, rawValue: prov?.raw ?? value, value, unit: UNITS[k] ?? 'events', periodType: 'month',
        file: f.file ?? '', sheet: prov && at >= 0 ? prov.c.slice(0, at) : '', cell: prov ? prov.c.slice(at + 1) : '', formula: prov?.f ?? null, quality, version, valueKind: 'stored',
      });
      const sk = `${f.country}|${f.month}|${k}`;
      const cur = sums.get(sk);
      sums.set(sk, value === null ? (cur === undefined ? null : cur) : (cur ?? 0) + value);
    }
  }
  for (const r of ds.reported) {
    rows.push({
      country: r.country, project: r.scope === 'country' ? '*' : names.get(r.projectId ?? '') ?? r.projectId ?? '', month: r.month, population: 'all', indicator: r.indicator, rawValue: r.raw, value: r.value,
      unit: UNITS[r.indicator] ?? 'events', periodType: r.periodType, file: r.ref.file, sheet: r.ref.sheet, cell: r.ref.cell, formula: r.ref.formula ?? null, quality: r.quality, version, valueKind: 'stored',
    });
  }
  for (const [sk, value] of sums) {
    const [country, month, k] = sk.split('|');
    rows.push({ country: country as CountryCode, project: '*', month, population: 'all', indicator: k, rawValue: null, value, unit: UNITS[k] ?? 'events', periodType: 'month', file: '', sheet: '', cell: '', formula: null, quality: value === null ? 'empty' : 'ok', version, valueKind: 'recalculated' });
  }
  return rows;
}

export const ingestApi: IngestApi = { ingestFiles, writeWorkbook };
