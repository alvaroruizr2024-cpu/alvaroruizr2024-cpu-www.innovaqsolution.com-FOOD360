import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type FocusEvent, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { Ban, ChartColumn, CircleCheck, CircleDashed, CircleSlash, Download, Hourglass, Info, Minus, OctagonAlert, Table2, TriangleAlert, Upload, X } from 'lucide-react';
import type { Availability, Lang, TextRef } from '../domain/types';
import type { StatusLevel, UnitKey } from '../domain/model';
import { hasKey, type Formatters, type TFn } from '../i18n/core';

export const tx = (t: TFn, r: TextRef | string | null | undefined): string => (r == null ? '' : typeof r === 'string' ? r : t(r.key, r.params));
/** Texto del catálogo (kpi.<ID>.<campo>, frente de mapa); si aún no está registrado usa el nombre corto de reserva o el código. */
export function kpiText(lang: Lang, t: TFn, id: string, field: string): string {
  const k = `kpi.${id}.${field}`;
  if (hasKey(lang, k) || hasKey('es', k)) return t(k);
  const named = field === 'short' || field === 'name';
  if (named && hasKey('es', `ui.kpifb.${id}`)) return t(`ui.kpifb.${id}`);
  return named ? id : '';
}
export function valueParts(fmt: Formatters, v: number | null | undefined, unit: UnitKey, decimals: number): { text: string; unit: string } {
  if (v == null || !Number.isFinite(v)) return { text: '—', unit: '' };
  const big = (unit === 'hh' || unit === 'hours') && Math.abs(v) >= 1e5;
  return { text: big ? fmt.compact(v, 2) : fmt.num(v, decimals), unit: unit === 'count' || unit === 'none' ? '' : fmt.unit(unit) };
}
export function fmtKv(fmt: Formatters, v: number | null | undefined, unit: UnitKey, decimals: number): string {
  const p = valueParts(fmt, v, unit, decimals);
  return !p.unit ? p.text : p.unit === '%' ? fmt.pct(v, decimals) : `${p.text} ${p.unit}`;
}

const STATUS_ICON: Record<StatusLevel, typeof CircleCheck> = { good: CircleCheck, warn: TriangleAlert, crit: OctagonAlert, neutral: Minus, nodata: CircleDashed, noexposure: CircleSlash, na: Ban };
export function StatusIcon({ level, size = 14 }: { level: StatusLevel; size?: number }) {
  const I = STATUS_ICON[level];
  return <I size={size} className={`st-ico st-${level}`} aria-hidden="true" />;
}
export function StatusChip({ level, t, note }: { level: StatusLevel; t: TFn; note?: string }) {
  return <span className={`chip chip-${level}`} title={note || undefined}><StatusIcon level={level} size={13} /><span>{t(`ui.status.${level}`)}</span></span>;
}

// ---------- tooltip global (mismo contenido con ratón y con foco de teclado) ----------
interface Tip { x: number; y: number; lines: string[] }
let tip: Tip | null = null;
const tipSubs = new Set<() => void>();
const setTip = (v: Tip | null) => { tip = v; tipSubs.forEach((f) => f()); };
export const showTip = (x: number, y: number, lines: string[]): void => setTip({ x, y, lines });
export const hideTip = (): void => { if (tip) setTip(null); };
export function tipProps(lines: string[]) {
  return {
    tabIndex: 0, 'aria-label': lines.join('. '),
    onMouseMove: (e: MouseEvent<Element>) => setTip({ x: e.clientX, y: e.clientY, lines }),
    onMouseLeave: () => hideTip(),
    onFocus: (e: FocusEvent<Element>) => { const r = e.currentTarget.getBoundingClientRect(); setTip({ x: r.left + r.width / 2, y: r.bottom - 6, lines }); },
    onBlur: () => hideTip(),
  };
}
export const markProps = (lines: string[]) => ({ ...tipProps(lines), role: 'img' as const });
export function TipLayer() {
  const v = useSyncExternalStore((f) => { tipSubs.add(f); return () => { tipSubs.delete(f); }; }, () => tip, () => null);
  if (!v) return null;
  const W = typeof innerWidth === 'number' ? innerWidth : 1440, H = typeof innerHeight === 'number' ? innerHeight : 900;
  const est = 22 + v.lines.length * 17;
  const style: CSSProperties = { left: Math.max(6, Math.min(v.x + 14, W - 300)), top: v.y + 16 + est > H ? Math.max(6, v.y - est - 8) : v.y + 16 };
  return <div className="tip" style={style} aria-hidden="true">{v.lines.map((l, i) => <div key={i} className={i === 0 ? 'tip-h' : undefined}>{l}</div>)}</div>;
}

