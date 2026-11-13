/**
 * Perfil «incired»: formulario anual de contratista (hoja 'Estatistica'). Meses como texto sin año (el año sale del nombre del archivo),
 * columna de acumulado y columna de meta. Las hojas ocultas no se combinan. No se leen nombres de responsables ni comentarios.
 */
import type { CellRef, FactProv, MeasureKey, Month, MonthlyFact, QualityFlag, ReconItem, ReportedIndicator, ReportedStat, SourceFile } from '../../domain/types';
import { addr, cellAt, splitAddr, type Workbook } from '../xlsx/read';
import { labelKey } from './blocks';
import type { SourceMeta } from './corporate';
import { mkItem, readNum, slug, type ParsedSource } from './shared';

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
type RowDef = { ind: ReportedIndicator; kind: 'measure' | 'index' };
function rowDef(key: string): RowDef | null {
  if (key.startsWith('ACIDENTESEMAFASTAMENTO')) return { ind: 'accNoLostTime', kind: 'measure' };
  if (key.startsWith('ACIDENTECOMAFASTAMENTO')) return { ind: 'accLti', kind: 'measure' };
  if (key.startsWith('DIASPERDIDOS')) return { ind: 'lostDays', kind: 'measure' };
  if (key.startsWith('HORASDETREINAMENTO')) return { ind: 'trainingHours', kind: 'measure' };
  if (key === 'DETREINAMENTO') return { ind: 'trainingPct', kind: 'index' };
  if (key.startsWith('HOMEMHORASTRABALHADAS')) return { ind: 'hh', kind: 'measure' };
  if (key.startsWith('TAXADEFREQUENCIA')) return { ind: 'TF', kind: 'index' };
  if (key.startsWith('TAXADEGRAVIDADE')) return { ind: 'TG', kind: 'index' };
  if (key.startsWith('EFETIVO')) return { ind: 'workers', kind: 'measure' };
  return null;
}
const NUMERATORS = new Set<string>(['accNoLostTime', 'accLti', 'lostDays']);

