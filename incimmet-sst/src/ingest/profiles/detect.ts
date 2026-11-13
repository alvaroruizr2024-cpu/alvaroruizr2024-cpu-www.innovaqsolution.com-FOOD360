import type { Workbook } from '../xlsx/read';
import { labelKey } from './blocks';

export type Profile = 'corporate' | 'colombia' | 'incired' | 'unknown';
export const CORPORATE_SHEET = /^MediaMovil(\d{2})$/;

/** Perfil de importación según la estructura del libro (nunca por el nombre del archivo). */
export function detectProfile(wb: Workbook): Profile {
  if (wb.sheets.some((s) => CORPORATE_SHEET.test(s.name))) return 'corporate';
  if (wb.sheets.some((s) => { const c = s.cells.get('A3'); return !!c && typeof c.v === 'string' && labelKey(c.v) === 'COLOMBIAGENERAL'; })) return 'colombia';
  const e = wb.sheets.find((s) => s.name === 'Estatistica');
  if (e) for (const c of e.cells.values()) if (typeof c.v === 'string' && labelKey(c.v) === 'HOMEMHORASTRABALHADAS') return 'incired';
  return 'unknown';
}
