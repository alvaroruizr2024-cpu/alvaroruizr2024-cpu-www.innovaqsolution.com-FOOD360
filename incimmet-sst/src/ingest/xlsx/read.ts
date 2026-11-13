/**
 * Lector XLSX mínimo y sin dependencias (solo fflate para descomprimir). Apto para navegador: no usa APIs de Node.
 * Privacidad: NO se abren comentarios, dibujos ni vínculos externos; esas partes ni siquiera se descomprimen.
 */
import { unzipSync } from 'fflate';

export type CellType = 'n' | 's' | 'b' | 'e' | 'd';
/** t: n número · s texto · b booleano · e error guardado (v = '#DIV/0!') · d fecha/hora (v = ISO 'YYYY-MM-DD[THH:MM:SS]' o 'HH:MM:SS'). f = fórmula con '=' inicial. */
export interface Cell { v: number | string | boolean | null; t: CellType; f: string | null }
export interface Sheet {
  name: string; state: 'visible' | 'hidden' | 'veryHidden';
  cells: Map<string, Cell>; maxRow: number; maxCol: number;
  hiddenRows: Set<number>; hiddenCols: Set<number>;
}
export interface Workbook {
  sheets: Sheet[]; date1904: boolean;
  props: { creator: string | null; lastModifiedBy: string | null; modified: string | null };
}
export interface FormulaRef { c1: number; r1: number; c2: number; r2: number; qualified: boolean }

const MAX_COL = 16384;
const MAX_ROW = 1048576;
const COLS: string[] = [];
export function numToCol(n: number): string {
  let s = COLS[n];
  if (s !== undefined) return s;
  s = '';
  let x = n;
  while (x > 0) { const r = (x - 1) % 26; s = String.fromCharCode(65 + r) + s; x = (x - 1 - r) / 26; }
  COLS[n] = s;
  return s;
}
export function colToNum(c: string): number {
  let n = 0;
  for (let i = 0; i < c.length; i++) n = n * 26 + (c.charCodeAt(i) & 31);
  return n;
}
export function splitAddr(a: string): { col: number; row: number } {
  let i = 0;
  while (i < a.length && a.charCodeAt(i) > 57) i++;
  return { col: colToNum(a.slice(0, i)), row: parseInt(a.slice(i), 10) };
}
export const addr = (col: number, row: number): string => numToCol(col) + row;
export const cellAt = (sheet: Sheet, col: number, row: number): Cell | undefined => sheet.cells.get(numToCol(col) + row);

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
export function decodeXml(s: string): string {
  if (s.indexOf('&') < 0) return s;
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|\w+);/g, (m, e: string) => {
    if (e.charCodeAt(0) === 35) {
      const code = e.charCodeAt(1) === 120 ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENT[e] ?? m;
  });
}
function attr(tag: string, name: string): string | null {
  const k = ' ' + name + '="';
  const i = tag.indexOf(k);
  if (i >= 0) { const e = tag.indexOf('"', i + k.length); return decodeXml(tag.slice(i + k.length, e)); }
  const k2 = ' ' + name + "='";
  const j = tag.indexOf(k2);
  if (j < 0) return null;
  const e2 = tag.indexOf("'", j + k2.length);
  return decodeXml(tag.slice(j + k2.length, e2));
}
/** Concatena los <t> de un <si>/<is> (texto enriquecido), sin las guías fonéticas. */
function richText(x: string): string {
  if (x.indexOf('<rPh') >= 0) x = x.replace(/<rPh[\s\S]*?<\/rPh>/g, '');
  let out = '';
  let i = 0;
  for (;;) {
    const a = x.indexOf('<t', i);
    if (a < 0) break;
    const c = x.charCodeAt(a + 2);
    if (c !== 62 && c !== 32 && c !== 47) { i = a + 2; continue; }
    const g = x.indexOf('>', a);
    if (g < 0) break;
    if (x.charCodeAt(g - 1) === 47) { i = g + 1; continue; }
    const e = x.indexOf('</t>', g);
    if (e < 0) break;
    out += x.slice(g + 1, e);
    i = e + 4;
  }
  return decodeXml(out).replace(/x005F_/g, '');
}

