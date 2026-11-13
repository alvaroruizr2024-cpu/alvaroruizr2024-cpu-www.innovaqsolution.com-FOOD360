import { describe, expect, it } from 'vitest';
import type { Dataset, MonthlyFact, ReconItem } from '../../src/domain/types';
import { ingestApi, ingestFiles, toStatRows } from '../../src/ingest/index';
import { ISSUE_TYPES } from '../../src/ingest/profiles/shared';
import { readWorkbook } from '../../src/ingest/xlsx/read';
import { allKeys, hasKey, translate } from '../../src/i18n/core';
import { REC_KEYS } from '../../src/i18n/rec';
import { buildXlsx, layout, NEW_FORMAT } from './helpers';
import { colombiaWorkbook, contractorWorkbook, corporateWorkbook } from './fixtures';

const CORP = { name: 'DEMO corporativo.xlsx', bytes: corporateWorkbook() };
const COL = { name: 'DEMO colombia.xlsx', bytes: colombiaWorkbook() };
const FORM = { name: 'HHT - DEMO-2031.xlsx', bytes: contractorWorkbook() };
const fact = (ds: Dataset, pid: string, m: string): MonthlyFact | undefined => ds.monthly.find((f) => f.projectId === pid && f.month === m);
const items = (ds: Dataset, type: string, country?: string): ReconItem[] => ds.reconciliation.filter((r) => r.issueKey === 'rec.issue.' + type && (!country || r.country === country));
const rep = (ds: Dataset, country: string, ind: string, period: string, m: string, scope = 'country') => ds.reported.find((r) => r.country === country && r.scope === scope && r.indicator === ind && r.periodType === period && r.month === m);

