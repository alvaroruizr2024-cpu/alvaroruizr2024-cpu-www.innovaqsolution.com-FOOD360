/**
 * npm run ingest [-- ruta1.xlsx ruta2.xlsx]
 * Lee los libros de private/sources (o las rutas indicadas), genera el conjunto real y el registro de conciliación en private/out.
 * Todo queda en private/ (ignorado por git): el repositorio es público y no debe contener cifras reales.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ingestApi, toStatRows } from '../src/ingest/index';
import '../src/i18n/rec';
import { translate } from '../src/i18n/core';
import type { ReconItem } from '../src/domain/types';

const root = process.cwd();
const outDir = path.join(root, 'private', 'out');
function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : /\.xlsx$/i.test(e.name) && !e.name.startsWith('~$') ? [path.join(dir, e.name)] : []));
}
const t = (key: string, params?: Record<string, string | number>): string => translate('es', key, params);
const num = (v: number | null): string => (v === null ? '' : String(Math.round(v * 1e6) / 1e6));
const csv = (rows: Array<Array<string | number | null>>): string =>
  '﻿' + rows.map((r) => r.map((v) => { const s = v === null ? '' : String(v); return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\r\n') + '\r\n';
const months = (it: ReconItem): string => (!it.months ? '' : it.months.length > 2 ? `${it.months[0]}…${it.months[it.months.length - 1]} (${it.months.length})` : it.months.join(', '));

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const paths = args.length ? args.map((a) => path.resolve(a)) : walk(path.join(root, 'private', 'sources'));
  if (!paths.length) { console.error('No hay archivos .xlsx en private/sources. Uso: npm run ingest -- <ruta.xlsx> …'); process.exit(1); }
  const inputs = paths.map((p) => ({ name: path.basename(p), bytes: new Uint8Array(fs.readFileSync(p)), lastModified: fs.statSync(p).mtimeMs }));
  const res = await ingestApi.ingestFiles(inputs);
  for (const e of res.errors) console.error('ERROR', t(e.key, e.params));
  if (!res.dataset) { console.error('No se reconoció ningún libro.'); process.exit(1); }
  const ds = res.dataset;
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'dataset.real.json'), JSON.stringify(ds));
  fs.writeFileSync(path.join(outDir, 'reconciliacion.json'), JSON.stringify(ds.reconciliation, null, 1));
  const head = ['id', 'severidad', 'país', 'proyecto', 'meses', 'KPI afectados', 'diferencia', 'fuente elegida', 'motivo', 'regla aplicada', 'valor reportado', 'valor recalculado', 'delta', 'celdas'];
  const body = ds.reconciliation.map((it) => [
    it.id, t('rec.severity.' + it.severity), it.country ?? '', it.projectName ?? '', months(it), it.kpisAffected.join(' '), t(it.issueKey, it.params),
    t(it.sourceChosenKey), t(it.reasonKey), t(it.ruleKey), num(it.reportedValue), num(it.recalculatedValue), num(it.delta),
    it.refs.slice(0, 6).map((r) => `${r.sheet}!${r.cell}`).join(' ') + (it.refs.length > 6 ? ' …' : ''),
  ]);
  fs.writeFileSync(path.join(outDir, 'reconciliacion.csv'), csv([head, ...body]));
  const md = ['# Registro de conciliación (PRIVADO: contiene cifras reales)', '', `Corte: ${ds.cutoffMonth} · generado: ${ds.createdAt} · registros: ${ds.reconciliation.length}`, '',
    '| ' + head.join(' | ') + ' |', '|' + head.map(() => '---').join('|') + '|',
    ...body.map((r) => '| ' + r.map((v) => String(v).replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ') + ' |'), ''];
  fs.writeFileSync(path.join(outDir, 'reconciliacion.md'), md.join('\n'));
  const stat = toStatRows(ds);
  const sh = ['país', 'proyecto', 'mes', 'población', 'indicador', 'valor original', 'valor numérico', 'unidad', 'tipo de período', 'archivo', 'hoja', 'celda', 'fórmula de origen', 'calidad', 'versión', 'tipo de valor'];
  fs.writeFileSync(path.join(outDir, 'estadisticas_mensuales.csv'), csv([sh, ...stat.map((r) => [r.country, r.project, r.month, r.population, r.indicator, r.rawValue, r.value, r.unit, r.periodType, r.file, r.sheet, r.cell, r.formula, r.quality, r.version, r.valueKind])]));
  const sev = (s: string): number => ds.reconciliation.filter((x) => x.severity === s).length;
  console.log(`Fuentes: ${ds.sources.map((s) => `${s.profile}→${s.lastDataMonth}`).join(', ')} · corte ${ds.cutoffMonth}`);
  console.log(`Proyectos ${ds.projects.length} · hechos ${ds.monthly.length} · reportadas ${ds.reported.length} · metas ${ds.targets.length} · filas tabla larga ${stat.length}`);
  console.log(`Conciliación ${ds.reconciliation.length} (material ${sev('material')}, menor ${sev('minor')}, informativa ${sev('info')}) · duplicados de plantilla ${res.stats.duplicatesFlagged} · celdas con error ${res.stats.errorCells} · ${res.stats.cellsRead} celdas en ${res.stats.ms} ms`);
  console.log(`Salida: ${path.relative(root, outDir)}/ (dataset.real.json ${(fs.statSync(path.join(outDir, 'dataset.real.json')).size / 1e6).toFixed(1)} MB)`);
}
main().catch((e) => { console.error(e); process.exit(1); });