// ---------------- fórmulas: desplazamiento de fórmulas compartidas y extracción de referencias ----------------
const TOKEN = /"(?:[^"]|"")*"|'(?:[^']|'')*'|\[[^\]]*\]|(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7})(?![A-Za-z0-9_.(!])|(\$?)([A-Za-z]{1,3}):(\$?)([A-Za-z]{1,3})(?![A-Za-z0-9_.(!:])|(\$?)(\d{1,7}):(\$?)(\d{1,7})(?![A-Za-z0-9_.(!])|[A-Za-z_\\][A-Za-z0-9_.\\]*|\d+\.?\d*(?:[eE][+-]?\d+)?|[\s\S]/g;
const okCol = (c: number) => c >= 1 && c <= MAX_COL;
const okRow = (r: number) => r >= 1 && r <= MAX_ROW;

/** Traduce el texto maestro de una fórmula compartida a una celda dependiente (dRow, dCol): respeta $, literales, nombres de hoja y funciones. */
export function translateFormula(f: string, dRow: number, dCol: number): string {
  if (dRow === 0 && dCol === 0) return f;
  TOKEN.lastIndex = 0;
  let out = '';
  let m: RegExpExecArray | null;
  while ((m = TOKEN.exec(f)) !== null) {
    if (m[2] !== undefined) {
      const col = colToNum(m[2]); const row = Number(m[4]);
      if (!okCol(col) || !okRow(row)) { out += m[0]; continue; }
      const nc = m[1] ? col : col + dCol; const nr = m[3] ? row : row + dRow;
      out += okCol(nc) && okRow(nr) ? m[1] + numToCol(nc) + m[3] + nr : '#REF!';
    } else if (m[6] !== undefined) {
      const a = colToNum(m[6]); const b = colToNum(m[8]);
      if (!okCol(a) || !okCol(b)) { out += m[0]; continue; }
      const na = m[5] ? a : a + dCol; const nb = m[7] ? b : b + dCol;
      out += okCol(na) && okCol(nb) ? m[5] + numToCol(na) + ':' + m[7] + numToCol(nb) : '#REF!';
    } else if (m[10] !== undefined) {
      const a = Number(m[10]); const b = Number(m[12]);
      const na = m[9] ? a : a + dRow; const nb = m[11] ? b : b + dRow;
      out += okRow(na) && okRow(nb) ? m[9] + na + ':' + m[11] + nb : '#REF!';
    } else out += m[0];
  }
  return out;
}

/** Referencias A1 de una fórmula (celdas y rangos). qualified = lleva hoja o libro externo delante ('Hoja'!A1). */
export function extractRefs(f: string): FormulaRef[] {
  const refs: FormulaRef[] = [];
  TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  let prev = '';
  let pendingRange = false;
  while ((m = TOKEN.exec(f)) !== null) {
    const tok = m[0];
    if (m[2] !== undefined) {
      const col = colToNum(m[2]); const row = Number(m[4]);
      if (okCol(col) && okRow(row)) {
        const last = refs[refs.length - 1];
        if (pendingRange && last) { last.c2 = Math.max(last.c1, col); last.r2 = Math.max(last.r1, row); last.c1 = Math.min(last.c1, col); last.r1 = Math.min(last.r1, row); }
        else refs.push({ c1: col, r1: row, c2: col, r2: row, qualified: prev === '!' });
        pendingRange = false; prev = 'ref';
        continue;
      }
    }
    if (tok === ':' && prev === 'ref') { pendingRange = true; continue; }
    pendingRange = false;
    if (tok.trim() !== '') prev = tok;
  }
  return refs;
}

