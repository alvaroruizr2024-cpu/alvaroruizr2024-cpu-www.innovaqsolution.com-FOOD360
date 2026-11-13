import type { KeyboardEvent } from 'react';
import { CircleAlert, Diff, FlaskConical, Info, Layers, ShieldAlert, TriangleAlert } from 'lucide-react';
import type { KpiValue, SheetModel } from '../domain/model';
import type { Formatters, TFn } from '../i18n/core';
import { actions, useI18n } from '../state/store';
import { Sparkline } from './charts';
import { StatusChip, fmtKv, kpiText, tx, valueParts } from './primitives';

const FLAGS: Array<[string, typeof CircleAlert]> = [['active_critical_failure', ShieldAlert], ['small_exposure', CircleAlert], ['mixed_definitions', Layers], ['recalculated_differs', Diff], ['simulation', FlaskConical]];
export const hasValue = (k: KpiValue): boolean => (k.state === 'ok' || k.state === 'zero') && k.value != null;

/** Comparación con signo; p. p. para porcentajes; nota cuando la base es cero o la cobertura no es equivalente. */
export function compareText(k: KpiValue, t: TFn, fmt: Formatters): string {
  const c = k.compare;
  if (!c || c.mode === 'none') return t('ui.cmp.none');
  const label = t(`ui.cmp.${c.mode}.short`);
  if (c.abs == null) return `${label}: ${t('ui.state.nd.short')}`;
  const delta = k.unit === 'pct' ? `${fmt.signed(c.pp ?? c.abs, 1)} ${fmt.unit('pp')}` : fmt.signed(c.abs, k.decimals);
  const rel = k.unit !== 'pct' && c.pct != null ? ` (${fmt.signed(c.pct, 0)}%)` : '';
  const note = c.note ? ` · ${tx(t, c.note)}` : !c.coverageEquivalent ? ` · ${t('ui.cmp.coverage')}` : '';
  return `${delta}${rel} ${label}${note}`;
}
export function targetText(k: KpiValue, t: TFn, fmt: Formatters): string {
  if (!k.target) return '';
  const sym = k.direction === 'up' ? '≥ ' : k.direction === 'down' ? '≤ ' : '', v = k.target.value, d = Number.isInteger(v) ? 0 : Number.isInteger(Math.round(v * 1e6) / 1e5) ? 1 : Math.max(1, k.decimals);
  return `${t('ui.kpi.target')} ${sym}${k.unit === 'pct' ? fmt.pct(v, d) : fmt.num(v, d)}`;
}

function Card({ k }: { k: KpiValue }) {
  const { t, fmt, lang } = useI18n();
  const name = kpiText(lang, t, k.id, 'short'), has = hasValue(k), p = valueParts(fmt, k.value, k.unit, k.decimals);
  const line = has ? (k.state === 'zero' ? `${t('ui.state.zero')} · ${compareText(k, t, fmt)}` : compareText(k, t, fmt)) : tx(t, k.reason) || t(`ui.state.${k.state}`);
  const target = targetText(k, t, fmt);
  const open = () => actions.open({ kind: 'kpi', id: k.id });
  const aria = `${k.id} ${name}: ${has ? fmtKv(fmt, k.value, k.unit, k.decimals) : t(`ui.state.${k.state}`)}. ${t(`ui.status.${k.status}`)}. ${line}`;
  return (
    <div className={`card stb-${k.status}`} role="button" tabIndex={0} aria-label={aria} onClick={open} onKeyDown={(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}>
      <div className="card-h">
        <span className="mono code">{k.id}</span><span className="card-n trunc" title={name}>{name}</span>
        <span className="card-f">{FLAGS.map(([f, I]) => (k.flags.includes(f) ? <span key={f} className={`fl fl-${f}`} title={t(`ui.flag.${f}`)}><I size={12} aria-hidden="true" /></span> : null))}</span>
      </div>
      {has
        ? <div className="card-v"><b className="val">{p.text}</b><span className="unit trunc" title={p.unit}>{p.unit}</span></div>
        : <div className="card-v"><b className="val val-s">{t(`ui.state.${k.state}.short`)}</b></div>}
      <div className="card-c trunc" title={line}>{line}</div>
      <Sparkline points={k.spark} label={t('ui.kpi.sparkAria', { name })} />
      <div className="card-s"><StatusChip level={k.status} t={t} note={tx(t, k.statusNote)} />{target ? <span className="card-t trunc" title={target}>{target}</span> : null}</div>
    </div>
  );
}

function Context({ model }: { model: SheetModel }) {
  const { t, fmt } = useI18n();
  const row = (k: KpiValue, label: string) => {
    const p = valueParts(fmt, k.value, k.unit, k.decimals), has = hasValue(k);
    return (
      <button type="button" className="ctx-r" onClick={() => actions.open({ kind: 'kpi', id: k.id })} title={has ? undefined : tx(t, k.reason)}>
        <span className="ctx-l trunc">{label}</span>
        <span className="ctx-v"><b className="val val-m">{has ? p.text : t(`ui.state.${k.state}.short`)}</b>{has ? <span className="unit">{p.unit}</span> : null}</span>
      </button>
    );
  };
  return (
    <div className="ctx" role="group" aria-label={t('ui.ctx.title')}>
      {row(model.context.hh, t('ui.ctx.hh'))}{row(model.context.workers, t('ui.ctx.workers'))}
      <div className="card-c trunc">{fmt.monthRange(model.meta.period.from, model.meta.period.to)}</div>
    </div>
  );
}

export function KpiBand({ model }: { model: SheetModel }) {
  const { t } = useI18n();
  const banners = model.meta.banners;
  return (
    <section className="band" data-zone="band" aria-label={t('ui.band.aria')}>
      {banners.length ? (
        <div className="banners" role="status">
          {banners.map((b, i) => <span key={i} className={`banner banner-${b.level}`}>{b.level === 'warn' ? <TriangleAlert size={13} aria-hidden="true" /> : <Info size={13} aria-hidden="true" />}<span className="sr">{t(`ui.banner.${b.level}`)}: </span><span>{tx(t, b.text)}</span></span>)}
        </div>
      ) : null}
      <div className="band-cards"><Context model={model} />{model.cards.map((k, i) => <Card key={`${i}-${k.id}`} k={k} />)}</div>
    </section>
  );
}
