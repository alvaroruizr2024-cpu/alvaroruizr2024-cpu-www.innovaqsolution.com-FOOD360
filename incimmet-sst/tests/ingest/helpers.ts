/** Utilidades de prueba: libros XLSX sintéticos (nombres DEMO) armados a mano con fflate. Sin datos reales. */
import { strToU8, zipSync } from 'fflate';
import { numToCol } from '../../src/ingest/xlsx/read';

export type Val = number | string | boolean | null | { f?: string; v?: number | string | boolean; e?: string; d?: string; style?: number; inline?: string; rich?: string[]; shared?: { si: number; ref?: string } };
export interface SheetSpec { name: string; state?: 'hidden' | 'veryHidden'; cells: Record<string, Val>; hiddenRows?: number[]; hiddenCols?: number[] }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const serial = (iso: string): number => (Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10) || '1')) - Date.UTC(1899, 11, 30)) / 86400000;
const split = (a: string) => { const m = /^([A-Z]+)(\d+)$/.exec(a)!; let c = 0; for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64; return { c, r: Number(m[2]) }; };
/** Estilos: 0 General · 1 fecha integrada (14) · 2 personalizado 'yyyy\-mm' · 3 personalizado '0.0 "min"' (no es fecha). */
const STYLES = '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="yyyy\\-mm"/><numFmt numFmtId="165" formatCode="0.0 &quot;min&quot;"/></numFmts>'
  + '<cellStyleXfs count="1"><xf numFmtId="14"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/><xf numFmtId="165"/></cellXfs></styleSheet>';