// ---------------- fechas ----------------
const p2 = (n: number) => (n < 10 ? '0' + n : String(n));
export function serialToIso(n: number, date1904: boolean): string {
  let days = Math.floor(n);
  let secs = Math.round((n - days) * 86400);
  if (secs >= 86400) { secs = 0; days += 1; }
  const time = p2(Math.floor(secs / 3600)) + ':' + p2(Math.floor((secs % 3600) / 60)) + ':' + p2(secs % 60);
  if (n >= 0 && n < 1 && days === 0) return time;
  if (!date1904 && n > 0 && n < 60) days += 1; // día inexistente 1900-02-29 de Excel
  const base = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  const iso = new Date(base + days * 86400000).toISOString().slice(0, 10);
  return secs ? iso + 'T' + time : iso;
}
/** Formato numérico de fecha: integrados 14–22 y 45–47, o personalizado con d/m/y fuera de comillas y corchetes. */
export function isDateFormat(id: number, code: string | undefined): boolean {
  if (code === undefined) return (id >= 14 && id <= 22) || (id >= 45 && id <= 47);
  const first = code.split(';')[0].replace(/"[^"]*"|\[[^\]]*\]|\\.|_.|\*./g, '');
  return /[dmy]/i.test(first);
}

function parseStyles(xml: string | undefined): boolean[] {
  if (!xml) return [];
  const custom = new Map<number, string>();
  const nf = xml.indexOf('<numFmts');
  if (nf >= 0) {
    const seg = xml.slice(nf, xml.indexOf('</numFmts>', nf));
    const re = /<numFmt\b([^>]*)>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(seg)) !== null) {
      const id = attr(m[1], 'numFmtId'); const code = attr(m[1], 'formatCode');
      if (id !== null && code !== null) custom.set(Number(id), code);
    }
  }
  const out: boolean[] = [];
  const cx = xml.indexOf('<cellXfs');
  if (cx < 0) return out;
  const seg = xml.slice(cx, xml.indexOf('</cellXfs>', cx));
  const re = /<xf\b([^>]*)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(seg)) !== null) {
    const id = Number(attr(m[1], 'numFmtId') ?? '0');
    out.push(isDateFormat(id, custom.get(id)));
  }
  return out;
}
function parseSharedStrings(xml: string | undefined): string[] {
  const out: string[] = [];
  if (!xml) return out;
  let i = 0;
  for (;;) {
    const a = xml.indexOf('<si', i);
    if (a < 0) break;
    const c = xml.charCodeAt(a + 3);
    if (c !== 62 && c !== 32 && c !== 47) { i = a + 3; continue; }
    const g = xml.indexOf('>', a);
    if (xml.charCodeAt(g - 1) === 47) { out.push(''); i = g + 1; continue; }
    const e = xml.indexOf('</si>', g);
    if (e < 0) break;
    out.push(richText(xml.slice(g + 1, e)));
    i = e + 5;
  }
  return out;
}

