import { useLayoutEffect, useState, type RefObject } from 'react';
import type { CountryCode } from '../domain/types';
import type { DataState, MapCountry, MapLayer, MapMarker, MapModel, StatusLevel, UnitKey } from '../domain/model';
import type { Formatters, TFn } from '../i18n/core';
import { geoBounds } from 'd3-geo';
import type { FocusFeature, GeoData } from './geo';

/** Estado visual. «Cero eventos» (cero real con exposición válida) nunca se confunde con «sin datos», «sin exposición» ni «no aplica». */
export type Kind = 'good' | 'warn' | 'crit' | 'neutral' | 'zero' | 'nodata' | 'noexposure' | 'na';
export type Tone = 'ok' | 'warn' | 'crit' | 'neutral' | 'nodata';
/** Proyecto sin coordenadas validadas; un marcador (MapMarker) es un superconjunto de este tipo. */
export type Unlocated = MapModel['unlocated'][number];
export const KINDS: Kind[] = ['good', 'warn', 'crit', 'neutral', 'zero', 'nodata', 'noexposure', 'na'];
export const KIND_TONE: Record<Kind, Tone> = { good: 'ok', warn: 'warn', crit: 'crit', neutral: 'neutral', zero: 'ok', nodata: 'nodata', noexposure: 'nodata', na: 'nodata' };
/** Radios máximo y mínimo del marcador (px): el área es proporcional al valor de tamaño dentro de model.sizeDomain. */
export const R_MAX = 15;
export const R_MIN = 5;

export interface Ctx { model: MapModel; t: TFn; fmt: Formatters }
export interface ItemView { key: string; name: string; kind: Kind; tone: Tone; status: string; hasValue: boolean; num: string; unit: string; unitShort: string; value: string; size: string; sizeNum: string; aria: string }
export interface StageProps {
  geo: GeoData; model: MapModel; markers: MapMarker[]; theme: 'dark' | 'light'; reducedMotion: boolean; t: TFn; fmt: Formatters;
  onCountry(code: CountryCode): void; onMarker(m: MapMarker): void; onClear(): void; onTip(key: string | null): void;
}

