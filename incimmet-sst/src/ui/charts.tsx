/** Gráficos SVG propios (d3-scale/shape/array). Reglas: barras ≤ 24 px con extremo de dato redondeado (4 px) y 2 px entre segmentos apilados,
 *  líneas de 2 px, rejilla fina, texto nunca en el color de la serie, marcas enfocables con el mismo tooltip que el ratón. */
import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { scaleBand, scaleLinear } from 'd3-scale';
import { area, line } from 'd3-shape';
import { max } from 'd3-array';
import { CircleAlert } from 'lucide-react';
import type { CountryCode, Month } from '../domain/types';
import type { HealthPanelModel, PlanPanelModel, ProjectRow, RiskCell, RiskPanelModel, SeriesPoint, TrendChart, TrendModel } from '../domain/model';
import type { Formatters, TFn } from '../i18n/core';
import { ChartBox, Legend, StatusIcon, hideTip, markProps, showTip, tipProps, tx, useSize, type TableSpec } from './primitives';

export const cvar = (role: string): string => `var(--${role})`;
export const COUNTRY_COLOR: Record<CountryCode, string> = { PE: 'var(--series-1)', CO: 'var(--series-2)', BR: 'var(--series-3)' };
const topRound = (x: number, y: number, w: number, h: number, r = 4): string => {
  const q = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y + h}V${y + q}Q${x},${y} ${x + q},${y}H${x + w - q}Q${x + w},${y} ${x + w},${y + q}V${y + h}Z`;
};

export function Sparkline({ points, label }: { points: Array<{ month: Month; value: number | null }>; label: string }) {
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const idx = points.map((p, i) => (p.value == null ? -1 : i)).filter((i) => i >= 0);
  let body = null;
  if (w > 12 && h > 8 && idx.length >= 2) {
    const vals = idx.map((i) => points[i].value as number);
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const x = scaleLinear().domain([0, points.length - 1]).range([2, w - 5]);
    const y = scaleLinear().domain(lo === hi ? [lo - 1, hi + 1] : [lo, hi]).range([h - 4, 4]);
    const d = line<{ value: number | null }>().defined((p) => p.value != null).x((_, i) => x(i)).y((p) => y(p.value as number))(points) ?? '';
    const li = idx[idx.length - 1];
    body = (<svg width={w} height={h} aria-hidden="true"><path d={d} className="spark-line" /><circle cx={x(li)} cy={y(points[li].value as number)} r={2.6} className="spark-dot" /></svg>);
  }
  return <div ref={ref} className="spark" role="img" aria-label={label}>{body}</div>;
}

// ---------- tendencias: múltiplos pequeños alineados (nunca doble eje) ----------
const ML = 40, MR = 30;
interface Geo { w: number; bw: number; step: number; x0: number; cx(i: number): number }
type Ev = { onPointerMove(e: PointerEvent<SVGSVGElement>): void; onPointerDown(e: PointerEvent<SVGSVGElement>): void; onPointerUp(e: PointerEvent<SVGSVGElement>): void; onPointerLeave(): void };

export function TrendMultiples({ model, t, fmt, onRange }: { model: TrendModel; t: TFn; fmt: Formatters; onRange(from: Month, to: Month): void }) {
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const months = model.months, n = months.length;
  const [active, setActive] = useState<number | null>(null);
  const [anchor, setAnchor] = useState<number | null>(null);
  const drag = useRef(false);
  const geo = useMemo<Geo>(() => {
    const band = scaleBand<number>().domain(months.map((_, i) => i)).range([ML, Math.max(ML + 20, w - MR)]).paddingInner(0.3).paddingOuter(0.15);
    const step = band.step(), full = band.bandwidth(), first = band(0) ?? ML;
    return { w, bw: Math.min(24, full), step, x0: first - (step - full) / 2, cx: (i: number) => first + i * step + full / 2 };
  }, [months, w]);
  const cols = useMemo(() => model.charts.map((c) => c.series.map((s) => { const mp = new Map(s.points.map((p) => [p.month, p] as const)); return months.map((m) => mp.get(m) ?? null); })), [model.charts, months]);
  const ci = model.forecast.cutoff ? months.indexOf(model.forecast.cutoff) : -1;
  const cut = ci >= 0 ? ci : n - 1;
  const tipLines = (i: number): string[] => {
    const out = [fmt.month(months[i], 'long')];
    model.charts.forEach((c, k) => c.series.forEach((s, si) => {
      const p = cols[k][si][i]; const f = (v: number) => (c.unit === 'hh' ? fmt.int(v) : fmt.num(v, c.decimals));
      if (s.kind === 'band') { if (p && p.lo != null && p.hi != null) out.push(`${tx(t, s.label)}: ${f(p.lo)} – ${f(p.hi)}`); return; }
      if (!p || p.value == null) { if ((s.kind === 'bar' || s.kind === 'line') && i <= cut) out.push(`${tx(t, s.label)}: ${t('ui.state.nd.short')}`); return; }
      out.push(`${tx(t, s.label)}: ${f(p.value)}${p.flag ? ` (${t('ui.trend.flagged')})` : ''}`);
    }));
    return out;
  };
  const idxAt = (clientX: number, el: Element) => Math.max(0, Math.min(n - 1, Math.floor((clientX - el.getBoundingClientRect().left - geo.x0) / geo.step)));
  const apply = (a: number, b: number) => { const lo = Math.min(a, b), hi = Math.min(Math.max(a, b), cut); if (lo <= cut) onRange(months[lo], months[hi]); };
  const ev: Ev = {
    onPointerMove: (e) => { const i = idxAt(e.clientX, e.currentTarget); setActive(i); showTip(e.clientX, e.clientY, tipLines(i)); },
    onPointerDown: (e) => { const i = idxAt(e.clientX, e.currentTarget); drag.current = true; setAnchor(i); setActive(i); e.currentTarget.setPointerCapture(e.pointerId); },
    onPointerUp: (e) => { if (!drag.current) return; drag.current = false; const i = idxAt(e.clientX, e.currentTarget); const a = anchor ?? i; setAnchor(null); apply(a, i); },
    onPointerLeave: () => { if (!drag.current) { setActive(null); hideTip(); } },
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const cur = active ?? Math.max(0, Math.min(n - 1, months.indexOf(model.selected.to) < 0 ? cut : months.indexOf(model.selected.to)));
    let nx = cur;
    if (e.key === 'ArrowLeft') nx = Math.max(0, cur - 1);
    else if (e.key === 'ArrowRight') nx = Math.min(n - 1, cur + 1);
    else if (e.key === 'Home') nx = 0;
    else if (e.key === 'End') nx = n - 1;
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); apply(anchor ?? cur, cur); setAnchor(null); return; }
    else if (e.key === 'Escape') { setAnchor(null); setActive(null); hideTip(); return; }
    else return;
    e.preventDefault();
    if (e.shiftKey) { if (anchor == null) setAnchor(cur); } else setAnchor(null);
    setActive(nx);
    const r = e.currentTarget.getBoundingClientRect(); showTip(r.left + geo.cx(nx) + 8, r.top + 6, tipLines(nx));
  };
  const sb = months.indexOf(model.selected.to), sa = months.indexOf(model.selected.from);
  const sel: [number, number] | null = sb < 0 ? null : [sa < 0 ? 0 : sa, sb];
  const brush: [number, number] | null = anchor != null && active != null ? [Math.min(anchor, active), Math.max(anchor, active)] : null;
  const every = Math.max(1, Math.ceil(74 / Math.max(1, geo.step)));
  return (
    <div ref={ref} className="trend" tabIndex={0} role="group" aria-label={t('ui.trend.aria')} onKeyDown={onKey} onBlur={(e) => { if (e.target === e.currentTarget) { setActive(null); setAnchor(null); hideTip(); } }}>
      {w > 0 && model.charts.map((c, k) => <TrendOne key={c.key} c={c} cols={cols[k]} months={months} geo={geo} cut={cut} active={active} sel={sel} brush={brush} t={t} fmt={fmt} fc={model.forecast} ev={ev} />)}
      {w > 0 && (
        <svg className="trend-axis" width={w} height={16} aria-hidden="true">
          {months.map((m, i) => (Math.abs(cut - i) % every === 0 ? <text key={m} className="axis-t" x={geo.cx(i)} y={12} textAnchor="middle">{fmt.month(m)}</text> : null))}
        </svg>
      )}
      {!model.forecast.enabled && model.forecast.reason ? <p className="trend-note trunc" title={tx(t, model.forecast.reason)}>{t('ui.trend.noForecast')}: {tx(t, model.forecast.reason)}</p> : null}
      <span className="sr" aria-live="polite">{active != null ? tipLines(active).join('. ') : ''}</span>
    </div>
  );
}

function TrendOne({ c, cols, months, geo, cut, active, sel, brush, t, fmt, fc, ev }: {
  c: TrendChart; cols: Array<Array<SeriesPoint | null>>; months: Month[]; geo: Geo; cut: number; active: number | null;
  sel: [number, number] | null; brush: [number, number] | null; t: TFn; fmt: Formatters; fc: TrendModel['forecast']; ev: Ev;
}) {
  const [bref, bs] = useSize<HTMLDivElement>();
  const h = Math.max(30, bs.h);
  const f = (v: number) => (c.unit === 'hh' ? fmt.compact(v, 1) : fmt.num(v, c.decimals));
  const table: TableSpec = {
    cols: [t('ui.col.month'), ...c.series.map((s) => tx(t, s.label))],
    rows: months.map((m, i) => [fmt.month(m), ...c.series.map((_, si) => { const p = cols[si][i]; if (!p) return null; if (p.value != null) return c.unit === 'hh' ? fmt.int(p.value) : fmt.num(p.value, c.decimals); return p.lo != null && p.hi != null ? `${f(p.lo)} – ${f(p.hi)}` : null; })]),
  };
  let top = 0;
  months.forEach((_, i) => { let sum = 0; c.series.forEach((s, si) => { const p = cols[si][i]; if (!p) return; if (s.kind === 'bar' && c.stacked) sum += p.value ?? 0; else top = Math.max(top, p.value ?? 0, p.hi ?? 0); }); top = Math.max(top, sum); });
  const PT = 9, PB = 3;
  const y = scaleLinear().domain([0, top > 0 ? top * 1.15 : 1]).range([h - PB, PT]);
  let ticks = y.ticks(h < 80 ? 2 : 3).filter((v) => v > 0);
  while (ticks.length > 1 && Math.abs(y(ticks[0]) - y(ticks[1])) < 14) ticks = ticks.filter((_, i) => i % 2 === 1);
  const xr = (a: number, b: number) => ({ x: geo.x0 + a * geo.step, width: (b - a + 1) * geo.step });
  const lg = c.series.map((s) => ({ label: tx(t, s.label), color: cvar(s.colorRole), kind: s.kind === 'bar' ? ('bar' as const) : s.kind === 'band' ? ('band' as const) : s.kind === 'line' ? ('line' as const) : ('dash' as const) }));
  const hasFc = fc.enabled && cut < months.length - 1 && c.series.some((s) => s.kind === 'forecast' || s.kind === 'band');
  const ln = line<SeriesPoint | null>().defined((p) => p != null && p.value != null).x((_, i) => geo.cx(i)).y((p) => y((p as SeriesPoint).value as number));
  const ar = area<SeriesPoint | null>().defined((p) => p != null && p.lo != null && p.hi != null).x((_, i) => geo.cx(i)).y0((p) => y((p as SeriesPoint).lo as number)).y1((p) => y((p as SeriesPoint).hi as number));
  const barSeries = c.series.map((s, si) => ({ s, si })).filter((o) => o.s.kind === 'bar');
  const labels: Array<{ x: number; y: number; text: string; anchor: 'start' | 'middle' }> = [];
  c.series.forEach((s, si) => {
    if (s.kind !== 'line') return;
    let li = -1; for (let i = months.length - 1; i >= 0; i--) if (cols[si][i]?.value != null) { li = i; break; }
    if (li < 0) return;
    const v = cols[si][li]?.value as number; const edge = li === months.length - 1;
    labels.push({ x: geo.cx(li) + (edge ? 6 : 0), y: y(v) + (edge ? 4 : -7), text: fmt.num(v, c.decimals), anchor: edge ? 'start' : 'middle' });
  });
  labels.sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < 12) labels[i].y = labels[i - 1].y + 12;
  return (
    <ChartBox title={`${tx(t, c.title)} · ${fmt.unit(c.unit)}`} className="grow" table={table} t={t} legend={lg.length >= 2 ? <Legend items={lg} /> : null} note={c.notes.map((x) => tx(t, x)).join(' ') || undefined}>
      <div ref={bref} className="fill">{bs.h > 0 ? (<svg width={geo.w} height={h} className="trend-svg" aria-hidden="true" {...ev}>
        {sel ? <rect className="t-sel" y={0} height={h} {...xr(sel[0], sel[1])} /> : null}
        {hasFc ? <rect className="t-fc" y={0} height={h} {...xr(cut + 1, months.length - 1)} /> : null}
        {ticks.map((v) => (<g key={v}><line className="grid-l" x1={ML} x2={geo.w - 4} y1={y(v)} y2={y(v)} /><text className="axis-t" x={ML - 5} y={y(v) + 4} textAnchor="end">{f(v)}</text></g>))}
        <line className="axis-l" x1={ML} x2={geo.w - 4} y1={y(0)} y2={y(0)} />
        {months.map((m, i) => {
          let acc = 0; const segs: Array<{ si: number; y0: number; y1: number; role: string }> = [];
          for (const { s, si } of barSeries) { const v = cols[si][i]?.value ?? 0; if (v <= 0) continue; segs.push({ si, y0: acc, y1: acc + v, role: s.colorRole }); if (c.stacked) acc += v; }
          return segs.map((g, k) => {
            const yt = y(g.y1), hh = Math.max(1, y(g.y0) - (k > 0 ? 2 : 0) - yt), xx = geo.cx(i) - geo.bw / 2;
            return k === segs.length - 1 ? <path key={`${m}-${g.si}`} d={topRound(xx, yt, geo.bw, hh)} fill={cvar(g.role)} /> : <rect key={`${m}-${g.si}`} x={xx} y={yt} width={geo.bw} height={hh} fill={cvar(g.role)} />;
          });
        })}
        {c.series.map((s, si) => (s.kind === 'band' ? <path key={s.key} d={ar(cols[si]) ?? ''} fill={cvar(s.colorRole)} className="t-band" /> : null))}
        {c.series.map((s, si) => (s.kind === 'line' || s.kind === 'forecast' || s.kind === 'target' ? <path key={s.key} d={ln(cols[si]) ?? ''} stroke={cvar(s.colorRole)} fill="none" className={`t-ln t-${s.kind}`} /> : null))}
        {c.series.map((s, si) => cols[si].map((p, i) => (p?.flag && s.kind !== 'band' ? <path key={`${s.key}-${i}`} className="t-flag" d={`M${geo.cx(i)},${PT - 6}l4,4l-4,4l-4,-4z`} /> : null)))}
        {active != null ? <line className="xhair" x1={geo.cx(active)} x2={geo.cx(active)} y1={2} y2={h - PB} /> : null}
        {active != null ? c.series.map((s, si) => { const p = cols[si][active]; return p?.value != null && (s.kind === 'line' || s.kind === 'forecast') ? <circle key={s.key} className="t-dot" cx={geo.cx(active)} cy={y(p.value)} r={3.5} fill={cvar(s.colorRole)} /> : null; }) : null}
        {brush ? <rect className="t-brush" y={0} height={h} {...xr(brush[0], brush[1])} /> : null}
        {labels.map((l, i) => <text key={i} className="dl" x={l.x} y={l.y} textAnchor={l.anchor}>{l.text}</text>)}
        {hasFc ? <text className="axis-t" x={geo.x0 + (cut + 1) * geo.step + 3} y={PT + 3}>{t(fc.isSimulation ? 'ui.trend.simulation' : 'ui.trend.forecast')}</text> : null}
      </svg>) : null}</div>
    </ChartBox>
  );
}

// ---------- barras agrupadas ----------
export function Bars({ data, series, fmt, decimals = 0 }: { data: Array<{ label: string; values: Array<number | null> }>; series: Array<{ label: string; color: string }>; fmt: Formatters; decimals?: number }) {
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const ns = Math.max(1, series.length);
  let body = null;
  if (w > 20 && h > 30 && data.length) {
    const band = scaleBand<number>().domain(data.map((_, i) => i)).range([2, w - 2]).paddingInner(0.25).paddingOuter(0.08);
    const bw = Math.max(3, Math.min(24, (band.bandwidth() - 2 * (ns - 1)) / ns));
    const top = max(data, (d) => max(d.values, (v) => v ?? 0) ?? 0) || 1;
    const y = scaleLinear().domain([0, top]).range([h - 17, 15]);
    const maxLen = Math.max(1, ...data.flatMap((d) => d.values.map((v) => (v == null ? 0 : fmt.num(v, decimals).length))));
    const showVal = bw >= 13 && maxLen * 6.3 <= (ns === 1 ? band.step() : bw + 3);
    body = (
      <svg width={w} height={h}>
        <line className="axis-l" x1={0} x2={w} y1={y(0)} y2={y(0)} />
        {!showVal ? <g><line className="grid-l" x1={0} x2={w} y1={y(top)} y2={y(top)} /><text className="axis-t" x={2} y={y(top) - 3}>{fmt.num(top, decimals)}</text></g> : null}
        {data.map((d, i) => {
          const gx = (band(i) ?? 0) + (band.bandwidth() - (ns * bw + (ns - 1) * 2)) / 2;
          return (
            <g key={i}>
              {d.values.map((v, j) => {
                if (v == null) return null;
                const xx = gx + j * (bw + 2), hh = Math.max(0, y(0) - y(v));
                return (
                  <g key={j} className="mark" {...markProps([d.label, `${series[j]?.label ?? ''}: ${fmt.num(v, decimals)}`])}>
                    <path d={topRound(xx, y(v), bw, hh)} fill={series[j]?.color} />
                    {showVal ? <text className="dl" x={xx + bw / 2} y={y(v) - 3} textAnchor="middle">{fmt.num(v, decimals)}</text> : null}
                  </g>
                );
              })}
              <text className="axis-t" x={(band(i) ?? 0) + band.bandwidth() / 2} y={h - 4} textAnchor="middle">{d.label}</text>
            </g>
          );
        })}
      </svg>
    );
  }
  return <div ref={ref} className="fill">{body}</div>;
}
export function HBar({ label, value, text, hollow, tip }: { label: string; value: number | null; text: string; hollow?: boolean; tip?: string[] }) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="hbar" {...(tip ? tipProps(tip) : {})}>
      <span className="hbar-l">{label}</span>
      <span className="hbar-t"><i className={hollow ? 'hollow' : undefined} style={{ width: `${pct}%` }} /></span>
      <span className="hbar-v num">{text}</span>
    </div>
  );
}

// ---------- comparación de proyectos: punto + intervalo de 95 % ----------
export function ProjectsTable({ rows, t, fmt, onOpen }: { rows: ProjectRow[]; t: TFn; fmt: Formatters; onOpen(id: string): void }) {
  const sorted = [...rows].sort((a, b) => (b.attention ?? -1) - (a.attention ?? -1));
  const hi = max(rows, (r) => r.trifrCI?.[1] ?? r.trifr ?? 0) || 1;
  const sx = scaleLinear().domain([0, hi]).range([5, 105]);
  return (
    <div className="tbl-wrap" tabIndex={0}>
      <table className="tbl tbl-proj">
        <thead><tr><th scope="col">{t('ui.col.project')}</th><th scope="col" className="num">{t('ui.col.hh')}</th><th scope="col">{t('ui.col.trifrCI')}</th><th scope="col" className="num">{t('ui.col.trifr')}</th><th scope="col" className="num">{t('ui.col.attention')}</th></tr></thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.projectId} className={r.selected ? 'sel' : undefined}>
              <th scope="row">
                <button type="button" className="link-btn" onClick={() => onOpen(r.projectId)}><span className="mono cc">{r.country}</span><span>{r.name}</span></button>
                {r.smallExposure ? <span className="flag" title={t('ui.flag.small_exposure')}><CircleAlert size={12} aria-hidden="true" /><span>{t('ui.flag.small_exposure.short')}</span></span> : null}
              </th>
              <td className="num">{fmt.compact(r.hh, 1)}</td>
              <td>
                <svg width={110} height={16} role="img" aria-label={r.trifrCI ? t('ui.proj.ci', { lo: fmt.num(r.trifrCI[0], 1), hi: fmt.num(r.trifrCI[1], 1) }) : t('ui.state.nd.short')}>
                  <line className="grid-l" x1={5} x2={105} y1={8} y2={8} />
                  {r.trifrCI ? <line className="ci" x1={sx(r.trifrCI[0])} x2={sx(r.trifrCI[1])} y1={8} y2={8} /> : null}
                  {r.trifr != null ? <circle className={r.smallExposure ? 'dot dot-hollow' : 'dot'} cx={sx(r.trifr)} cy={8} r={4} style={{ '--c': COUNTRY_COLOR[r.country] } as CSSProperties} /> : null}
                </svg>
              </td>
              <td className="num">{fmt.num(r.trifr, 2)}</td>
              <td className="num">{r.attention == null ? '—' : <span className="score"><i style={{ width: `${Math.max(0, Math.min(100, r.attention))}%` }} /><b>{fmt.int(r.attention)}</b></span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- matriz riesgo × proyecto (cobertura · efectividad) ----------
const abbr = (name: string): string => name.replace(/^DEMO\s*·\s*/i, '').split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 3).toUpperCase();
export function RiskMatrix({ model, t, fmt, onCell }: { model: RiskPanelModel; t: TFn; fmt: Formatters; onCell(c: RiskCell): void }) {
  const cell = new Map(model.cells.map((c) => [`${c.risk}|${c.projectId}`, c] as const));
  const r0 = (v: number | null) => (v == null ? '–' : String(Math.round(v)));
  return (
    <table className="mx">
      <caption className="sr">{t('ui.risk.caption')}</caption>
      <thead><tr><th scope="col" className="mx-corner trunc" title={t('ui.risk.caption')}>{t('ui.risk.legend')}</th>{model.projects.map((p) => <th key={p.id} scope="col"><abbr title={p.name}>{abbr(p.name)}</abbr></th>)}</tr></thead>
      <tbody>
        {model.risks.map((r) => (
          <tr key={r.key}>
            <th scope="row" className="trunc" title={tx(t, r.label)}>{tx(t, r.label)}</th>
            {model.projects.map((p) => {
              const c = cell.get(`${r.key}|${p.id}`);
              if (!c) return <td key={p.id} className="mx-na">–</td>;
              const lines = [`${tx(t, r.label)} · ${p.name}`, `${t('ui.risk.coverage')}: ${fmt.pct(c.coveragePct, 0)} (${c.done}/${c.due})`, `${t('ui.risk.effectiveness')}: ${fmt.pct(c.effectivenessPct, 0)} (${c.conform}/${c.done})`,
                ...(c.activeFailures ? [t('ui.risk.activeFailures', { n: c.activeFailures })] : []), t(`ui.status.${c.status}`)];
              return (
                <td key={p.id}>
                  <button type="button" className={`mx-c mx-${c.status}`} {...tipProps(lines)} onClick={() => onCell(c)}>
                    {c.status === 'crit' || c.status === 'warn' ? <StatusIcon level={c.status} size={9} /> : null}<span>{r0(c.coveragePct)}·{r0(c.effectivenessPct)}</span>
                  </button>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------- plan anual: mapa de calor programa × mes ----------
export function PlanHeatmap({ model, t, fmt }: { model: PlanPanelModel; t: TFn; fmt: Formatters }) {
  const cell = new Map(model.cells.map((c) => [`${c.program}|${c.month}`, c] as const));
  const step = (p: number) => (p >= 95 ? 5 : p >= 85 ? 4 : p >= 70 ? 3 : p >= 50 ? 2 : 1);
  return (
    <table className="hm">
      <thead><tr><th scope="col"><span className="sr">{t('ui.col.program')}</span></th>{model.months.map((m) => <th key={m} scope="col" title={fmt.month(m, 'long')}>{fmt.month(m).slice(0, 3)}</th>)}</tr></thead>
      <tbody>
        {model.programs.map((p) => (
          <tr key={p.key}>
            <th scope="row" className="trunc" title={tx(t, p.label)}>{tx(t, p.label)}</th>
            {model.months.map((m) => {
              const c = cell.get(`${p.key}|${m}`); const head = `${tx(t, p.label)} · ${fmt.month(m, 'long')}`;
              if (!c || c.state === 'na') return <td key={m} className="hm-na" {...tipProps([head, t('ui.state.na')])}>·</td>;
              if (c.state === 'future') return <td key={m} className="hm-fut" {...tipProps([head, t('ui.plan.future', { n: c.due })])}>{c.due || ''}</td>;
              const lines = [head, `${t('ui.plan.done')}: ${c.done}/${c.due}`, c.pct == null ? t('ui.state.nd.short') : fmt.pct(c.pct, 0), ...(c.state === 'late' ? [t('ui.plan.late')] : [])];
              return <td key={m} className={`hm-c r${c.pct == null ? 0 : step(c.pct)}${c.state === 'late' ? ' hm-late' : ''}`} {...tipProps(lines)}>{c.pct == null ? '–' : Math.round(c.pct)}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------- salud: figura corporal, Pareto y consecuencia vs. potencial ----------
type Sh = ['c' | 'r', ...number[]];
const BODY_SHAPES: Record<string, Sh[]> = {
  head: [['c', 50, 15, 11]], neck: [['r', 45, 26, 10, 8]], shoulder: [['r', 23, 35, 15, 10], ['r', 62, 35, 15, 10]], trunk: [['r', 38, 35, 24, 50]],
  arm: [['r', 20, 46, 10, 42], ['r', 70, 46, 10, 42]], hand: [['c', 25, 95, 6], ['c', 75, 95, 6]], hip: [['r', 38, 86, 24, 13]],
  leg: [['r', 38, 100, 11, 58], ['r', 51, 100, 11, 58]], knee: [['c', 43.5, 130, 5.5], ['c', 56.5, 130, 5.5]], foot: [['r', 33, 159, 16, 8], ['r', 51, 159, 16, 8]],
};
const BODY_RE: Array<[RegExp, string]> = [
  [/eye|ojo|olho|face|cara|rosto|head|cabe/, 'head'], [/neck|cuello|pesco/, 'neck'], [/shoulder|hombro|ombro/, 'shoulder'],
  [/hand|mano|m[aã]o|finger|dedo|wrist|mu[nñ]eca|pulso/, 'hand'], [/arm|brazo|bra[cç]o|elbow|codo|cotovelo/, 'arm'],
  [/back|espalda|costas|lumbar|spine|column/, 'trunk'], [/hip|cadera|quadril|pelvi/, 'hip'], [/knee|rodilla|joelho/, 'knee'],
  [/leg|pierna|perna|thigh|muslo|coxa/, 'leg'], [/foot|feet|pie|ankle|tobillo|tornozelo|toe/, 'foot'], [/trunk|torso|chest|t[oó]rax|pecho|peito|abdom/, 'trunk'],
];
const zoneOf = (key: string): string | null => BODY_RE.find(([re]) => re.test(key.toLowerCase()))?.[1] ?? null;
export function BodyFigure({ model, selected, onSelect, t }: { model: HealthPanelModel; selected: string | null; onSelect(k: string | null): void; t: TFn }) {
  const top = Math.max(1, ...model.bodyParts.map((b) => b.cases));
  const fig = (view: 'front' | 'back') => (
    <figure className="body-fig">
      <svg viewBox="0 0 100 170" className="body" role="group" aria-label={t(view === 'front' ? 'ui.health.front' : 'ui.health.back')}>
        {Object.entries(BODY_SHAPES).map(([zk, shapes]) => {
          const parts = model.bodyParts.filter((b) => zoneOf(b.key) === zk && (b.view === 'both' || b.view === view));
          const n = parts.reduce((s, b) => s + b.cases, 0), first = parts[0];
          const on = parts.some((b) => b.key === selected), step = n > 0 ? Math.max(1, Math.ceil((n / top) * 5)) : 0;
          const toggle = () => { if (first) onSelect(on ? null : first.key); };
          const shapesEl = shapes.map((s, i) => (s[0] === 'c' ? <circle key={i} cx={s[1]} cy={s[2]} r={s[3]} /> : <rect key={i} x={s[1]} y={s[2]} width={s[3]} height={s[4]} rx={3} />));
          if (!first) return <g key={zk} className="bz" aria-hidden="true">{shapesEl}</g>;
          return (
            <g key={zk} className={`bz has r${step}${on ? ' on' : ''}`} {...tipProps([parts.map((b) => tx(t, b.label)).join(' / '), t('ui.health.cases', { n })])} role="button" aria-pressed={on}
              onClick={toggle} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}>{shapesEl}</g>
          );
        })}
      </svg>
      <figcaption>{t(view === 'front' ? 'ui.health.front' : 'ui.health.back')}</figcaption>
    </figure>
  );
  return (
    <div className="bodywrap">
      {fig('front')}{fig('back')}
      <ul className="body-list" aria-label={t('ui.health.bodyList')}>
        {[...model.bodyParts].sort((a, b) => b.cases - a.cases).map((b) => (
          <li key={b.key}><button type="button" className={`rowbtn${selected === b.key ? ' on' : ''}`} aria-pressed={selected === b.key} onClick={() => onSelect(selected === b.key ? null : b.key)}><span className="trunc">{tx(t, b.label)}</span><span className="num">{b.cases}</span></button></li>
        ))}
      </ul>
    </div>
  );
}
export function Pareto({ items, selected, onSelect, t, fmt }: { items: HealthPanelModel['mechanisms']; selected: string | null; onSelect(k: string | null): void; t: TFn; fmt: Formatters }) {
  const top = Math.max(1, ...items.map((m) => m.cases));
  return (
    <div className="pareto">
      <div className="pareto-h" aria-hidden="true"><span>{t('ui.col.mechanism')}</span><span>{t('ui.col.cases')}</span><span>{t('ui.col.cum')}</span></div>
      <ul>
        {items.map((m) => (
          <li key={m.key}>
            <button type="button" className={`pareto-r${selected === m.key ? ' on' : ''}`} aria-pressed={selected === m.key} onClick={() => onSelect(selected === m.key ? null : m.key)}
              aria-label={`${tx(t, m.label)}: ${t('ui.health.cases', { n: m.cases })}. ${t('ui.col.cum')}: ${fmt.pct(m.cumPct, 0)}`}>
              <span className="trunc" title={tx(t, m.label)}>{tx(t, m.label)}</span>
              <span className="pbar"><i style={{ width: `${(m.cases / top) * 100}%` }} /><b className="num">{m.cases}</b></span>
              <span className="pcum"><i style={{ width: `${Math.max(0, Math.min(100, m.cumPct))}%` }} /><b className="num">{fmt.pct(m.cumPct, 0)}</b></span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
export function Pyramid({ levels, t, fmt }: { levels: HealthPanelModel['pyramid']['levels']; t: TFn; fmt: Formatters }) {
  const top = Math.max(1, ...levels.map((l) => Math.max(l.consequence ?? 0, l.potential ?? 0)));
  const txt = (v: number | null) => (v == null ? t('ui.state.nd.short') : fmt.int(v));
  return (
    <div className="pyr">
      <div className="pyr-r pyr-h"><span>{t('ui.health.consequence')}</span><span>{t('ui.col.level')}</span><span>{t('ui.health.potential')}</span></div>
      {levels.map((l) => (
        <div className="pyr-r" key={l.level} {...tipProps([tx(t, l.label), `${t('ui.health.consequence')}: ${txt(l.consequence)}`, `${t('ui.health.potential')}: ${txt(l.potential)}`])}>
          <span className="pyr-c"><b className="num">{txt(l.consequence)}</b><i style={{ width: `${((l.consequence ?? 0) / top) * 100}%` }} /></span>
          <span className="pyr-m trunc">{tx(t, l.label)}</span>
          <span className="pyr-p"><i style={{ width: `${((l.potential ?? 0) / top) * 100}%` }} /><b className="num">{txt(l.potential)}</b></span>
        </div>
      ))}
    </div>
  );
}
