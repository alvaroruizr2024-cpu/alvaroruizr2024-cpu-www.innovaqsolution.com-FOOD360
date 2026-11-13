/**
 * Analizador de bloques guiado por etiquetas (compartido por el libro corporativo y el de Colombia).
 * No usa posiciones fijas: los bloques se abren con el encabezado de potencial, las filas se reconocen por su etiqueta
 * (sin tildes, mayúsculas ni espacios) y los meses salen de las celdas de fecha del encabezado de cada sección.
 */
import type { Month, ReportedIndicator } from '../../domain/types';
import { cellAt, extractRefs, type Sheet } from '../xlsx/read';
import { monthFromIndex, monthIndex } from './shared';

export type PeriodType = 'month' | 'ytd' | 'rolling12';
export type RowKind = 'measure' | 'index' | 'target_corporate' | 'target_project';
export interface BlockRow {
  row: number; label: string; ind: ReportedIndicator; period: PeriodType; kind: RowKind;
  cols: Array<[number, Month]>; byMonth: Map<Month, number>; formulaShare: number;
}
export interface Block {
  index: number; title: string; name: string; number: number | null; titleRow: number | null; headerRow: number;
  firstRow: number; lastRow: number; format: 'new' | 'old'; hidden: boolean;
  rows: BlockRow[]; months: Month[]; refBlocks: Set<number>; consolidated: boolean;
}
/** Encabezado con celdas de fecha vacías (blank) o fuera de la secuencia mensual (wrong) entre su primera y su última fecha. */
export interface HeaderFix { row: number; col: number; blank: number; wrong: number }
export interface BlockSheet { sheet: Sheet; labelCol: number; blocks: Block[]; rowMap: Map<number, BlockRow>; headerFixes: HeaderFix[] }

export const labelKey = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

type Sec = 'pg' | 'nv' | 'month' | 'ytd' | 'r12' | 'tcorp' | 'tproj';
function sectionOf(key: string, tag: string): { sec: Sec; format?: 'new' | 'old' } | null {
  if (key.startsWith('CLASIFICACIONPOR')) return tag === 'PG' ? { sec: 'pg', format: 'new' } : tag === 'NV' ? { sec: 'nv' } : null;
  if (key === 'POTENCIALDEGRAVEDAD') return { sec: 'pg', format: 'old' };
  if (key === 'ACCIDENTES') return { sec: 'nv' };
  if (key.startsWith('INDICEMENSUAL') || key.startsWith('INDICADORMENSUAL')) return { sec: 'month' };
  if (key === 'ANUALSOLODELANO' || key.startsWith('INDICADORANUAL')) return { sec: 'ytd' };
  if (key === 'ACUMULADO' || key.startsWith('INDICADOR12MESES')) return { sec: 'r12' };
  if (key.startsWith('TARGETCORPORATIVO')) return { sec: 'tcorp' };
  if (key.startsWith('TARGETPROYECTO')) return { sec: 'tproj' };
  return null;
}
const PG: Record<string, ReportedIndicator> = { '56': 'pg56', '4': 'pg4', '3': 'pg3', '2': 'pg2', '1': 'pg1' };
const NV: Record<string, ReportedIndicator> = { '3': 'accNv3', '2': 'accNv2', '1': 'accNv1' };
function rowIndicator(sec: Sec, key: string, tag: string, format: 'new' | 'old', first: boolean): ReportedIndicator | null {
  if (sec === 'pg') {
    if (key === 'PG') return PG[tag] ?? null;
    const m = /^NV0?(56|[1-4])$/.exec(key);
    return m ? PG[m[1]] : null;
  }
  if (sec === 'nv') {
    if (key.startsWith('ACCIDENTESMORTALES')) return 'accFatal';
    if (key.startsWith('ACCIDENTESINCAPACITANTES')) return 'accLti';
    if (key.startsWith('ACCIDENTESLEVES')) { const m = /NV0?([1-3])$/.exec(key); return NV[m ? m[1] : tag] ?? null; }
    if (key.startsWith('ACCIDENTESALAPERSONA')) return 'accPerson';
    if (key.startsWith('ACCIDENTESALAPROPIEDAD')) return 'accProperty';
    if (key.startsWith('INCIDENTESALAPERSONA')) return 'incPerson';
    if (key.startsWith('INCIDENTESALAPROPIEDAD')) return 'incProperty';
    if (key.startsWith('INCIDENTESINVESTIGADOS')) return 'incInvestigated';
    if (key.startsWith('HPRICONPERDIDA')) return 'hpriLoss';
    if (key.startsWith('HPRISINPERDIDA')) return 'hpriNoLoss';
    return null;
  }
  if (sec === 'tcorp' || sec === 'tproj') {
    if (key.startsWith('LIMITEMAXIMOTRIFR')) return 'TRIFR';
    if (key === 'TARGETIF') return 'IF';
    if (key === 'TARGETIS') return 'IS';
    if (key === 'TARGETIA') return 'IA';
    return null;
  }
  if (key.startsWith('INDICEDEFRECUENCIA')) return 'IF';
  if (key.startsWith('INDICEDESEVERIDAD')) return 'IS';
  if (key.startsWith('INDICEDEACCIDENTABILIDAD')) return 'IA';
  if (key.startsWith('HORASHOMBRETRABAJADAS')) return 'hh';
  if (key.startsWith('DIASPERDIDOSPORACC')) return 'lostDays';
  if (key.includes('TRABAJADORES')) return sec === 'month' ? 'workers' : null;
  if (key.startsWith('DESEMPENOENSSOMA')) return sec === 'month' ? 'ssomaScore' : null;
  if (key.startsWith('TRIFR') || key.startsWith('TACSA') || (first && sec === 'month' && format === 'new')) return format === 'new' ? 'TRIFR' : 'TACSA';
  return null;
}
const MEASURES_IN_MONTH = new Set<string>(['hh', 'lostDays', 'workers', 'ssomaScore']);

