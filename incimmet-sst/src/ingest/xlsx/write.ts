/** Escritor XLSX mínimo (cadenas en línea, sin estilos de usuario). Apto para navegador. */
import { strToU8, zipSync } from 'fflate';
import { numToCol } from './read';

export type SheetInput = { name: string; rows: Array<Array<string | number | null>> };

const esc = (s: string): string =>
  s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Nombre de hoja válido: sin []:*?/\ ni apóstrofos en los extremos, 31 caracteres como máximo y único en el libro. */
export function sanitizeSheetName(name: string, used: Set<string>): string {
  let base = String(name ?? '').replace(/[\[\]:*?/\\\u0000-\u001F]/g, ' ').replace(/^'+|'+$/g, '').trim().slice(0, 31).trim();
  if (!base) base = 'Hoja';
  let out = base;
  let n = 2;
  while (used.has(out.toLowerCase())) { const suf = ' (' + n++ + ')'; out = base.slice(0, 31 - suf.length).trim() + suf; }
  used.add(out.toLowerCase());
  return out;
}

function sheetXml(rows: SheetInput['rows']): string {
  const parts: string[] = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    let cells = '';
    for (let c = 0; c < row.length; c++) {
      const v = row[c];
      if (v === null || v === undefined || v === '') continue;
      const ref = numToCol(c + 1) + (r + 1);
      if (typeof v === 'number') {
        if (Number.isFinite(v)) cells += `<c r="${ref}"><v>${v}</v></c>`;
      } else cells += `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(String(v))}</t></is></c>`;
    }
    if (cells) parts.push(`<row r="${r + 1}">${cells}</row>`);
  }
  parts.push('</sheetData></worksheet>');
  return parts.join('');
}

export function writeWorkbook(sheets: SheetInput[]): Uint8Array {
  const list = sheets.length ? sheets : [{ name: 'Hoja1', rows: [] }];
  const used = new Set<string>();
  const names = list.map((s) => sanitizeSheetName(s.name, used));
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const NS = 'http://schemas.openxmlformats.org';
  const files: Record<string, Uint8Array> = {};
  files['[Content_Types].xml'] = strToU8(
    `${head}<Types xmlns="${NS}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    names.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') + '</Types>');
  files['_rels/.rels'] = strToU8(
    `${head}<Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  files['xl/workbook.xml'] = strToU8(
    `${head}<workbook xmlns="${NS}/spreadsheetml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships"><sheets>` +
    names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets></workbook>');
  files['xl/_rels/workbook.xml.rels'] = strToU8(
    `${head}<Relationships xmlns="${NS}/package/2006/relationships">` +
    names.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${NS}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
    `<Relationship Id="rId${names.length + 1}" Type="${NS}/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  files['xl/styles.xml'] = strToU8(
    `${head}<styleSheet xmlns="${NS}/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>` +
    '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>');
  list.forEach((s, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(s.rows)); });
  return zipSync(files, { level: 6 });
}
