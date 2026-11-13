/** Perfil «corporativo»: solo la hoja MediaMovilNN más reciente; Perú = consolidado de formato nuevo + sus bloques de proyecto. */
import type { ReconItem, SourceFile } from '../../domain/types';
import type { IngestPreviewBlock } from '../../domain/model';
import { addr, type Workbook } from '../xlsx/read';
import { parseBlocks, type Block } from './blocks';
import { extractBlockSource } from './blockSource';
import { CORPORATE_SHEET } from './detect';
import { mkItem, type ParsedSource } from './shared';

export type SourceMeta = Pick<SourceFile, 'name' | 'sha256' | 'sizeBytes' | 'loadedAt' | 'modifiedAt'>;

export function parseCorporate(wb: Workbook, meta: SourceMeta): ParsedSource {
  const file = meta.name;
  const cands = wb.sheets.filter((s) => CORPORATE_SHEET.test(s.name)).sort((a, b) => Number(CORPORATE_SHEET.exec(b.name)![1]) - Number(CORPORATE_SHEET.exec(a.name)![1]));
  const sheet = cands[0];
  const bs = parseBlocks(sheet);
  const lastOf = (b: Block): string => b.months[b.months.length - 1] ?? '';
  const heads = bs.blocks.filter((b) => b.consolidated);
  const consolidated = heads.filter((b) => b.format === 'new').sort((a, b) => (lastOf(a) < lastOf(b) ? 1 : -1))[0] ?? null;
  // Secciones: cada consolidado encabeza los bloques que le siguen hasta el siguiente consolidado.
  const projectBlocks: Block[] = [];
  const others = new Map<Block, Block[]>();
  let head: Block | null = null;
  for (const b of bs.blocks) {
    if (b.consolidated) { head = b; if (b !== consolidated) others.set(b, []); continue; }
    const mine = consolidated ? head === consolidated || consolidated.refBlocks.has(b.index) : b.format === 'new';
    if (mine) projectBlocks.push(b); else if (head && others.has(head)) others.get(head)!.push(b); else others.set(b, []);
  }
  const res = extractBlockSource({ file, bs, country: 'PE', sourceKey: 'corporate', consolidated, projectBlocks, isHistorical: (b) => b.format === 'old' || b.number === null });
  const items: ReconItem[] = [...res.items];
  const previews: IngestPreviewBlock[] = [...res.previews];
  const unused = wb.sheets.filter((s) => s !== sheet);
  if (unused.length) {
    items.push(mkItem('sheets_not_imported', { country: 'PE', kpis: ['Q03'], params: { n: unused.length, sheets: unused.map((s) => s.name).join(' · '), used: sheet.name }, refs: unused.map((s) => ({ file, sheet: s.name, cell: 'A1', formula: null })) }));
  }
  for (const [h, members] of others) {
    const all = [h, ...members];
    const lastMonth = all.map(lastOf).sort().pop() ?? '';
    items.push(mkItem('section_not_imported', {
      country: 'PE', kpis: ['Q03'], params: { title: h.title || '—', blocks: all.length, rows: `${h.firstRow}–${all[all.length - 1].lastRow}`, last: lastMonth, hidden: h.hidden ? 1 : 0 },
      refs: all.map((b) => ({ file, sheet: sheet.name, cell: addr(bs.labelCol, b.titleRow ?? b.headerRow), formula: null })),
    }));
    for (const b of all) previews.push({ file, sheet: sheet.name, title: b.title, country: null, kind: b === h && members.length === 0 ? 'historical' : 'ignored', firstMonth: b.months[0] ?? null, lastMonth: lastOf(b) || null, measures: b.rows.filter((r) => r.kind === 'measure').length, note: { key: 'rec.note.section_not_imported' } });
  }
  const source: SourceFile = {
    key: 'corporate', profile: 'corporate', country: 'PE', ...meta, lastDataMonth: res.lastDataMonth,
    sheets: wb.sheets.map((s) => ({ name: s.name, state: s.state === 'visible' ? 'visible' : 'hidden', used: s === sheet, ...(s === sheet ? {} : { noteKey: 'rec.note.sheet_overlap' }) })),
    warnings: consolidated ? [] : [{ key: 'rec.warn.no_consolidated' }],
  };
  return {
    source, country: 'PE', projects: res.projects, monthly: res.monthly, reported: res.reported, targets: res.targets, blocks: previews, items, consol: res.consol,
    stats: { cellsRead: wb.sheets.reduce((s, x) => s + x.cells.size, 0), duplicatesFlagged: res.duplicatesFlagged, errorCells: [...sheet.cells.values()].filter((c) => c.t === 'e').length },
  };
}