export function parseIncired(wb: Workbook, meta: SourceMeta): ParsedSource {
  const file = meta.name;
  const sheet = wb.sheets.find((s) => s.name === 'Estatistica') ?? wb.sheets[0];
  const sn = sheet.name;
  const ref = (col: number, row: number): CellRef => ({ file, sheet: sn, cell: addr(col, row), formula: cellAt(sheet, col, row)?.f ?? null });
  const items: ReconItem[] = [];
  const out: ParsedSource = {
    source: {
      key: 'incired', profile: 'incired', country: 'BR', ...meta, lastDataMonth: null,
      sheets: wb.sheets.map((s) => ({ name: s.name, state: s.state === 'visible' ? 'visible' : 'hidden', used: s === sheet, ...(s === sheet ? {} : { noteKey: s.state === 'visible' ? 'rec.note.sheet_no_records' : 'rec.note.sheet_hidden_unverified' }) })),
      warnings: [],
    } as SourceFile,
    country: 'BR', projects: [], monthly: [], reported: [], targets: [], blocks: [], items, consol: [],
    stats: { cellsRead: wb.sheets.reduce((s, x) => s + x.cells.size, 0), duplicatesFlagged: 0, errorCells: [...sheet.cells.values()].filter((c) => c.t === 'e').length },
  };
  // Encabezado: fila con los nombres de los meses; etiquetas en la columna de «HOMEM HORAS TRABALHADAS».
  let headerRow = 0;
  const monthCol = new Map<number, number>(); // mes 1..12 → columna
  let acumCol = 0;
  let metaCol = 0;
  for (let r = 1; r <= Math.min(sheet.maxRow, 40) && !headerRow; r++) {
    const found = new Map<number, number>();
    for (let c = 1; c <= sheet.maxCol; c++) {
      const x = cellAt(sheet, c, r);
      if (!x || typeof x.v !== 'string') continue;
      const i = MONTHS.indexOf(labelKey(x.v).slice(0, 3));
      if (i >= 0 && labelKey(x.v).length <= 9 && !found.has(i + 1)) found.set(i + 1, c);
    }
    if (found.size >= 6) {
      headerRow = r;
      for (const [k, c] of found) monthCol.set(k, c);
      for (let c = 1; c <= sheet.maxCol; c++) { const x = cellAt(sheet, c, r); if (x && typeof x.v === 'string') { const k = labelKey(x.v); if (k.startsWith('ACUM')) acumCol = c; else if (k === 'META') metaCol = c; } }
    }
  }
  let labelCol = 0;
  let company: string | null = null;
  let companyRef: CellRef | null = null;
  for (const [a, c] of sheet.cells) {
    if (typeof c.v !== 'string') continue;
    const k = labelKey(c.v);
    const p = splitAddr(a);
    if (k === 'HOMEMHORASTRABALHADAS') labelCol = p.col;
    else if (k === 'EMPRESA' && (headerRow === 0 || p.row < headerRow)) {
      for (let cc = p.col + 1; cc <= sheet.maxCol; cc++) { const x = cellAt(sheet, cc, p.row); if (x && typeof x.v === 'string' && x.v.trim()) { company = x.v.trim(); companyRef = ref(cc, p.row); break; } }
    }
  }
  if (!headerRow || !labelCol) { out.source.warnings.push({ key: 'rec.warn.form_not_recognised' }); return out; }
  const ym = /20\d{2}/.exec(file);
  const year = ym ? ym[0] : (meta.modifiedAt ?? meta.loadedAt).slice(0, 4);
  items.push(mkItem('year_from_filename', { country: 'BR', params: { year, origin: ym ? 'name' : 'metadata' }, kpis: ['Q05'], refs: [ref(monthCol.get(1) ?? 1, headerRow)] }));
  const rows = new Map<string, { row: number; def: RowDef; label: string }>();
  let lastLabelled = headerRow;
  for (let r = headerRow + 1; r <= sheet.maxRow; r++) {
    const x = cellAt(sheet, labelCol, r);
    if (!x || typeof x.v !== 'string') continue;
    const def = rowDef(labelKey(x.v));
    if (def && !rows.has(def.ind)) { rows.set(def.ind, { row: r, def, label: x.v.trim() }); lastLabelled = r; }
  }
  const mOf = (k: number): Month => `${year}-${String(k).padStart(2, '0')}`;
  const num = (ind: string, col: number) => { const rw = rows.get(ind); return rw ? readNum(cellAt(sheet, col, rw.row)) : null; };
  let lastK = 0;
  let firstK = 0;
  for (let k = 1; k <= 12; k++) { const c = monthCol.get(k); const x = c ? num('hh', c) : null; if (x && x.value !== null && x.value > 0) { lastK = k; if (!firstK) firstK = k; } }
  const name = company ?? file.replace(/\.xlsx$/i, '');
  const pid = 'br-' + slug(name);
  const lastMonth = lastK ? mOf(lastK) : null;
  out.source.lastDataMonth = lastMonth;
  const notClosed: Month[] = [];
  const ncRefs: CellRef[] = [];
  let workersSeen = false;
  for (let k = 1; k <= lastK; k++) {
    const col = monthCol.get(k);
    if (!col) continue;
    const m = mOf(k);
    const hhv = num('hh', col);
    const v: MonthlyFact['v'] = {};
    const p: NonNullable<MonthlyFact['p']> = {};
    let open = false;
    for (const [ind, rw] of rows) {
      const cell = cellAt(sheet, col, rw.row);
      const x = readNum(cell);
      let q: QualityFlag = x.q;
      if (rw.def.kind === 'measure') {
        if (NUMERATORS.has(ind) && q === 'empty' && hhv && hhv.value !== null && hhv.value > 0) { q = 'not_closed'; open = true; ncRefs.push(ref(col, rw.row)); }
        if (ind === 'workers' && x.value !== null) workersSeen = true;
        v[ind as MeasureKey] = x.value;
        const prov: FactProv = { c: `${sn}!${addr(col, rw.row)}`, q };
        if (cell && cell.f) prov.f = cell.f;
        if (x.raw !== null) prov.raw = x.raw;
        p[ind as MeasureKey] = prov;
      }
    }
    if (open) notClosed.push(m);
    for (const [ind, rw] of rows) {
      if (rw.def.kind !== 'index') continue;
      const cell = cellAt(sheet, col, rw.row);
      const x = readNum(cell);
      if (!cell || x.q === 'empty') continue;
      const st: ReportedStat = { scope: 'project', country: 'BR', projectId: pid, month: m, indicator: ind as ReportedIndicator, periodType: 'month', value: x.value, raw: x.raw, quality: open && ind !== 'trainingPct' && x.q === 'ok' ? 'not_closed' : x.q, ref: ref(col, rw.row) };
      out.reported.push(st);
    }
    out.monthly.push({ projectId: pid, country: 'BR', month: m, basis: 'reported_counts', file, v, p });
  }
  if (acumCol && lastMonth) for (const [ind, rw] of rows) {
    if (ind === 'workers') continue;
    const cell = cellAt(sheet, acumCol, rw.row);
    const x = readNum(cell);
    if (!cell || x.q === 'empty') continue;
    out.reported.push({ scope: 'project', country: 'BR', projectId: pid, month: lastMonth, indicator: ind as ReportedIndicator, periodType: 'ytd', value: x.value, raw: x.raw, quality: x.q, ref: ref(acumCol, rw.row) });
  }
  out.projects.push({
    id: pid, name, country: 'BR', entity: name, client: null, activity: null, status: lastK ? 'active' : 'unknown', coords: null, coordsVerified: false, coordsSource: null, timezone: null,
    isDemo: false, firstMonth: firstK ? mOf(firstK) : null, lastMonth, sourceKey: 'incired', sourceBlock: companyRef, notes: [{ key: 'rec.note.location_pending' }],
  });
  out.blocks.push({ file, sheet: sn, title: name, country: 'BR', kind: 'project', firstMonth: firstK ? mOf(firstK) : null, lastMonth, measures: [...rows.values()].filter((r) => r.def.kind === 'measure').length, note: notClosed.length ? { key: 'rec.note.not_closed', params: { n: notClosed.length } } : null });
  // Hallazgos estructurales del formulario.
  if (notClosed.length) items.push(mkItem('not_closed', { severity: 'minor', country: 'BR', projectId: pid, projectName: name, months: notClosed, kpis: ['R06', 'R07', 'R10', 'BR01', 'BR02'], params: { n: notClosed.length }, refs: ncRefs }));
  const wr = rows.get('workers');
  if (!workersSeen) items.push(mkItem('headcount_missing', { country: 'BR', projectId: pid, projectName: name, kpis: ['R02'], params: { label: wr ? wr.label : '' }, refs: wr ? [ref(labelCol, wr.row)] : [] }));
  items.push(mkItem('location_pending', { country: 'BR', projectId: pid, projectName: name, kpis: [], params: {}, refs: companyRef ? [companyRef] : [] }));
  const hhRow = rows.get('hh');
  if (metaCol && hhRow) {
    const mc = cellAt(sheet, metaCol, hhRow.row);
    const ac = acumCol ? readNum(cellAt(sheet, acumCol, hhRow.row)).value : null;
    if (mc && mc.f) items.push(mkItem('meta_cell_ignored', { country: 'BR', projectId: pid, projectName: name, kpis: ['R01'], params: { label: hhRow.label }, reported: readNum(mc).value, recalculated: ac, refs: [ref(metaCol, hhRow.row)] }));
  }
  for (let r = lastLabelled + 1; r <= Math.min(lastLabelled + 3, sheet.maxRow); r++) {
    if (cellAt(sheet, labelCol, r)) continue;
    let n = 0;
    for (const c of monthCol.values()) { const x = cellAt(sheet, c, r); if (x && x.t === 'n') n++; }
    if (n >= 6) items.push(mkItem('unlabeled_row', { country: 'BR', projectId: pid, projectName: name, params: { row: r, n }, refs: [ref(monthCol.get(1) ?? 1, r)] }));
  }
  const tp = rows.get('trainingPct');
  if (tp && acumCol) {
    const c = cellAt(sheet, acumCol, tp.row);
    if (c && c.f && /AVERAGE|MEDIA|PROMEDIO/i.test(c.f)) {
      let hrs = 0;
      let hh = 0;
      for (const f of out.monthly) if (typeof f.v.trainingHours === 'number' && typeof f.v.hh === 'number' && f.v.hh > 0) { hrs += f.v.trainingHours; hh += f.v.hh; }
      items.push(mkItem('avg_of_pct', { country: 'BR', projectId: pid, projectName: name, kpis: [], params: { label: tp.label }, reported: readNum(c).value, recalculated: hh > 0 ? hrs / hh : null, refs: [ref(acumCol, tp.row)] }));
    }
  }
  const th = rows.get('trainingHours');
  if (th) items.push(mkItem('training_unit', { country: 'BR', projectId: pid, projectName: name, params: { label: th.label }, refs: [ref(labelCol, th.row)] }));
  const ld = rows.get('lostDays');
  if (ld && /DEBITADOS/.test(labelKey(ld.label))) items.push(mkItem('lost_days_combined', { country: 'BR', projectId: pid, projectName: name, kpis: ['R10', 'BR02'], params: { label: ld.label }, refs: [ref(labelCol, ld.row)] }));
  for (const s of wb.sheets) {
    if (s === sheet) continue;
    items.push(mkItem(s.state === 'visible' ? 'empty_sheet' : 'hidden_sheet', { country: 'BR', kpis: s.state === 'visible' ? ['R16'] : [], params: { sheet: s.name, cells: s.cells.size }, refs: [{ file, sheet: s.name, cell: 'A1', formula: null }] }));
  }
  if (out.stats.errorCells) {
    const er: CellRef[] = [];
    for (const [a, c] of sheet.cells) if (c.t === 'e' && er.length < 6) er.push({ file, sheet: sn, cell: a, formula: c.f });
    items.push(mkItem('error_cells', { country: 'BR', kpis: [], params: { n: out.stats.errorCells, imported: out.reported.filter((r) => r.quality === 'error').length }, refs: er }));
  }
  return out;
}