function parseSheet(xml: string, name: string, state: Sheet['state'], sst: string[], dateStyle: boolean[], date1904: boolean): Sheet {
  const cells = new Map<string, Cell>();
  const hiddenRows = new Set<number>();
  const hiddenCols = new Set<number>();
  let maxRow = 0;
  let maxCol = 0;
  const sd = xml.indexOf('<sheetData');
  const colsAt = xml.indexOf('<cols');
  if (colsAt >= 0 && (sd < 0 || colsAt < sd)) {
    const seg = xml.slice(colsAt, xml.indexOf('</cols>', colsAt));
    const re = /<col\b([^>]*)>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(seg)) !== null) {
      const h = attr(m[1], 'hidden');
      if (h !== '1' && h !== 'true') continue;
      const lo = Number(attr(m[1], 'min') ?? '0'); const hi = Math.min(Number(attr(m[1], 'max') ?? '0'), lo + 2000);
      for (let c = lo; c <= hi; c++) hiddenCols.add(c);
    }
  }
  const sheet: Sheet = { name, state, cells, maxRow: 0, maxCol: 0, hiddenRows, hiddenCols };
  if (sd < 0) return sheet;
  const end = xml.indexOf('</sheetData>', sd);
  if (end < 0) return sheet;
  const shared = new Map<string, { f: string; col: number; row: number }>();
  let i = sd + 10;
  let curRow = 0;
  let nextCol = 1;
  while (i < end) {
    const lt = xml.indexOf('<', i);
    if (lt < 0 || lt >= end) break;
    const c1 = xml.charCodeAt(lt + 1);
    if (c1 === 99) { // <c
      const c2 = xml.charCodeAt(lt + 2);
      if (c2 !== 32 && c2 !== 62 && c2 !== 47) { i = lt + 2; continue; }
      const gt = xml.indexOf('>', lt);
      const tag = xml.slice(lt + 2, gt);
      let inner = '';
      if (xml.charCodeAt(gt - 1) === 47) i = gt + 1;
      else { const close = xml.indexOf('</c>', gt); inner = xml.slice(gt + 1, close); i = close + 4; }
      const r = attr(tag, 'r');
      let col = nextCol;
      let row = curRow;
      if (r) { const p = splitAddr(r); col = p.col; row = p.row; }
      nextCol = col + 1;
      if (!inner) continue;
      let f: string | null = null;
      const fa = inner.indexOf('<f');
      if (fa >= 0) {
        const fg = inner.indexOf('>', fa);
        const fSelf = inner.charCodeAt(fg - 1) === 47;
        const ftag = inner.slice(fa + 2, fSelf ? fg - 1 : fg);
        let ftext = '';
        if (!fSelf) { const fe = inner.indexOf('</f>', fg); ftext = decodeXml(inner.slice(fg + 1, fe < 0 ? inner.length : fe)); }
        if (attr(ftag, 't') === 'shared') {
          const si = attr(ftag, 'si') ?? '';
          if (ftext) { shared.set(si, { f: ftext, col, row }); f = '=' + ftext; }
          else { const mst = shared.get(si); if (mst) f = '=' + translateFormula(mst.f, row - mst.row, col - mst.col); }
        } else if (ftext) f = '=' + ftext;
      }
      let vText: string | null = null;
      const va = inner.indexOf('<v');
      if (va >= 0) {
        const vg = inner.indexOf('>', va);
        if (inner.charCodeAt(vg - 1) !== 47) { const ve = inner.indexOf('</v>', vg); if (ve >= 0) vText = inner.slice(vg + 1, ve); }
      }
      const t = attr(tag, 't');
      let cell: Cell | null = null;
      if (t === 's') cell = { v: vText !== null ? sst[Number(vText)] ?? '' : '', t: 's', f };
      else if (t === 'inlineStr') { const is = inner.indexOf('<is'); cell = { v: is >= 0 ? richText(inner.slice(is)) : '', t: 's', f }; }
      else if (t === 'str') cell = { v: vText !== null ? decodeXml(vText) : '', t: 's', f };
      else if (t === 'b') cell = { v: vText === '1' || vText === 'true', t: 'b', f };
      else if (t === 'e') cell = { v: vText !== null ? decodeXml(vText) : '#N/A', t: 'e', f };
      else if (t === 'd') cell = { v: vText, t: 'd', f };
      else if (vText !== null && vText !== '') {
        const n = Number(vText);
        const s = attr(tag, 's');
        cell = s !== null && dateStyle[Number(s)] ? { v: serialToIso(n, date1904), t: 'd', f } : { v: n, t: 'n', f };
      } else if (f) cell = { v: null, t: 'n', f };
      if (!cell || (cell.v === '' && !f)) continue;
      cells.set(numToCol(col) + row, cell);
      if (row > maxRow) maxRow = row;
      if (col > maxCol) maxCol = col;
    } else if (c1 === 114 && xml.startsWith('row', lt + 1)) {
      const gt = xml.indexOf('>', lt);
      const tag = xml.slice(lt + 4, gt);
      const r = attr(tag, 'r');
      curRow = r ? parseInt(r, 10) : curRow + 1;
      nextCol = 1;
      const h = attr(tag, 'hidden');
      if (h === '1' || h === 'true') hiddenRows.add(curRow);
      i = gt + 1;
    } else i = lt + 1;
  }
  sheet.maxRow = maxRow;
  sheet.maxCol = maxCol;
  return sheet;
}

