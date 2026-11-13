/** Exportaciones locales: PNG y PDF de la lámina (html-to-image + jsPDF, carga diferida) y datos permitidos en CSV (UTF-8 con BOM) y XLSX (IngestApi.writeWorkbook). */
import type { Lang } from '../domain/types';
import type { ExportTable, IngestApi } from '../domain/model';

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
export function fileBase(isDemo: boolean, lang: Lang): string {
  return `incimmet-sst_${isDemo ? 'DEMO_' : ''}${lang}_${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}`;
}
async function capture(node: HTMLElement): Promise<string> {
  const { toPng } = await import('html-to-image');
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#07182B';
  return toPng(node, { pixelRatio: 2, backgroundColor: bg, width: node.offsetWidth, height: node.offsetHeight });
}
export async function exportPng(node: HTMLElement, name: string): Promise<void> {
  const url = await capture(node);
  download(await (await fetch(url)).blob(), `${name}.png`);
}
/** PDF apaisado con una línea de pie: filtros, idioma, corte, unidades, versión de metodología y marca DEMO. */
export async function exportPdf(node: HTMLElement, name: string, footer: string): Promise<void> {
  const url = await capture(node);
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight(), m = 6, fh = 9, r = node.offsetWidth / Math.max(1, node.offsetHeight);
  let w = W - 2 * m, h = w / r;
  if (h > H - 2 * m - fh) { h = H - 2 * m - fh; w = h * r; }
  pdf.addImage(url, 'PNG', (W - w) / 2, m, w, h, undefined, 'MEDIUM');
  pdf.setFontSize(7); pdf.setTextColor(70);
  pdf.text(pdf.splitTextToSize(footer.replace(/[^ -ÿ–·]/g, ''), W - 2 * m) as string[], m, m + h + 4);
  pdf.save(`${name}.pdf`);
}
export function tablesToCsv(tables: ExportTable[], lang: Lang): string {
  const sep = lang === 'en' ? ',' : ';';
  const cell = (v: string | number | null): string => {
    if (v == null) return '';
    const s = typeof v === 'number' ? (lang === 'en' ? String(v) : String(v).replace('.', ',')) : v;
    return /["\n\r;,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const out: string[] = [];
  tables.forEach((tb, i) => {
    if (i) out.push('');
    out.push(cell(tb.title));
    tb.meta.forEach(([k, v]) => out.push([cell(k), cell(v)].join(sep)));
    out.push(tb.columns.map(cell).join(sep));
    tb.rows.forEach((r) => out.push(r.map(cell).join(sep)));
  });
  return out.join('\r\n');
}
export function exportCsv(tables: ExportTable[], name: string, lang: Lang): void {
  download(new Blob(['﻿', tablesToCsv(tables, lang)], { type: 'text/csv;charset=utf-8' }), `${name}.csv`);
}
export function exportXlsx(tables: ExportTable[], name: string, api: IngestApi, metaTitle: string): void {
  const used = new Set<string>();
  const sheetName = (s: string) => { let n = s.replace(/[\\/?*[\]:]/g, ' ').slice(0, 28) || 'Hoja', i = 2; const base = n; while (used.has(n)) n = `${base} ${i++}`; used.add(n); return n; };
  const sheets = tables.map((tb) => ({ name: sheetName(tb.title), rows: [tb.columns as Array<string | number | null>, ...tb.rows] }));
  if (tables[0]) sheets.push({ name: sheetName(metaTitle), rows: tables[0].meta.map(([k, v]) => [k, v]) });
  const bytes = api.writeWorkbook(sheets);
  download(new Blob([bytes as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${name}.xlsx`);
}
