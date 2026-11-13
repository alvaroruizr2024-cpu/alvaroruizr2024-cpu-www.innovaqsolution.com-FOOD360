import type { Lang } from '../domain/types';

export type Dict = Record<string, string>;
export type Bundle = Record<Lang, Dict>;
const store: Bundle = { es: {}, en: {}, pt: {} };

/** Cada frente registra su espacio de nombres: ui.* (interfaz), eng.* (motor), kpi.* (catálogo), rec.* (conciliación), map.* (mapa). */
export function registerDict(bundle: Bundle): void {
  (['es', 'en', 'pt'] as Lang[]).forEach((l) => Object.assign(store[l], bundle[l]));
}
export function hasKey(lang: Lang, key: string): boolean { return Object.prototype.hasOwnProperty.call(store[lang], key); }
export function allKeys(lang: Lang): string[] { return Object.keys(store[lang]); }
export function translate(lang: Lang, key: string, params?: Record<string, string | number>): string {
  let s = store[lang][key] ?? store.es[key] ?? key;
  if (params) s = s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? fmtParam(lang, k, params[k]) : m));
  return s;
}
/** Los números de los textos generados se muestran con el formato regional (1.234,5 · 12,34); años, filas e identificadores, tal cual. */
const RAW_PARAM = /^(year|row|col|id|code|version|seed)$/i;
function fmtParam(lang: Lang, key: string, v: string | number): string {
  if (typeof v !== 'number' || !Number.isFinite(v) || RAW_PARAM.test(key)) return String(v);
  return new Intl.NumberFormat(LOCALES[lang], { maximumFractionDigits: 2 }).format(v);
}
export type TFn = (key: string, params?: Record<string, string | number>) => string;
export const makeT = (lang: Lang): TFn => (key, params) => translate(lang, key, params);

/** ES usa 1.234,56 (igual que el documento de encargo); EN 1,234.56; PT-BR 1.234,56. Cambiar idioma no cambia cifras ni unidades. */
export const LOCALES: Record<Lang, string> = { es: 'es-CO', en: 'en-US', pt: 'pt-BR' };

export interface Formatters {
  num(v: number | null | undefined, decimals?: number): string;      // '—' si null/NaN
  int(v: number | null | undefined): string;
  compact(v: number | null | undefined, decimals?: number): string;  // 2,86 M · 331,6 mil
  pct(v: number | null | undefined, decimals?: number): string;      // incluye %
  signed(v: number | null | undefined, decimals?: number): string;   // +1,2 / −0,4
  month(m: string, style?: 'short' | 'long'): string;                // oct 2026
  monthRange(from: string, to: string): string;
  date(iso: string | null | undefined): string;
  dateTime(iso: string | null | undefined): string;
  unit(u: string): string;                                           // etiqueta i18n de la unidad (unit.<clave>)
}

const DASH = '—';
function nf(locale: string, decimals: number, extra?: Record<string, unknown>): Intl.NumberFormat {
  const o: Record<string, unknown> = { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: 'always', ...extra };
  return new Intl.NumberFormat(locale, o as Intl.NumberFormatOptions);
}
export function makeFormatters(lang: Lang): Formatters {
  const loc = LOCALES[lang];
  const ok = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v);
  const monthDate = (m: string) => new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1));
  const f: Formatters = {
    num: (v, d = 2) => (ok(v) ? nf(loc, d).format(v) : DASH),
    int: (v) => (ok(v) ? nf(loc, 0).format(Math.round(v)) : DASH),
    compact: (v, d = 1) => (ok(v) ? new Intl.NumberFormat(loc, { notation: 'compact', maximumFractionDigits: d }).format(v) : DASH),
    pct: (v, d = 1) => (ok(v) ? nf(loc, d).format(v) + (lang === 'en' ? '%' : ' %') : DASH),
    signed: (v, d = 1) => (ok(v) ? (v > 0 ? '+' : v < 0 ? '−' : '') + nf(loc, d).format(Math.abs(v)) : DASH),
    month: (m, style = 'short') =>
      new Intl.DateTimeFormat(loc, { month: style, year: 'numeric', timeZone: 'UTC' }).format(monthDate(m)).replace('.', ''),
    monthRange: (from, to) => (from === to ? f.month(from) : `${f.month(from)} – ${f.month(to)}`),
    date: (iso) => (iso ? new Intl.DateTimeFormat(loc, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(iso)) : DASH),
    dateTime: (iso) => (iso ? new Intl.DateTimeFormat(loc, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : DASH),
    unit: (u) => translate(lang, `unit.${u}`),
  };
  return f;
}

registerDict({
  es: {
    'unit.hh': 'HH', 'unit.people': 'personas', 'unit.events': 'eventos', 'unit.cases': 'casos', 'unit.days': 'días', 'unit.hours': 'horas',
    'unit.pct': '%', 'unit.pp': 'p. p.', 'unit.per1e6hh': 'por 1.000.000 HH', 'unit.per200khh': 'por 200.000 HH', 'unit.per1e4hh': 'por 10.000 HH',
    'unit.per100workers': 'por 100 trabajadores', 'unit.per100kworkers': 'por 100.000 trabajadores', 'unit.score': 'puntos', 'unit.index': 'índice',
    'unit.probability': 'probabilidad', 'unit.count': 'n', 'unit.months': 'meses', 'unit.none': '',
    'country.PE': 'Perú', 'country.CO': 'Colombia', 'country.BR': 'Brasil',
  },
  en: {
    'unit.hh': 'hours', 'unit.people': 'people', 'unit.events': 'events', 'unit.cases': 'cases', 'unit.days': 'days', 'unit.hours': 'hours',
    'unit.pct': '%', 'unit.pp': 'pp', 'unit.per1e6hh': 'per 1,000,000 hours', 'unit.per200khh': 'per 200,000 hours', 'unit.per1e4hh': 'per 10,000 hours',
    'unit.per100workers': 'per 100 workers', 'unit.per100kworkers': 'per 100,000 workers', 'unit.score': 'points', 'unit.index': 'index',
    'unit.probability': 'probability', 'unit.count': 'n', 'unit.months': 'months', 'unit.none': '',
    'country.PE': 'Peru', 'country.CO': 'Colombia', 'country.BR': 'Brazil',
  },
  pt: {
    'unit.hh': 'HHT', 'unit.people': 'pessoas', 'unit.events': 'eventos', 'unit.cases': 'casos', 'unit.days': 'dias', 'unit.hours': 'horas',
    'unit.pct': '%', 'unit.pp': 'p. p.', 'unit.per1e6hh': 'por 1.000.000 HHT', 'unit.per200khh': 'por 200.000 HHT', 'unit.per1e4hh': 'por 10.000 HHT',
    'unit.per100workers': 'por 100 trabalhadores', 'unit.per100kworkers': 'por 100.000 trabalhadores', 'unit.score': 'pontos', 'unit.index': 'índice',
    'unit.probability': 'probabilidade', 'unit.count': 'n', 'unit.months': 'meses', 'unit.none': '',
    'country.PE': 'Peru', 'country.CO': 'Colômbia', 'country.BR': 'Brasil',
  },
});