export function buildXlsx(sheets: SheetSpec[], opts: { date1904?: boolean; creator?: string } = {}): Uint8Array {
  const sst: string[] = [];
  const sstXml: string[] = [];
  const str = (s: string): number => { let i = sst.indexOf(s); if (i < 0) { i = sst.length; sst.push(s); sstXml.push(`<si><t xml:space="preserve">${esc(s)}</t></si>`); } return i; };
  const files: Record<string, Uint8Array> = {};
  const H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';
  sheets.forEach((sh, si) => {
    const rows = new Map<number, Array<[number, string]>>();
    for (const [a, raw] of Object.entries(sh.cells)) {
      if (raw === null) continue;
      const { c, r } = split(a);
      const o = typeof raw === 'object' ? raw : { v: raw };
      let attrs = `r="${a}"`;
      let inner = '';
      if (o.shared) inner += o.f ? `<f t="shared" ref="${o.shared.ref}" si="${o.shared.si}">${esc(o.f)}</f>` : `<f t="shared" si="${o.shared.si}"/>`;
      else if (o.f) inner += `<f>${esc(o.f)}</f>`;
      if (o.style) attrs += ` s="${o.style}"`;
      if (o.e) { attrs += ' t="e"'; inner += `<v>${esc(o.e)}</v>`; }
      else if (o.d) { if (!o.style) attrs += ' s="1"'; inner += `<v>${serial(o.d)}</v>`; }
      else if (o.inline !== undefined) { attrs += ' t="inlineStr"'; inner += `<is><t>${esc(o.inline)}</t></is>`; }
      else if (o.rich) { sstXml.push('<si>' + o.rich.map((t) => `<r><rPr><b/></rPr><t xml:space="preserve">${esc(t)}</t></r>`).join('') + '<rPh sb="0" eb="1"><t>IGNORAR</t></rPh></si>'); sst.push('\u0000rich' + sst.length); attrs += ' t="s"'; inner += `<v>${sst.length - 1}</v>`; }
      else if (typeof o.v === 'string') { if (o.f) { attrs += ' t="str"'; inner += `<v>${esc(o.v)}</v>`; } else { attrs += ' t="s"'; inner += `<v>${str(o.v)}</v>`; } }
      else if (typeof o.v === 'boolean') { attrs += ' t="b"'; inner += `<v>${o.v ? 1 : 0}</v>`; }
      else if (typeof o.v === 'number') inner += `<v>${o.v}</v>`;
      const l = rows.get(r) ?? [];
      l.push([c, inner ? `<c ${attrs}>${inner}</c>` : `<c ${attrs}/>`]);
      rows.set(r, l);
    }
    for (const r of sh.hiddenRows ?? []) if (!rows.has(r)) rows.set(r, []);
    const body = [...rows.keys()].sort((a, b) => a - b).map((r) => `<row r="${r}"${(sh.hiddenRows ?? []).includes(r) ? ' hidden="1"' : ''}>${rows.get(r)!.sort((a, b) => a[0] - b[0]).map((x) => x[1]).join('')}</row>`).join('');
    const cols = (sh.hiddenCols ?? []).length ? '<cols>' + sh.hiddenCols!.map((c) => `<col min="${c}" max="${c}" width="9" hidden="1"/>`).join('') + '</cols>' : '';
    files[`xl/worksheets/sheet${si + 1}.xml`] = strToU8(`${H}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1"/>${cols}<sheetData>${body}</sheetData><legacyDrawing r:id="rId9"/></worksheet>`);
  });
  files['xl/workbook.xml'] = strToU8(`${H}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><workbookPr${opts.date1904 ? ' date1904="1"' : ''}/><sheets>`
    + sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}"${s.state ? ` state="${s.state}"` : ''} r:id="rId${i + 1}"/>`).join('') + '</sheets></workbook>');
  files['xl/_rels/workbook.xml.rels'] = strToU8(`${H}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
    + sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') + '</Relationships>');
  files['xl/sharedStrings.xml'] = strToU8(`${H}<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${sstXml.join('')}</sst>`);
  files['xl/styles.xml'] = strToU8(H + STYLES);
  files['docProps/core.xml'] = strToU8(`${H}<cp:coreProperties xmlns:cp="x" xmlns:dc="y" xmlns:dcterms="z"><dc:creator>${esc(opts.creator ?? 'DEMO Autor')}</dc:creator><cp:lastModifiedBy>DEMO Editor</cp:lastModifiedBy><dcterms:modified xsi:type="dcterms:W3CDTF">2031-07-01T10:00:00Z</dcterms:modified></cp:coreProperties>`);
  // Partes que el lector NO debe abrir (privacidad): si las leyera, este texto aparecería en algún valor.
  files['xl/comments1.xml'] = strToU8('<comments><comment ref="A1"><text><t>DEMO COMENTARIO PRIVADO</t></text></comment></comments>');
  files['xl/worksheets/_rels/sheet1.xml.rels'] = strToU8('<Relationships/>');
  return zipSync(files);
}

// ---------- hojas de bloques sintéticas (formato nuevo y anterior) ----------
export type RowSpec = [key: string, label: string, tag?: string | number];
export interface SectionSpec { header: string; tag?: string; dates: boolean; rows: RowSpec[] }
export const NEW_FORMAT: SectionSpec[] = [
  { header: 'CLASIFICACION POR:', tag: 'PG', dates: true, rows: [['pg56', 'PG', '5, 6'], ['pg4', 'PG', 4], ['pg3', 'PG', 3], ['pg2', 'PG', 2], ['pg1', 'PG', 1]] },
  { header: 'CLASIFICACION POR:', tag: 'NV', dates: true, rows: [['accFatal', 'Accidentes Mortales', '5, 6'], ['accLti', 'Accidentes Incapacitantes ', 4], ['accNv3', 'Accidentes leves ', 3], ['accNv2', 'Accidentes leves ', 2], ['accNv1', 'Accidentes leves', 1],
    ['accPerson', 'Accidentes a la Persona'], ['accProperty', 'Accidentes a la propiedad'], ['incPerson', 'Incidentes a la Persona'], ['incProperty', 'Incidentes a la Propiedad'], ['hpriLoss', 'HPRI Con Pérdida(Nv5@Nv6)'], ['hpriNoLoss', 'HPRI Sin Pérdida(Nv5@Nv6)']] },
  { header: 'INDICADOR MENSUAL', dates: true, rows: [['trifr', 'TACSA ACUM 12 M'], ['if', 'Indice de Frecuencia'], ['is', 'Indice de Severidad'], ['ia', 'Indice de Accidentabilidad'], ['hh', 'Horas Hombre Trabajadas'], ['lostDays', 'Días perdidos por Accidentes'], ['workers', 'N° de trabajadores'], ['ssoma', 'Desempeño en SSOMA']] },
  { header: 'INDICADOR ANUAL', dates: true, rows: [['trifrY', 'TRIFR ACUM AÑO'], ['hhY', 'Horas Hombre Trabajadas Anual']] },
  { header: 'INDICADOR 12 MESES (MEDIA MOVIL)', dates: true, rows: [['trifrR', 'TRIFR ACUM 12 M'], ['hhR', 'Horas Hombre Trabajadas 12 M']] },
  { header: 'TARGET CORPORATIVO', dates: false, rows: [['tTrifr', 'Límite Máximo TRIFR'], ['tIf', 'Target IF']] },
  { header: 'TARGET PROYECTO', dates: false, rows: [['pTrifr', 'Límite Máximo TRIFR']] },
];
export const OLD_FORMAT: SectionSpec[] = [
  { header: 'POTENCIAL DE GRAVEDAD', dates: true, rows: [['pg56', 'Nv. 5,6'], ['pg4', 'Nv. 04'], ['pg3', 'Nv. 03'], ['pg2', 'Nv. 02'], ['pg1', 'Nv. 01']] },
  { header: 'Accidentes', dates: true, rows: [['accFatal', 'Accidentes Mortales (Nv. 5,6)'], ['accLti', 'Accidentes Incapacitantes ( Nv. 4)'], ['accNv3', 'Accidentes leves (Nv. 3)'], ['accNv2', 'Accidentes leves (Nv. 2)'], ['accNv1', 'Accidentes leves (Nv. 1)'], ['accProperty', 'Accidentes a la propiedad'], ['incInvestigated', 'Incidentes Investigados']] },
  { header: 'Indice mensual ', dates: true, rows: [['tacsa', 'TACSA'], ['if', 'Indice de Frecuencia'], ['is', 'Indice de Severidad'], ['ia', 'Indice de Accidentabilidad'], ['hh', 'Horas Hombre Trabajadas'], ['lostDays', 'Días perdidos por Accidentes'], ['workers', 'N° de trabajadores']] },
  { header: 'acumulado', dates: true, rows: [['tacsaR', 'TACSA ACUM'], ['hhR', 'Horas Hombre Trabajadas acum']] },
];
/** Desplazamiento de cada fila (por clave) respecto a la fila del título; height = filas que ocupa el bloque. */
export function layout(sections: SectionSpec[]): { off: Record<string, number>; height: number } {
  const off: Record<string, number> = {};
  let r = 1;
  for (const s of sections) { off['#' + s.header + (s.tag ?? '')] = r++; for (const row of s.rows) off[row[0]] = r++; r++; }
  return { off, height: r + 1 };
}
export interface BlockData { title: string | null; start: number; months: string[]; values: Record<string, Val[]>; headerOverride?: Record<number, Val> }
/** Escribe un bloque en `cells`. labelCol: 1 = A (formato anterior sin columna de nivel) o 2 = B (con niveles en C). Datos desde firstCol. */
export function putBlock(cells: Record<string, Val>, sections: SectionSpec[], labelCol: number, firstCol: number, b: BlockData): Record<string, number> {
  const { off } = layout(sections);
  const L = numToCol(labelCol);
  const T = numToCol(labelCol + 1);
  if (b.title !== null) cells[L + b.start] = b.title;
  const rowOf: Record<string, number> = {};
  for (const s of sections) {
    const hr = b.start + off['#' + s.header + (s.tag ?? '')];
    cells[L + hr] = s.header;
    if (s.tag) cells[T + hr] = s.tag;
    if (s.dates) b.months.forEach((m, i) => { const o = b.headerOverride?.[i]; cells[numToCol(firstCol + i) + hr] = o !== undefined ? o : { d: m + '-01' }; });
    for (const [key, label, tag] of s.rows) {
      const r = b.start + off[key];
      rowOf[key] = r;
      cells[L + r] = label;
      if (tag !== undefined) cells[T + r] = tag;
      (b.values[key] ?? []).forEach((v, i) => { if (v !== null && v !== undefined) cells[numToCol(firstCol + i) + r] = v; });
    }
  }
  return rowOf;
}
export const col = (firstCol: number, i: number): string => numToCol(firstCol + i);
export const monthsFrom = (start: string, n: number): string[] => Array.from({ length: n }, (_, i) => { const t = Number(start.slice(0, 4)) * 12 + Number(start.slice(5, 7)) - 1 + i; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`; });
