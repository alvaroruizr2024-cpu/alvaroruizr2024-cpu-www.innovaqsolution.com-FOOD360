/** Perfil «colombia»: hoja con el bloque general en A3 (consolidado, solo para conciliar) y un bloque por proyecto (formato anterior). */
import type { SourceFile } from '../../domain/types';
import type { Workbook } from '../xlsx/read';
import { labelKey, parseBlocks } from './blocks';
import { extractBlockSource } from './blockSource';
import type { SourceMeta } from './corporate';
import type { ParsedSource } from './shared';

export function parseColombia(wb: Workbook, meta: SourceMeta): ParsedSource {
  const file = meta.name;
  const sheet = wb.sheets.find((s) => { const c = s.cells.get('A3'); return !!c && typeof c.v === 'string' && labelKey(c.v) === 'COLOMBIAGENERAL'; }) ?? wb.sheets[0];
  const bs = parseBlocks(sheet);
  const consolidated = bs.blocks.find((b) => labelKey(b.title) === 'COLOMBIAGENERAL') ?? bs.blocks.find((b) => b.consolidated) ?? null;
  const projectBlocks = bs.blocks.filter((b) => b !== consolidated && !b.consolidated);
  const res = extractBlockSource({ file, bs, country: 'CO', sourceKey: 'colombia', consolidated, projectBlocks, isHistorical: () => false });
  const source: SourceFile = {
    key: 'colombia', profile: 'colombia', country: 'CO', ...meta, lastDataMonth: res.lastDataMonth,
    sheets: wb.sheets.map((s) => ({ name: s.name, state: s.state === 'visible' ? 'visible' : 'hidden', used: s === sheet, ...(s === sheet ? {} : { noteKey: 'rec.note.sheet_unused' }) })),
    warnings: consolidated ? [] : [{ key: 'rec.warn.no_consolidated' }],
  };
  return {
    source, country: 'CO', projects: res.projects, monthly: res.monthly, reported: res.reported, targets: res.targets, blocks: res.previews, items: res.items, consol: res.consol,
    stats: { cellsRead: wb.sheets.reduce((s, x) => s + x.cells.size, 0), duplicatesFlagged: res.duplicatesFlagged, errorCells: [...sheet.cells.values()].filter((c) => c.t === 'e').length },
  };
}