const WANTED = /^(xl\/workbook\.xml|xl\/_rels\/workbook\.xml\.rels|xl\/sharedstrings\.xml|xl\/styles\.xml|docprops\/core\.xml|xl\/worksheets\/[^/]+\.xml)$/;

export function readWorkbook(bytes: Uint8Array): Workbook {
  const raw = unzipSync(bytes, { filter: (f) => WANTED.test(f.name.toLowerCase()) });
  const dec = new TextDecoder('utf-8');
  const names = new Map<string, string>();
  for (const k of Object.keys(raw)) names.set(k.toLowerCase(), k);
  const text = (path: string): string | undefined => {
    const k = names.get(path.toLowerCase());
    if (!k) return undefined;
    let s = dec.decode(raw[k]);
    delete raw[k];
    if (s.indexOf('\r') >= 0) s = s.replace(/\r\n?/g, '\n'); // normalización de fin de línea de XML
    return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
  };
  const wbXml = text('xl/workbook.xml');
  if (!wbXml) throw new Error('xlsx: workbook.xml not found');
  const rels = new Map<string, { target: string; type: string }>();
  const relXml = text('xl/_rels/workbook.xml.rels') ?? '';
  const reRel = /<Relationship\b([^>]*)>/g;
  let m: RegExpExecArray | null;
  while ((m = reRel.exec(relXml)) !== null) {
    const id = attr(m[1], 'Id'); const target = attr(m[1], 'Target');
    if (id && target) rels.set(id, { target: target.startsWith('/') ? target.slice(1) : 'xl/' + target, type: attr(m[1], 'Type') ?? '' });
  }
  const date1904 = /<workbookPr\b[^>]*\bdate1904="(1|true)"/.test(wbXml);
  const sst = parseSharedStrings(text('xl/sharedStrings.xml'));
  const dateStyle = parseStyles(text('xl/styles.xml'));
  const sheets: Sheet[] = [];
  const reSheet = /<sheet\b([^>]*)>/g;
  while ((m = reSheet.exec(wbXml)) !== null) {
    const name = attr(m[1], 'name') ?? '';
    const rid = attr(m[1], 'r:id') ?? attr(m[1], 'id') ?? '';
    const st = attr(m[1], 'state');
    const rel = rels.get(rid);
    if (!rel || (rel.type && !/\/worksheet$/.test(rel.type))) continue;
    const xml = text(rel.target);
    if (xml === undefined) continue;
    sheets.push(parseSheet(xml, name, st === 'hidden' ? 'hidden' : st === 'veryHidden' ? 'veryHidden' : 'visible', sst, dateStyle, date1904));
  }
  const core = text('docProps/core.xml') ?? '';
  const pick = (re: RegExp): string | null => { const x = re.exec(core); return x ? decodeXml(x[1]) : null; };
  return {
    sheets, date1904,
    props: {
      creator: pick(/<dc:creator[^>]*>([^<]*)<\/dc:creator>/),
      lastModifiedBy: pick(/<cp:lastModifiedBy[^>]*>([^<]*)<\/cp:lastModifiedBy>/),
      modified: pick(/<dcterms:modified[^>]*>([^<]*)<\/dcterms:modified>/),
    },
  };
}
