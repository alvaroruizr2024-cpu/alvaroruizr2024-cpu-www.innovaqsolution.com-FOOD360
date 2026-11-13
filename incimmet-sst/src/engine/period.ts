import type { ISODate, Month } from '../domain/types';
import type { CompareMode, Filters } from '../domain/model';

export interface Range { from: Month; to: Month }
export const mi = (m: Month): number => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)) - 1;
export const im = (i: number): Month => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
export const addMonths = (m: Month, n: number): Month => im(mi(m) + n);
export function monthsBetween(from: Month, to: Month): Month[] {
  const out: Month[] = [];
  for (let i = mi(from); i <= mi(to); i++) out.push(im(i));
  return out;
}
export const monthOf = (d: ISODate): Month => d.slice(0, 7);
export const dayNum = (d: ISODate): number => Math.floor(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10))) / 86400000);
export function monthEnd(m: Month): ISODate {
  const d = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0));
  return `${m}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
export const monthStart = (m: Month): ISODate => `${m}-01`;
export const rangeLen = (r: Range): number => mi(r.to) - mi(r.from) + 1;
export const inRange = (m: Month, r: Range): boolean => m >= r.from && m <= r.to;
export const dateIn = (d: ISODate | null | undefined, r: Range): boolean => !!d && d >= monthStart(r.from) && d <= monthEnd(r.to);

/** Período seleccionado: mes | acumulado del año (ene..mes) | 12 meses móviles (mes−11..mes) | personalizado. */
export function resolveRange(f: Filters): Range {
  if (f.periodMode === 'month') return { from: f.month, to: f.month };
  if (f.periodMode === 'ytd') return { from: `${f.month.slice(0, 4)}-01`, to: f.month };
  if (f.periodMode === 'r12') return { from: addMonths(f.month, -11), to: f.month };
  return f.from <= f.to ? { from: f.from, to: f.to } : { from: f.to, to: f.from };
}
/** yoy: mismo rango −12 meses · prev: rango anterior de igual longitud · r12: 12 meses móviles que terminan en `to`. */
export function compareRange(mode: CompareMode, r: Range): Range | null {
  if (mode === 'yoy') return { from: addMonths(r.from, -12), to: addMonths(r.to, -12) };
  if (mode === 'prev') { const n = rangeLen(r); return { from: addMonths(r.from, -n), to: addMonths(r.to, -n) }; }
  if (mode === 'r12') return { from: addMonths(r.to, -11), to: r.to };
  return null;
}
export const r12 = (to: Month): Range => ({ from: addMonths(to, -11), to });
export const lastN = (to: Month, n: number): Range => ({ from: addMonths(to, -(n - 1)), to });