export function kindOf(status: StatusLevel, state: DataState): Kind {
  if (state === 'zero') return 'zero';
  if (status === 'noexposure') return 'noexposure';
  if (status === 'na' || state === 'na') return 'na';
  if (status === 'nodata' || state !== 'ok') return 'nodata';
  return status;
}
export function toneOf(status: StatusLevel, state: DataState): Tone {
  const k = kindOf(status, state);
  if (k === 'zero') return status === 'warn' || status === 'crit' ? status : status === 'good' ? 'ok' : 'neutral';
  return KIND_TONE[k];
}
export function statusText(status: StatusLevel, state: DataState, layer: MapLayer, t: TFn): string {
  const k = kindOf(status, state);
  if (k === 'zero') return t(layer === 'events' ? 'map.status.zero' : 'map.status.zeroValue');
  if (k === 'nodata' && (state === 'pending' || state === 'insufficient' || state === 'disabled')) return t(`map.state.${state}`);
  return t(`map.status.${k}`);
}
export function valueParts(value: number | null, unit: UnitKey, decimals: number, fmt: Formatters): { num: string; unit: string } {
  if (value == null || !Number.isFinite(value)) return { num: '—', unit: '' };
  if (unit === 'pct') return { num: fmt.pct(value, decimals), unit: '' };
  const num = decimals === 0 && Math.abs(value) >= 100000 ? fmt.compact(value, 1) : fmt.num(value, decimals);
  return { num, unit: unit === 'none' || unit === 'count' ? '' : fmt.unit(unit) };
}
export function valueText(value: number | null, unit: UnitKey, decimals: number, fmt: Formatters): string {
  const p = valueParts(value, unit, decimals, fmt);
  return p.unit ? `${p.num} ${p.unit}` : p.num;
}
function baseView(key: string, name: string, status: StatusLevel, state: DataState, value: number | null, sizeValue: number | null, { model, t, fmt }: Ctx) {
  const st = statusText(status, state, model.layer, t);
  const hasValue = state === 'ok' && value != null;
  const p = valueParts(value, model.unit, model.decimals, fmt);
  const shortKey = `map.unit.${model.unit}`;
  const short = t(shortKey);   // unidad abreviada para etiquetas compactas; la unidad completa va en leyenda, tooltip y aria-label
  return {
    key, name, kind: kindOf(status, state), tone: toneOf(status, state), status: st, hasValue,
    num: hasValue ? p.num : st, unit: hasValue ? p.unit : '', unitShort: hasValue && p.unit ? (short === shortKey ? p.unit : short) : '', value: hasValue ? (p.unit ? `${p.num} ${p.unit}` : p.num) : st,
    size: valueText(sizeValue, model.sizeUnit, 0, fmt), sizeNum: valueParts(sizeValue, model.sizeUnit, 0, fmt).num,
  };
}
export function countryView(c: MapCountry, ctx: Ctx): ItemView {
  const b = baseView(`c:${c.code}`, ctx.t(`country.${c.code}`), c.status, c.state, c.value, c.sizeValue, ctx);
  const hint = ctx.t(c.selected ? 'map.hint.countrySel' : 'map.hint.country');
  return { ...b, aria: `${b.name}. ${b.status}${b.hasValue ? `. ${b.value}` : ''}. ${hint}` };
}
export function markerView(m: Unlocated, ctx: Ctx): ItemView {
  const b = baseView(`m:${m.projectId}`, m.name, m.status, m.state, m.value, m.sizeValue, ctx);
  const hint = ctx.t(m.selected ? 'map.hint.projectSel' : 'map.hint.project');
  return { ...b, aria: `${m.name}, ${ctx.t(`country.${m.country}`)}. ${b.status}${b.hasValue ? `. ${b.value}` : ''}. ${ctx.t('map.tip.exposure')}: ${b.size}. ${hint}` };
}
export function radiusFor(v: number | null, domain: [number, number]): number {
  const max = Math.max(domain[1], 0);
  if (v == null || !Number.isFinite(v) || v <= 0 || max <= 0) return R_MIN;
  return Math.max(R_MIN, R_MAX * Math.sqrt(Math.min(v, max) / max));
}
export type Side = 'west' | 'east' | 'center';
/** Países estrechos: etiqueta al costado exterior (hacia el océano) con una guía; países anchos: etiqueta centrada. Se calcula con la geometría. */
export function labelSides(focus: FocusFeature[]): Map<CountryCode, Side> {
  const mean = focus.reduce((a, f) => a + f.properties.anchor[0], 0) / Math.max(1, focus.length);
  return new Map(focus.map((f) => {
    const [[w0], [e0]] = geoBounds(f);
    const width = ((e0 - w0 + 360) % 360) * Math.cos((f.properties.anchor[1] * Math.PI) / 180);
    const side: Side = width >= 22 ? 'center' : f.properties.anchor[0] <= mean ? 'west' : 'east';
    return [f.properties.code, side] as const;
  }));
}
export const norm = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function useSize(ref: RefObject<HTMLElement | null>): { w: number; h: number } {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => { const w = Math.round(el.clientWidth), h = Math.round(el.clientHeight); setSize((s) => (s.w === w && s.h === h ? s : { w, h })); };
    apply();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

// Iconos de estado (lienzo 16×16): la forma y la marca interior diferencian los estados sin depender del color.
const CIRCLE = 'M8 1.8a6.2 6.2 0 1 0 0 12.4a6.2 6.2 0 1 0 0-12.4z';
const OUTLINE: Partial<Record<Kind, string>> = { warn: 'M8 2l6.3 11.2H1.7z', crit: 'M5.4 1.7h5.2l3.7 3.7v5.2l-3.7 3.7H5.4l-3.7-3.7V5.4z' };
const MARK: Record<Kind, string> = {
  good: 'M4.9 8.3l2.1 2.1l4.2-4.6', warn: 'M8 4.2v4.4M8 11.3v.2', crit: 'M5.5 5.5l5 5M10.5 5.5l-5 5', neutral: 'M7.2 8a.8.8 0 1 0 1.6 0a.8.8 0 1 0-1.6 0',
  zero: 'M8 5c1.1 0 1.8 1.2 1.8 3s-.7 3-1.8 3s-1.8-1.2-1.8-3s.7-3 1.8-3z', nodata: '', noexposure: 'M4 12l8-8', na: 'M5.2 8h5.6',
};
const MARK_IN_TRIANGLE = 'M8 6.4v3.2M8 11.6v.2';

export function Glyph({ kind, size = 14 }: { kind: Kind; size?: number }) {
  return (
    <svg className="rm-glyph" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d={`${OUTLINE[kind] ?? CIRCLE}${kind === 'warn' ? MARK_IN_TRIANGLE : MARK[kind]}`} fill="none" stroke="currentColor" strokeWidth={1.6}
        strokeLinecap="round" strokeLinejoin="round" strokeDasharray={kind === 'nodata' ? '2.6 2.2' : undefined} />
    </svg>
  );
}
/** Marcador circular: relleno = color de estado, anillo de 2 px del color de superficie; estados sin dato = círculo hueco. */
export function MarkerDot({ kind, d, selected = false }: { kind: Kind; d: number; selected?: boolean }) {
  const hollow = kind === 'zero' || kind === 'nodata' || kind === 'noexposure' || kind === 'na';
  const pad = selected ? 5 : 2;
  const s = d + pad * 2;
  const c = s / 2;
  return (
    <svg className={`rm-dot${hollow ? ' is-hollow' : ''}${kind === 'nodata' ? ' is-dashed' : ''}`} width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden="true" focusable="false">
      {selected && <circle className="rm-dot-sel" cx={c} cy={c} r={d / 2 + 3.8} />}
      <circle className="rm-dot-ring" cx={c} cy={c} r={d / 2 + 2} />
      <circle className="rm-dot-fill" cx={c} cy={c} r={hollow ? d / 2 - 0.75 : d / 2} />
      {d >= 9 && MARK[kind] && <path className="rm-dot-mark" d={MARK[kind]} transform={`translate(${pad} ${pad}) scale(${d / 16})`} />}
    </svg>
  );
}
export function CountryLabel({ c, v, side = 'center', onClick, onTip }: { c: MapCountry; v: ItemView; side?: Side; onClick(): void; onTip(key: string | null): void }) {
  return (
    <button type="button" className={`rm-clabel is-${side} rm-tone-${v.tone}${c.selected ? ' is-selected' : ''}`} data-rm-key={v.key} aria-pressed={c.selected} aria-label={v.aria}
      onClick={onClick} onMouseEnter={() => onTip(v.key)} onMouseLeave={() => onTip(null)} onFocus={() => onTip(v.key)} onBlur={() => onTip(null)}>
      <span className="rm-clabel-top"><Glyph kind={v.kind} size={13} /><span>{v.name}</span></span>
      <span className="rm-clabel-val">{v.num}{v.unitShort ? <span className="rm-clabel-unit"> {v.unitShort}</span> : null}</span>
    </button>
  );
}
export function MarkerButton({ m, v, r, demoTag, onClick, onClear, onTip }: {
  m: Unlocated; v: ItemView; r: number; demoTag: string; onClick(): void; onClear(): void; onTip(key: string | null): void;
}) {
  return (
    <button type="button" className={`rm-marker rm-tone-${v.tone}${m.selected ? ' is-selected' : ''}`} data-rm-key={v.key} aria-pressed={m.selected} aria-label={v.aria}
      onClick={onClick} onKeyDown={(e) => { if (e.key === 'Escape' && m.selected) onClear(); }}
      onMouseEnter={() => onTip(v.key)} onMouseLeave={() => onTip(null)} onFocus={() => onTip(v.key)} onBlur={() => onTip(null)}>
      <MarkerDot kind={v.kind} d={Math.round(r * 2)} selected={m.selected} />
      {(m.isDemo || m.selected) && <span className="rm-marker-tag" aria-hidden="true">{m.selected ? m.name : demoTag}</span>}
    </button>
  );
}