function detectLabelCol(sheet: Sheet): number {
  let best = 1;
  let bestN = -1;
  for (let c = 1; c <= 4; c++) {
    let n = 0;
    for (let r = 1; r <= sheet.maxRow; r++) {
      const x = cellAt(sheet, c, r);
      if (x && typeof x.v === 'string') { const k = labelKey(x.v); if (k === 'POTENCIALDEGRAVEDAD' || k.startsWith('CLASIFICACIONPOR')) n++; }
    }
    if (n > bestN) { bestN = n; best = c; }
  }
  return best;
}
/**
 * Meses de una sección = celdas de fecha de su propio encabezado. Si al menos el 80 % de las fechas forma una secuencia mensual
 * continua, las celdas intermedias vacías o con una fecha fuera de secuencia (p. ej. el año mal escrito) toman el mes que les
 * corresponde en esa secuencia y la corrección queda registrada. Las columnas posteriores a la última fecha (totales) se ignoran.
 */
function dateCols(sheet: Sheet, row: number, from: number, fixes: HeaderFix[]): Array<[number, Month]> {
  const raw: Array<[number, number]> = [];
  for (let c = from; c <= sheet.maxCol; c++) {
    const x = cellAt(sheet, c, row);
    if (x && x.t === 'd' && typeof x.v === 'string' && /^\d{4}-\d{2}/.test(x.v)) raw.push([c, monthIndex(x.v.slice(0, 7))]);
  }
  const asIs = (): Array<[number, Month]> => raw.map(([c, m]) => [c, monthFromIndex(m)] as [number, Month]);
  if (raw.length < 6) return asIs();
  const cnt = new Map<number, number>();
  for (const [c, m] of raw) cnt.set(m - c, (cnt.get(m - c) ?? 0) + 1);
  let off = 0;
  let best = 0;
  for (const [o, n] of cnt) if (n > best) { best = n; off = o; }
  if (best / raw.length < 0.8) return asIs();
  const first = raw[0][0];
  const last = raw[raw.length - 1][0];
  const have = new Map(raw);
  const out: Array<[number, Month]> = [];
  let blank = 0;
  let wrong = 0;
  let at = 0;
  for (let c = first; c <= last; c++) {
    const m = have.get(c);
    if (m === undefined) { blank++; at = at || c; } else if (m !== c + off) { wrong++; at = at || c; }
    out.push([c, monthFromIndex(c + off)]);
  }
  if (blank || wrong) fixes.push({ row, col: at, blank, wrong });
  return out;
}
function rowCells(sheet: Sheet, row: number): number {
  let n = 0;
  for (let c = 1; c <= sheet.maxCol && n < 3; c++) { const x = cellAt(sheet, c, row); if (x && x.v !== null && String(x.v).trim() !== '') n++; }
  return n;
}