describe('ingesta del libro corporativo (sintético)', async () => {
  const res = await ingestFiles([CORP]);
  const ds = res.dataset as Dataset;
  it('usa solo la hoja MediaMovilNN más reciente y crea proyectos desde los bloques', () => {
    const src = ds.sources[0];
    expect([src.key, src.profile, src.country, src.lastDataMonth]).toEqual(['corporate', 'corporate', 'PE', '2031-08']);
    expect(src.sheets.map((s) => [s.name, s.state, s.used])).toEqual([['MediaMovil30', 'visible', false], ['MediaMovil31', 'visible', true], ['DEMO Cliente', 'hidden', false]]);
    expect(src.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(ds.projects.map((p) => [p.id, p.status, p.firstMonth, p.lastMonth])).toEqual([
      ['pe-demo-alfa', 'active', '2031-01', '2031-08'], ['pe-demo-beta', 'active', '2031-06', '2031-08'], ['pe-demo-gamma', 'active', '2031-01', '2031-08'],
      ['pe-demo-delta', 'closed', '2031-01', '2031-04'], ['pe-demo-historico-hist', 'closed', '2031-01', '2031-02'],
    ]);
    expect(ds.projects.every((p) => p.coords === null && p.timezone === null && p.client === null && !p.isDemo && p.country === 'PE')).toBe(true);
    expect(ds.monthly.some((f) => f.month.startsWith('2030'))).toBe(false);
    expect(ds.monthly).toHaveLength(29);
    expect(items(ds, 'sheets_not_imported')[0].params.n).toBe(2);
  });
  it('distingue el cero explícito de la celda vacía y guarda la procedencia', () => {
    const jan = fact(ds, 'pe-demo-alfa', '2031-01') as MonthlyFact;
    const feb = fact(ds, 'pe-demo-alfa', '2031-02') as MonthlyFact;
    expect(jan.v.accNv2).toBe(0);
    expect(jan.p?.accNv2?.q).toBe('ok');
    expect(feb.v.accNv2).toBeNull();
    expect(feb.p?.accNv2?.q).toBe('empty');
    expect(feb.v.accLti).toBe(1);
    expect('incInvestigated' in jan.v).toBe(false);              // la fila no existe en el formato nuevo → undefined
    expect(jan.v.accPerson).toBeNull();                           // la fila existe pero está vacía → null
    const hhRow = 10 + layout(NEW_FORMAT).height + 2 + layout(NEW_FORMAT).off.hh;
    expect(jan.p?.hh).toEqual({ c: `MediaMovil31!D${hhRow}`, q: 'ok', raw: 1000 });
    expect([jan.basis, jan.file, jan.country]).toEqual(['reported_counts', 'DEMO corporativo.xlsx', 'PE']);
    expect(fact(ds, 'pe-demo-beta', '2031-04')).toBeUndefined();  // sin exposición y solo ceros fuera de la ventana activa
  });
  it('marca restos de plantilla y marcadores de posición sin convertirlos en exposición', () => {
    for (const m of ['2031-01', '2031-02', '2031-03']) {
      const f = fact(ds, 'pe-demo-beta', m) as MonthlyFact;
      expect(Object.values(f.v).every((v) => v === null)).toBe(true);
      expect(f.p?.hh?.q).toBe('template_duplicate');
      expect(f.p?.hh?.raw).toBeGreaterThan(0);
    }
    expect(fact(ds, 'pe-demo-gamma', '2031-02')?.v.hh).toBe(710);
    const ph = fact(ds, 'pe-demo-delta', '2031-05') as MonthlyFact;
    expect([ph.v.hh, ph.p?.hh?.q, ph.v.workers]).toEqual([null, 'placeholder', 0]);
    expect(res.stats.duplicatesFlagged).toBe(3);
    expect(items(ds, 'template_duplicate')[0].months).toEqual(['2031-01', '2031-02', '2031-03']);
    expect(items(ds, 'placeholder')[0].months).toEqual(['2031-05']);
    const fl = items(ds, 'consol_flagged').filter((r) => r.kpisAffected.includes('R01'));
    expect(fl.map((r) => [r.months, r.severity, r.delta])).toEqual(expect.arrayContaining([[['2031-01', '2031-02', '2031-03'], 'material', -2130], [['2031-05'], 'minor', -1]]));
  });
  it('conserva las cifras del consolidado solo para conciliar; el error guardado nunca es cero', () => {
    expect(rep(ds, 'PE', 'hh', 'month', '2031-01')?.value).toBe(2850);
    expect(rep(ds, 'PE', 'hh', 'ytd', '2031-03')?.value).toBe(8900);
    expect(rep(ds, 'PE', 'TRIFR', 'month', '2031-02')?.ref.formula).toContain('*1000000/');
    const err = rep(ds, 'PE', 'IF', 'month', '2031-08');
    expect([err?.value, err?.quality, err?.raw]).toEqual([null, 'error', '#DIV/0!']);
    expect(ds.reported.some((r) => r.value === 99999)).toBe(false); // columna sin fecha de encabezado
    expect(items(ds, 'error_cells')[0].params).toMatchObject({ n: 1, imported: 1 });
    expect(res.stats.errorCells).toBe(1);
  });
  it('concilia: fórmula del consolidado que omite un bloque', () => {
    const it = items(ds, 'consol_omits_blocks').find((r) => r.kpisAffected.includes('R06')) as ReconItem;
    expect([it.severity, it.months, it.reportedValue, it.recalculatedValue, it.delta]).toEqual(['material', ['2031-05'], 0, 1, 1]);
    expect(it.params).toMatchObject({ blocks: 'DEMO GAMMA', nBlocks: 1 });
    expect([it.sourceChosenKey, it.ruleKey]).toEqual(['rec.source.project_blocks', 'rec.rule.sum_blocks']);
    expect(it.refs[0]).toMatchObject({ file: 'DEMO corporativo.xlsx', sheet: 'MediaMovil31' });
    expect(it.refs[0].formula).toMatch(/^=H\d+\+H\d+$/);
    const idx = items(ds, 'index_differs.month').find((r) => r.params.indicator === 'TRIFR' && r.months?.includes('2031-05')) as ReconItem;
    expect(idx.reportedValue).toBe(0);
    expect(idx.recalculatedValue).toBeCloseTo(1e6 / 2140, 6);
    expect(idx.kpisAffected).toEqual(expect.arrayContaining(['C04', 'R12']));
    expect(items(ds, 'person_row_not_sum')[0].months).toEqual(['2031-02']);
  });
  it('metas: valor guardado, valor efectivo modal y marca de autorrelleno', () => {
    const corp = ds.targets.filter((t) => t.scope === 'corporate' && t.indicator === 'TRIFR');
    expect(corp).toHaveLength(8);
    expect(corp.slice(0, 7).every((t) => t.stored === 4 && t.effective === 4 && t.flagKey === null && t.country === null)).toBe(true);
    expect([corp[7].stored, corp[7].effective, corp[7].flagKey]).toEqual([5, 4, 'rec.target.autofill_suspect']);
    expect(ds.targets.filter((t) => t.scope === 'project').every((t) => t.projectId === 'pe-demo-alfa' && t.stored === 3)).toBe(true);
    expect(ds.targets).toHaveLength(24);
    expect(items(ds, 'target_autofill').map((r) => [r.months, r.reportedValue, r.recalculatedValue])).toEqual([[['2031-08'], 5, 4]]);
  });
  it('marca las fuentes que faltan y deja preparados los módulos pendientes', () => {
    expect(items(ds, 'source_missing').map((r) => r.country).sort()).toEqual(['BR', 'CO']);
    expect([ds.kind, ds.schema, ds.cutoffMonth]).toEqual(['real', 1, '2031-08']);
    expect(ds.modules.exposure.state).toBe('available');
    expect(ds.modules.training.state).toBe('pending');
    expect(ds.modules.cases).toEqual({ state: 'pending', reasonKey: 'rec.module.cases.pending', requirements: ['rec.req.eventos', 'rec.req.casos'], templateFile: '/templates/casos.csv' });
    expect(ds.modules.predictive.state).toBe('disabled');
    expect(ds.config).toEqual({ taxonomyVersion: 'reportado-v1', triMeasures: ['accFatal', 'accLti', 'accNv3', 'accNv2'], ltiMeasures: ['accLti'], rateConstant: 1e6, warnBand: 0.2, smallExposureHH: 100000, predictiveApproved: false });
    expect([ds.events, ds.cases, ds.controls, ds.verifications, ds.planActivities, ds.actions, ds.programStats, ds.hygiene].every((a) => a.length === 0)).toBe(true);
    expect(ds.reconciliation.map((r) => r.id)).toEqual(ds.reconciliation.map((_, i) => 'REC-' + String(i + 1).padStart(3, '0')));
  });
});

describe('ingesta del libro de Colombia (sintético)', async () => {
  const res = await ingestFiles([COL]);
  const ds = res.dataset as Dataset;
  it('no importa meses con solo encabezado y conserva el cero explícito de HH', () => {
    expect(ds.sources[0].lastDataMonth).toBe('2031-04');
    expect(ds.monthly.some((f) => f.month > '2031-04') || ds.reported.some((r) => r.month > '2031-04')).toBe(false);
    expect(items(ds, 'future_months')[0].months).toEqual(['2031-05', '2031-06']);
    expect(ds.projects.map((p) => [p.id, p.status, p.lastMonth])).toEqual([['co-demo-norte', 'active', '2031-04'], ['co-demo-sur', 'closed', '2031-03']]);
    const z = fact(ds, 'co-demo-sur', '2031-04') as MonthlyFact;
    expect([z.v.hh, z.p?.hh?.q, z.v.workers]).toEqual([0, 'ok', 0]);
    expect(fact(ds, 'co-demo-norte', '2031-01')?.v.accNv1).toBeNull();
    expect(items(ds, 'error_cells')[0].params).toMatchObject({ n: 2, imported: 0 });
    expect(rep(ds, 'CO', 'TACSA', 'rolling12', '2031-04')?.value).toBeCloseTo(1e6 / 1090, 6);
    expect(rep(ds, 'CO', 'TACSA', 'month', '2031-03', 'project')?.projectId).toBe('co-demo-norte');
  });
  it('concilia: referencia desplazada a una fila con otra etiqueta', () => {
    const sh = items(ds, 'consol_ref_shifted').find((r) => r.months?.includes('2031-02')) as ReconItem;
    expect([sh.severity, sh.reportedValue, sh.recalculatedValue, sh.delta]).toEqual(['material', 0, 3, 3]);
    expect(sh.params).toMatchObject({ label: 'Nv. 04', target: 'Nv. 5,6', blocks: 'DEMO NORTE · DEMO SUR' });
    expect(sh.kpisAffected).toContain('R15');
    expect(sh.reasonKey).toBe('rec.reason.formula_ref');
    const first = items(ds, 'consol_ref_shifted').find((r) => r.months?.includes('2031-01')) as ReconItem;
    expect([first.reportedValue, first.recalculatedValue]).toEqual([1, 0]);
    expect(items(ds, 'ref_mismatch_no_effect')[0].months).toEqual(['2031-03', '2031-04']);
    expect(ds.monthly.filter((f) => f.month === '2031-02').reduce((s, f) => s + (f.v.pg4 ?? 0), 0)).toBe(3);
  });
  it('marca la constante escrita donde el patrón de la fila es una fórmula', () => {
    expect(rep(ds, 'CO', 'lostDays', 'month', '2031-03')?.quality).toBe('hardcoded');
    expect(rep(ds, 'CO', 'lostDays', 'month', '2031-04')?.quality).toBe('ok');
    expect(items(ds, 'hardcoded_constant')[0]).toMatchObject({ severity: 'info', months: ['2031-03'] });
    expect(items(ds, 'index_differs.month')).toHaveLength(0);
  });
});

describe('ingesta del formulario de contratista (sintético)', async () => {
  const res = await ingestFiles([FORM]);
  const ds = res.dataset as Dataset;
  const pid = 'br-demo-contratista';
  it('mes con HH y accidentes vacíos → null + not_closed, nunca cero', () => {
    expect(ds.sources[0].lastDataMonth).toBe('2031-06');
    expect(ds.monthly.map((f) => f.month)).toEqual(['2031-01', '2031-02', '2031-03', '2031-04', '2031-05', '2031-06']);
    const jun = fact(ds, pid, '2031-06') as MonthlyFact;
    expect([jun.v.hh, jun.v.accNoLostTime, jun.v.accLti, jun.v.lostDays, jun.v.trainingHours]).toEqual([4000, null, null, null, 40]);
    expect([jun.p?.accNoLostTime?.q, jun.p?.accLti?.q, jun.p?.lostDays?.q]).toEqual(['not_closed', 'not_closed', 'not_closed']);
    const jan = fact(ds, pid, '2031-01') as MonthlyFact;
    expect([jan.v.hh, jan.p?.hh?.q, jan.v.accLti, jan.v.accNoLostTime]).toEqual([null, 'empty', 0, 0]);
    expect(ds.monthly.every((f) => f.v.workers === null)).toBe(true);
    expect(items(ds, 'not_closed')[0]).toMatchObject({ months: ['2031-06'], severity: 'minor' });
    expect(rep(ds, 'BR', 'TF', 'month', '2031-06', 'project')?.quality).toBe('not_closed');
  });
  it('acumulado guardado frente a recálculo con meses pareados', () => {
    expect(rep(ds, 'BR', 'TF', 'ytd', '2031-06', 'project')?.value).toBe(100);
    const cov = items(ds, 'index_coverage.ytd')[0];
    expect(cov.reportedValue).toBe(100);
    expect(cov.recalculatedValue).toBeCloseTo(1e6 / 6000, 6);
    expect([cov.severity, cov.kpisAffected, cov.ruleKey]).toEqual(['material', ['BR01'], 'rec.rule.paired_months']);
    expect(items(ds, 'index_differs.month')).toHaveLength(0);
    const avg = items(ds, 'avg_of_pct')[0];
    expect([avg.reportedValue, avg.recalculatedValue]).toEqual([null, 0.01]);
    expect(ds.reported.filter((r) => r.quality === 'error').every((r) => r.value === null && r.indicator === 'trainingPct')).toBe(true);
  });
  it('año desde el nombre del archivo, proyecto sin ubicación y hallazgos del formulario', () => {
    expect(items(ds, 'year_from_filename')[0].params).toMatchObject({ year: '2031', origin: 'name' });
    const p = ds.projects[0];
    expect([p.id, p.name, p.entity, p.client, p.coords, p.timezone, p.country]).toEqual([pid, 'DEMO CONTRATISTA', 'DEMO CONTRATISTA', null, null, null, 'BR']);
    for (const t of ['headcount_missing', 'location_pending', 'meta_cell_ignored', 'unlabeled_row', 'hidden_sheet', 'empty_sheet', 'training_unit', 'lost_days_combined']) expect(items(ds, t), t).toHaveLength(1);
    expect(items(ds, 'meta_cell_ignored')[0]).toMatchObject({ reportedValue: 20000, recalculatedValue: 10000 });
    expect(ds.sources[0].sheets.map((s) => [s.name, s.used])).toEqual([['Estatistica', true], ['Dados de Acidentes Pessoais', false], ['HHT', false]]);
    expect(ds.modules.training.state).toBe('partial');
    expect(ds.modules.potential.state).toBe('pending');
    expect(JSON.stringify(res)).not.toMatch(/DEMO PERSONA|DEMO Autor|DEMO Editor|COMENTARIO/); // sin responsables, autores ni comentarios
  });
});

describe('conjunto combinado, tabla larga e i18n', async () => {
  const res = await ingestApi.ingestFiles([FORM, CORP, COL]);
  const ds = res.dataset as Dataset;
  it('combina las tres fuentes en un único conjunto real', () => {
    expect(ds.sources.map((s) => s.key)).toEqual(['corporate', 'colombia', 'incired']);
    expect(ds.cutoffMonth).toBe('2031-08');
    expect(new Set(ds.projects.map((p) => p.country))).toEqual(new Set(['PE', 'CO', 'BR']));
    expect(items(ds, 'source_missing')).toHaveLength(0);
    expect(res.files).toHaveLength(3);
    expect(res.blocks.filter((b) => b.kind === 'consolidated').map((b) => b.country).sort()).toEqual(['CO', 'PE']);
    expect(res.stats.factsCreated).toBe(ds.monthly.length);
    expect(res.issues).toBe(ds.reconciliation);
    expect(res.errors).toEqual([]);
    const sev = ds.reconciliation.map((r) => r.severity);
    expect(sev).toEqual([...sev].sort((a, b) => ['material', 'minor', 'info'].indexOf(a) - ['material', 'minor', 'info'].indexOf(b)));
  });
  it('carga parcial y carga incremental sobre un conjunto previo', async () => {
    const first = (await ingestFiles([COL])).dataset as Dataset;
    const second = (await ingestFiles([CORP], first)).dataset as Dataset;
    expect(second.sources.map((s) => s.key)).toEqual(['corporate', 'colombia']);
    expect(second.monthly.filter((f) => f.country === 'CO')).toHaveLength(first.monthly.length);
    expect(items(second, 'source_missing').map((r) => r.country)).toEqual(['BR']);
    expect(items(second, 'consol_ref_shifted', 'CO').length).toBeGreaterThan(0);
    const none = await ingestFiles([{ name: 'DEMO otro.xlsx', bytes: buildXlsx([{ name: 'DEMO', cells: { A1: 'x' } }]) }, { name: 'DEMO roto.xlsx', bytes: new Uint8Array([1, 2, 3]) }]);
    expect(none.dataset).toBeNull();
    expect(none.errors.map((e) => e.key)).toEqual(['rec.error.unknown_profile', 'rec.error.unreadable']);
    expect(none.files.map((f) => f.profile)).toEqual(['unknown', 'unknown']);
  });
  it('deriva la tabla larga de estadísticas mensuales', () => {
    const rows = toStatRows(ds);
    const hh = rows.find((r) => r.project === 'DEMO ALFA' && r.month === '2031-01' && r.indicator === 'hh' && r.valueKind === 'stored');
    expect(hh).toMatchObject({ country: 'PE', population: 'all', rawValue: 1000, value: 1000, unit: 'hh', periodType: 'month', file: 'DEMO corporativo.xlsx', sheet: 'MediaMovil31', formula: null, quality: 'ok', version: 'reportado-v1' });
    expect(hh?.cell).toMatch(/^D\d+$/);
    expect(rows.find((r) => r.project === '*' && r.country === 'CO' && r.indicator === 'TACSA' && r.periodType === 'rolling12')?.unit).toBe('per1e6hh');
    expect(rows.find((r) => r.valueKind === 'recalculated' && r.country === 'PE' && r.month === '2031-05' && r.indicator === 'accLti')?.value).toBe(1);
    expect(rows.find((r) => r.project === 'DEMO BETA' && r.month === '2031-01' && r.indicator === 'hh')).toMatchObject({ value: null, rawValue: 700, quality: 'template_duplicate' });
    expect(new Set(rows.map((r) => r.periodType))).toEqual(new Set(['month', 'ytd', 'rolling12']));
  });
  it('exporta con el escritor del importador', () => {
    const wb = readWorkbook(ingestApi.writeWorkbook([{ name: 'DEMO', rows: [['a', 1]] }]));
    expect(wb.sheets[0].cells.get('B1')?.v).toBe(1);
  });
  it('todas las claves rec.* emitidas existen en es, en y pt con los mismos parámetros', () => {
    const keys = new Set<string>(REC_KEYS);
    for (const r of ds.reconciliation) [r.issueKey, r.sourceChosenKey, r.reasonKey, r.ruleKey].forEach((k) => keys.add(k));
    for (const m of Object.values(ds.modules)) { keys.add(m.reasonKey); (m.requirements ?? []).forEach((k) => keys.add(k)); }
    for (const p of ds.projects) (p.notes ?? []).forEach((n) => keys.add(n.key));
    for (const s of ds.sources) { s.sheets.forEach((x) => x.noteKey && keys.add(x.noteKey)); s.warnings.forEach((w) => keys.add(w.key)); }
    for (const t of ds.targets) if (t.flagKey) keys.add(t.flagKey);
    for (const b of res.blocks) if (b.note) keys.add(b.note.key);
    for (const t of ISSUE_TYPES) (hasKey('es', 'rec.issue.' + t) ? ['rec.issue.' + t] : ['month', 'ytd', 'rolling12'].map((p) => `rec.issue.${t}.${p}`)).forEach((k) => keys.add(k));
    ['rec.error.unknown_profile', 'rec.error.duplicate_profile', 'rec.error.unreadable', 'rec.warn.no_consolidated', 'rec.warn.form_not_recognised', 'rec.module.source_pending', 'rec.module.training.partial'].forEach((k) => keys.add(k));
    const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
    for (const k of keys) {
      for (const l of ['es', 'en', 'pt'] as const) expect(hasKey(l, k), `${k} [${l}]`).toBe(true);
      expect(params(translate('en', k)), k).toBe(params(translate('es', k)));
      expect(params(translate('pt', k)), k).toBe(params(translate('es', k)));
    }
    for (const r of ds.reconciliation) expect(translate('es', r.issueKey, r.params), r.issueKey).not.toMatch(/\{\w+\}/);
    expect(allKeys('es').filter((k) => k.startsWith('rec.')).length).toBe(REC_KEYS.length);
  });
});