export function useSize<T extends HTMLElement>(): [RefObject<T | null>, { w: number; h: number }] {
  const ref = useRef<T>(null);
  const [s, setS] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const read = () => { const w = el.clientWidth, h = el.clientHeight; setS((p) => (p.w === w && p.h === h ? p : { w, h })); };
    read();
    const ro = new ResizeObserver(read); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, s];
}

// ---------- contenedores ----------
export function Panel({ zone, title, chip, tools, children }: { zone: string; title: string; chip?: ReactNode; tools?: ReactNode; children: ReactNode }) {
  const id = useId();
  return (
    <section className="panel" data-zone={zone} aria-labelledby={id}>
      <header className="panel-h"><h2 id={id}>{title}</h2>{chip}<div className="panel-tools">{tools}</div></header>
      <div className="panel-b">{children}</div>
    </section>
  );
}
export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: Array<{ key: T; label: string; mark?: ReactNode }>; value: T; onChange(k: T): void; label: string }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((tb) => (
        <button key={tb.key} type="button" role="tab" aria-selected={tb.key === value} className={`tab${tb.key === value ? ' on' : ''}`} onClick={() => onChange(tb.key)}>{tb.label}{tb.mark}</button>
      ))}
    </div>
  );
}
export function Seg<T extends string>({ items, value, onChange, label, className }: { items: Array<{ key: T; label: string; title?: string; icon?: ReactNode }>; value: T | null; onChange(k: T): void; label: string; className?: string }) {
  return (
    <div className={`seg ${className ?? ''}`} role="group" aria-label={label}>
      {items.map((it) => (
        <button key={it.key} type="button" aria-pressed={it.key === value} className={it.key === value ? 'on' : undefined} title={it.title ?? (it.icon ? it.label : undefined)} aria-label={it.icon ? it.label : undefined} onClick={() => onChange(it.key)}>{it.icon}<span className="seg-l">{it.label}</span></button>
      ))}
    </div>
  );
}
export function Popover({ label, icon, title, align = 'left', className, children }: {
  label?: ReactNode; icon?: ReactNode; title?: string; align?: 'left' | 'right'; className?: string; children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: globalThis.MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector<HTMLElement>('button')?.focus(); } };
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div className={`pop ${className ?? ''}`} ref={ref}>
      <button type="button" className="btn" aria-haspopup="true" aria-expanded={open} title={title} aria-label={label ? undefined : title} onClick={() => setOpen(!open)}>{icon}{label != null && <span>{label}</span>}</button>
      {open && <div className={`pop-panel pop-${align}`}>{typeof children === 'function' ? children(() => setOpen(false)) : children}</div>}
    </div>
  );
}
export function Drawer({ title, sub, wide, onClose, t, children }: { title: string; sub?: string; wide?: boolean; onClose(): void; t: TFn; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  const id = useId();
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current; if (!el) return;
    const focusables = () => Array.from(el.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea,[tabindex]:not([tabindex="-1"])')).filter((n) => n.offsetParent !== null);
    el.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables(); if (!f.length) { e.preventDefault(); return; }
      const first = f[0], last = f[f.length - 1], a = document.activeElement;
      if (e.shiftKey && (a === first || a === el)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
    };
    el.addEventListener('keydown', onKey);
    return () => { el.removeEventListener('keydown', onKey); if (prev && document.contains(prev)) prev.focus(); };
  }, []);
  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={`drawer${wide ? ' drawer-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1}>
        <header className="drawer-h">
          <div><h2 id={id}>{title}</h2>{sub ? <p className="muted">{sub}</p> : null}</div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('ui.close')} title={t('ui.close')}><X size={16} aria-hidden="true" /></button>
        </header>
        <div className="drawer-b">{children}</div>
      </div>
    </div>
  );
}
/** Estado «fuente pendiente» visible: qué falta, plantilla y acceso a la importación. */
export function Pending({ av, t, onImport, compact }: { av: Availability; t: TFn; onImport?: () => void; compact?: boolean }) {
  return (
    <div className={`pending${compact ? ' pending-c' : ''}`}>
      <p className="pending-t"><Hourglass size={14} aria-hidden="true" /><strong>{t(av.state === 'disabled' ? 'ui.state.disabled' : 'ui.state.pending')}</strong><span>{t(av.reasonKey)}</span></p>
      {av.requirements?.length ? (<><p className="muted">{t('ui.pending.requires')}</p><ul className="req">{av.requirements.map((k) => <li key={k}>{t(k)}</li>)}</ul></>) : null}
      <div className="row">
        {av.templateFile ? <a className="btn btn-s" href={av.templateFile} download><Download size={13} aria-hidden="true" /><span>{t('ui.pending.template')}</span></a> : null}
        {onImport ? <button type="button" className="btn btn-s btn-accent" onClick={onImport}><Upload size={13} aria-hidden="true" /><span>{t('ui.import.open')}</span></button> : null}
      </div>
    </div>
  );
}
export function PendingChip({ av, t }: { av: Availability; t: TFn }) {
  if (av.state === 'available') return null;
  return <span className="chip chip-nodata" title={t(av.reasonKey)}><Hourglass size={12} aria-hidden="true" /><span>{t(av.state === 'partial' ? 'ui.state.partial' : av.state === 'disabled' ? 'ui.state.disabled' : 'ui.state.pending')}</span></span>;
}

// ---------- gráficos: marco con gemelo tabular ----------
export interface TableSpec { cols: string[]; rows: Array<Array<string | number | null>> }
export function DataTable({ spec, className }: { spec: TableSpec; className?: string }) {
  return (
    <div className="tbl-wrap" tabIndex={0}>
      <table className={`tbl ${className ?? ''}`}>
        <thead><tr>{spec.cols.map((c, i) => <th key={i} scope="col">{c}</th>)}</tr></thead>
        <tbody>{spec.rows.map((r, i) => <tr key={i}>{r.map((c, j) => (j === 0 ? <th key={j} scope="row">{c ?? '—'}</th> : <td key={j}>{c ?? '—'}</td>))}</tr>)}</tbody>
      </table>
    </div>
  );
}
export function ChartBox({ title, legend, note, table, t, height, className, children }: {
  title: string; legend?: ReactNode; note?: string; table: TableSpec; t: TFn; height?: number; className?: string; children: ReactNode;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <figure className={`chart ${className ?? ''}`}>
      <figcaption className="chart-h">
        <span className="chart-t">{title}</span>
        {note ? <span className="chart-i" title={note} aria-label={note} role="img"><Info size={12} aria-hidden="true" /></span> : null}
        {legend}
        <button type="button" className="link-btn chart-tw" aria-pressed={asTable} onClick={() => setAsTable(!asTable)}>
          {asTable ? <ChartColumn size={12} aria-hidden="true" /> : <Table2 size={12} aria-hidden="true" />}<span>{t(asTable ? 'ui.chart.viewChart' : 'ui.chart.viewTable')}</span>
        </button>
      </figcaption>
      <div className="chart-b" style={height ? { height } : undefined}>{asTable ? <DataTable spec={table} /> : children}</div>
    </figure>
  );
}
export function Legend({ items }: { items: Array<{ label: string; color: string; kind?: 'bar' | 'line' | 'dash' | 'band' }> }) {
  return (
    <span className="legend">
      {items.map((it) => <span key={it.label} className="legend-i"><i className={`sw sw-${it.kind ?? 'bar'}`} style={{ '--c': it.color } as CSSProperties} aria-hidden="true" />{it.label}</span>)}
    </span>
  );
}