export function parseBlocks(sheet: Sheet): BlockSheet {
  const labelCol = detectLabelCol(sheet);
  const blocks: Block[] = [];
  const rowMap = new Map<number, BlockRow>();
  const headerFixes: HeaderFix[] = [];
  let cur: Block | null = null;
  let sec: Sec | null = null;
  let secCols: Array<[number, Month]> = [];
  let lastDated: Array<[number, Month]> = [];
  let first = false;
  let pending: { row: number; text: string } | null = null;
  for (let r = 1; r <= sheet.maxRow; r++) {
    const lc = cellAt(sheet, labelCol, r);
    if (!lc || lc.v === null) continue;
    const label = String(lc.v);
    const key = labelKey(label);
    if (key === '') continue;
    const tc = cellAt(sheet, labelCol + 1, r);
    const tag = tc && tc.v !== null && (tc.t === 's' || tc.t === 'n') ? labelKey(String(tc.v)) : '';
    const s = sectionOf(key, tag);
    if (s) {
      const cols = dateCols(sheet, r, labelCol + 1, headerFixes);
      if (s.sec === 'pg') {
        const t = pending && r - pending.row <= 3 ? pending : null;
        const title = t ? t.text.trim() : '';
        const nm = /^(\d{1,3})\s*[.)\-]\s*(.+)$/.exec(title);
        const firstRow = t ? t.row : r;
        if (cur) cur.lastRow = firstRow - 1;
        cur = {
          index: blocks.length, title, name: nm ? nm[2].trim() : title, number: nm ? Number(nm[1]) : null, titleRow: t ? t.row : null, headerRow: r,
          firstRow, lastRow: sheet.maxRow, format: s.format ?? 'old', hidden: sheet.hiddenRows.has(r), rows: [], months: [], refBlocks: new Set<number>(), consolidated: false,
        };
        blocks.push(cur);
        lastDated = [];
      }
      pending = null;
      if (!cur) continue;
      sec = s.sec;
      first = true;
      if (cols.length) { secCols = cols; lastDated = cols; } else secCols = lastDated;
      continue;
    }
    if (cur && sec) {
      const ind = rowIndicator(sec, key, tag, cur.format, first);
      if (ind) {
        first = false;
        const period: PeriodType = sec === 'ytd' ? 'ytd' : sec === 'r12' ? 'rolling12' : 'month';
        const kind: RowKind = sec === 'tcorp' ? 'target_corporate' : sec === 'tproj' ? 'target_project'
          : sec === 'pg' || sec === 'nv' || (sec === 'month' && MEASURES_IN_MONTH.has(ind)) ? 'measure' : 'index';
        if (cur.rows.some((x) => x.ind === ind && x.period === period && x.kind === kind)) continue;
        let filled = 0;
        let formulas = 0;
        for (const [c] of secCols) { const x = cellAt(sheet, c, r); if (x) { filled++; if (x.f) formulas++; } }
        const tagText = (sec === 'pg' || sec === 'nv') && tc && tc.v !== null && String(tc.v).trim() !== '' && cellAt(sheet, labelCol + 1, cur.headerRow)?.t === 's' ? ` (${String(tc.v).trim()})` : '';
        const br: BlockRow = { row: r, label: label.trim() + tagText, ind, period, kind, cols: secCols, byMonth: new Map(secCols.map(([c, m]) => [m, c] as [Month, number])), formulaShare: filled ? formulas / filled : 0 };
        cur.rows.push(br);
        rowMap.set(r, br);
        continue;
      }
    }
    if (rowCells(sheet, r) <= 2) pending = { row: r, text: label };
  }
  for (const b of blocks) {
    const set = new Set<Month>();
    for (const row of b.rows) if (row.period === 'month' && row.kind === 'measure') for (const [, m] of row.cols) set.add(m);
    b.months = [...set].sort();
  }
  // Consolidado = bloque cuya fila de HH (o, en su defecto, de accidentes) suma filas de otros bloques.
  for (const b of blocks) {
    const row = b.rows.find((x) => x.ind === 'hh' && x.period === 'month') ?? b.rows.find((x) => x.ind === 'accLti' && x.period === 'month');
    if (!row) continue;
    let formulas = 0;
    let outside = 0;
    for (const [c] of row.cols) {
      const x = cellAt(sheet, c, row.row);
      if (!x || !x.f) continue;
      formulas++;
      let hit = false;
      for (const rf of extractRefs(x.f.slice(1))) {
        if (rf.qualified) continue;
        const o = blockOfRow(blocks, rf.r1);
        if (o && o !== b) { b.refBlocks.add(o.index); hit = true; }
      }
      if (hit) outside++;
    }
    b.consolidated = formulas > 0 && outside / formulas >= 0.5;
  }
  return { sheet, labelCol, blocks, rowMap, headerFixes };
}

export function blockOfRow(blocks: Block[], row: number): Block | null {
  let lo = 0;
  let hi = blocks.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const b = blocks[mid];
    if (row < b.firstRow) hi = mid - 1; else if (row > b.lastRow) lo = mid + 1; else return b;
  }
  return null;
}
