import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import { CircleAlert, FlaskConical, Info, OctagonAlert, Power, TriangleAlert } from 'lucide-react';
import type { Priority } from '../domain/types';
import type { KpiValue, SheetModel } from '../domain/model';
import { actions, useI18n, type AppState } from '../state/store';
import { Bars, BodyFigure, HBar, Pareto, PlanHeatmap, ProjectsTable, Pyramid, RiskMatrix, TrendMultiples, cvar } from './charts';
import { hasValue } from './KpiBand';
import { ChartBox, Legend, Panel, Pending, PendingChip, StatusIcon, Tabs, fmtKv, tx } from './primitives';

const RegionMap = lazy(() => import('../map/RegionMap'));
const usable = (s: string) => s === 'available' || s === 'partial';
const openImport = () => actions.open({ kind: 'import' });

export function useReducedMotion(): boolean {
  const [r, setR] = useState(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia('(prefers-reduced-motion: reduce)'); const on = () => setR(mq.matches);
    mq.addEventListener('change', on); return () => mq.removeEventListener('change', on);
  }, []);
  return r;
}
export class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
export function MiniStat({ label, k }: { label: string; k: KpiValue }) {
  const { t, fmt } = useI18n();
  const has = hasValue(k);
  return (
    <button type="button" className="mini" onClick={() => actions.open({ kind: 'kpi', id: k.id })} title={has ? undefined : tx(t, k.reason)}>
      <span className="mini-l trunc">{label}</span>
      <span className="mini-v"><b className="num">{has ? fmtKv(fmt, k.value, k.unit, k.decimals) : t(`ui.state.${k.state}.short`)}</b>
        {has && k.status !== 'neutral' ? <><StatusIcon level={k.status} size={12} /><span className="sr">{t(`ui.status.${k.status}`)}</span></> : null}</span>
    </button>
  );
}

export function MapPanel({ model, app }: { model: SheetModel; app: AppState }) {
  const { t, fmt, lang } = useI18n();
  const reduced = useReducedMotion(), f = app.filters;
  const list = <ul className="plain pad">{model.map.countries.map((c) => <li key={c.code}>{t(`country.${c.code}`)}: {fmt.num(c.value, model.map.decimals)} · {t(`ui.status.${c.status}`)}</li>)}</ul>;
  return (
    <Panel zone="map" title={t('ui.map.title')}>
      <div className="mapbox">
        <Boundary fallback={<div><p className="note pad">{t('ui.map.error')}</p>{list}</div>}>
          <Suspense fallback={<p className="muted pad">{t('ui.loading')}</p>}>
            <RegionMap model={model.map} lang={lang} theme={app.theme} mode={app.mapMode} reducedMotion={reduced} t={t} fmt={fmt}
              onModeChange={actions.setMapMode} onLayerChange={(l) => actions.setPrefs({ mapLayer: l })} onOpenProject={(id) => actions.open({ kind: 'project', id })}
              onSelectCountry={(c) => actions.setFilters({ countries: c == null || (f.countries.length === 1 && f.countries[0] === c) ? [] : [c], projectIds: [] })}
              onSelectProject={(id) => actions.setFilters({ projectIds: id == null || (f.projectIds.length === 1 && f.projectIds[0] === id) ? [] : [id] })} />
          </Suspense>
        </Boundary>
      </div>
    </Panel>
  );
}

export function TrendPanel({ model }: { model: SheetModel }) {
  const { t, fmt } = useI18n();
  const [tab, setTab] = useState<'trend' | 'projects'>('trend');
  return (
    <Panel zone="trend" title={t('ui.trend.title')} tools={<Tabs<'trend' | 'projects'> label={t('ui.trend.title')} value={tab} onChange={setTab} tabs={[{ key: 'trend', label: t('ui.trend.tab') }, { key: 'projects', label: t('ui.proj.tab') }]} />}>
      {tab === 'trend'
        ? <TrendMultiples model={model.trend} t={t} fmt={fmt} onRange={actions.setRange} />
        : <div className="stack"><ProjectsTable rows={model.projects} t={t} fmt={fmt} onOpen={(id) => actions.open({ kind: 'project', id })} /><p className="hint">{t('ui.proj.note')}</p></div>}
    </Panel>
  );
}

const PRIO_ICON: Record<Priority, typeof Info> = { critical: OctagonAlert, high: TriangleAlert, medium: CircleAlert, low: Info };
export function Prio({ p }: { p: Priority }) {
  const { t } = useI18n(); const I = PRIO_ICON[p];
  return <span className={`prio prio-${p}`}><I size={13} aria-hidden="true" /><span>{t(`ui.prio.${p}`)}</span></span>;
}
export function RiskPanel({ model }: { model: SheetModel }) {
  const { t, fmt } = useI18n();
  const r = model.risk, s = model.signals, g = s.predictive;
  const due = (n: number | null) => (n == null ? t('ui.signals.noDue') : `${t('ui.signal.due')}: ${t('ui.signals.due', { n })}`);
  type Sig = SheetModel['signals']['signals'][number];
  const evOf = (x: Sig) => (x.evidence[0] ? tx(t, x.evidence[0].text) : tx(t, x.whatChanged));
  const metaOf = (x: Sig) => `${t('ui.signals.owner')}: ${tx(t, x.ownerRole)} · ${due(x.dueInDays)} · ${t('ui.signals.rec')}: ${tx(t, x.recommendation)}`;
  return (
    <Panel zone="risk" title={t('ui.risk.title')} chip={<PendingChip av={r.availability} t={t} />}>
      <div className="risk">
        {usable(r.availability.state)
          ? <div className="risk-mx"><RiskMatrix model={r} t={t} fmt={fmt} onCell={(c) => actions.open({ kind: 'risk', risk: c.risk, projectId: c.projectId })} /></div>
          : <Pending av={r.availability} t={t} onImport={openImport} compact />}
        <h3 className="sub"><span>{t('ui.signals.title')}</span><span className="muted">{t('ui.signals.count', { n: s.signals.length })}</span></h3>
        {s.signals.length ? (
          <ul className="signals">
            {s.signals.map((sig) => (
              <li key={sig.id}>
                <button type="button" className="signal" onClick={() => actions.open({ kind: 'signal', id: sig.id })}>
                  <span className="signal-h"><Prio p={sig.priority} /><span className="signal-t">{tx(t, sig.title)}</span></span>
                  <span className="signal-m trunc" title={evOf(sig)}>{evOf(sig)}</span>
                  <span className="signal-m trunc muted" title={metaOf(sig)}>{metaOf(sig)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="muted pad">{t('ui.signals.none')}</p>}
        <button type="button" className="gate" onClick={() => actions.open({ kind: 'signal', id: '__gate' })} title={g.reasons.map((x) => tx(t, x)).join(' · ')}>
          {g.enabled ? <FlaskConical size={13} aria-hidden="true" /> : <Power size={13} aria-hidden="true" />}
          <b>{t(g.enabled ? (g.isSimulation ? 'ui.gate.sim' : 'ui.gate.on') : 'ui.gate.off')}</b>
          <span className="trunc">{g.reasons[0] ? tx(t, g.reasons[0]) : ''}{g.reasons.length > 1 ? ` (+${g.reasons.length - 1})` : ''}</span>
        </button>
      </div>
    </Panel>
  );
}

export function PlanPanel({ model }: { model: SheetModel }) {
  const { t, fmt } = useI18n();
  const p = model.plan, ok = usable(p.availability.state);
  const [sel, setSel] = useState<'plan' | 'training' | null>(null);
  const tab = sel ?? (ok ? 'plan' : 'training');
  const tr = p.training;
  const txt = (k: KpiValue) => (hasValue(k) ? fmtKv(fmt, k.value, k.unit, k.decimals) : t(`ui.state.${k.state}.short`));
  return (
    <Panel zone="plan" title={t('ui.plan.title')} chip={ok ? null : <span className="chip chip-nodata">{t('ui.plan.pendingChip')}</span>}
      tools={<Tabs<'plan' | 'training'> label={t('ui.plan.title')} value={tab} onChange={setSel} tabs={[{ key: 'plan', label: t('ui.plan.tab') }, { key: 'training', label: t('ui.plan.training') }]} />}>
      {tab === 'plan' ? (ok ? (
        <div className="plan">
          <div className="plan-hm">
            <PlanHeatmap model={p} t={t} fmt={fmt} />
            <div className="hm-legend"><span className="muted">{t('ui.plan.legend')}</span>{['<50', '50', '70', '85', '95+'].map((l, i) => <span key={l} className={`hm-c r${i + 1}`}>{l}</span>)}<span className="hm-c r3 hm-late">{t('ui.plan.lateShort')}</span><span className="hm-fut">{t('ui.plan.futureShort')}</span></div>
          </div>
          <div className="plan-bars">
            <HBar label={t('ui.plan.toDate')} value={p.toDate.value} text={txt(p.toDate)} tip={[t('ui.plan.toDate'), t('ui.plan.toDate.def'), `${p.toDate.numerator ?? '—'}/${p.toDate.denominator ?? '—'}`]} />
            <HBar label={t('ui.plan.annual')} value={p.annual.value} text={txt(p.annual)} hollow tip={[t('ui.plan.annual'), t('ui.plan.annual.def'), `${p.annual.numerator ?? '—'}/${p.annual.denominator ?? '—'}`]} />
          </div>
        </div>
      ) : <Pending av={p.availability} t={t} onImport={openImport} />) : (usable(tr.availability.state) ? (
        <div className="split">
          <div className="minis"><MiniStat label={t('ui.plan.trainHours')} k={tr.hours} /><MiniStat label={t('ui.plan.trainIntensity')} k={tr.intensity} /></div>
          <ChartBox className="grow" title={`${t('ui.plan.trainMonthly')} · ${fmt.unit('hours')}`} t={t} table={{ cols: [t('ui.col.month'), t('ui.plan.trainHours')], rows: tr.monthly.map((m) => [fmt.month(m.month), m.value == null ? null : fmt.int(m.value)]) }}>
            <Bars fmt={fmt} series={[{ label: t('ui.plan.trainHours'), color: cvar('seq-3') }]} data={tr.monthly.map((m) => ({ label: fmt.month(m.month).slice(0, 3), values: [m.value] }))} />
          </ChartBox>
        </div>
      ) : <Pending av={tr.availability} t={t} onImport={openImport} />)}
    </Panel>
  );
}

export function HealthPanel({ model, app }: { model: SheetModel; app: AppState }) {
  const { t, fmt } = useI18n();
  const h = model.health, ok = usable(h.injuries.state);
  const [sel, setSel] = useState<'injuries' | 'pyramid' | null>(null);
  const tab = sel ?? (ok ? 'injuries' : 'pyramid');
  return (
    <Panel zone="health" title={t('ui.health.title')} chip={ok ? null : <PendingChip av={h.injuries} t={t} />}
      tools={<Tabs<'injuries' | 'pyramid'> label={t('ui.health.title')} value={tab} onChange={setSel} tabs={[{ key: 'injuries', label: t('ui.health.tab') }, { key: 'pyramid', label: t('ui.health.pyramid') }]} />}>
      {tab === 'injuries' ? (ok ? (
        <div className="health">
          <div className="health-l">
            <BodyFigure model={h} selected={app.filters.bodyPart} onSelect={(k) => actions.setFilters({ bodyPart: k })} t={t} />
            <p className="hint">{t('ui.health.multiZone', { cases: h.totalCases, multi: h.multiZoneCases })}{h.denominatorNote ? ` ${tx(t, h.denominatorNote)}` : ''}</p>
          </div>
          <Pareto items={h.mechanisms} selected={app.filters.mechanism} onSelect={(k) => actions.setFilters({ mechanism: k })} t={t} fmt={fmt} />
        </div>
      ) : <Pending av={h.injuries} t={t} onImport={openImport} />) : (usable(h.pyramid.availability.state) ? (
        <div className="split">
          <div className="grow"><Pyramid levels={h.pyramid.levels} t={t} fmt={fmt} /><p className="hint">{h.pyramid.notes.map((n) => tx(t, n)).join(' ')}</p></div>
          <div className="minis"><MiniStat label={t('ui.health.lostDays')} k={h.lostDays} /><MiniStat label={t('ui.health.surveillance')} k={h.surveillance} /><MiniStat label={t('ui.health.hygiene')} k={h.hygieneOverLimit} /></div>
        </div>
      ) : <Pending av={h.pyramid.availability} t={t} onImport={openImport} />)}
    </Panel>
  );
}

export function ActionsPanel({ model }: { model: SheetModel }) {
  const { t, fmt } = useI18n();
  const a = model.actions, ok = usable(a.availability.state);
  const series = [{ label: t('ui.actions.byAge'), color: cvar('seq-3') }, { label: t('ui.actions.byDelay'), color: cvar('seq-5') }];
  const due = (n: number | null) => (n == null ? t('ui.signals.noDue') : `${t('ui.signal.due')}: ${t('ui.signals.due', { n })}`);
  const delay = t('ui.actions.delay', { median: a.delay.median ?? '—', p90: a.delay.p90 ?? '—' });
  return (
    <Panel zone="actions" title={t('ui.actions.title')} chip={<PendingChip av={a.availability} t={t} />}>
      <div className="acts">
        <div className="acts-l">
          {ok ? (
            <>
              <ChartBox className="grow" title={`${t('ui.actions.aging')} · ${t('ui.actions.days')}`} t={t} legend={<Legend items={series.map((s) => ({ ...s, kind: 'bar' as const }))} />}
                table={{ cols: [t('ui.actions.bucket'), series[0].label, series[1].label], rows: a.aging.map((b) => [b.bucket, b.openByAge, b.overdueByDelay]) }}>
                <Bars fmt={fmt} series={series} data={a.aging.map((b) => ({ label: b.bucket, values: [b.openByAge, b.overdueByDelay] }))} />
              </ChartBox>
              <p className="hint trunc" title={delay}>{delay}</p>
            </>
          ) : <Pending av={a.availability} t={t} onImport={openImport} compact />}
        </div>
        <div className="acts-r">
          {ok ? (
            <div className="minis-grid">
              <MiniStat label={t('ui.actions.overdueCritical')} k={a.overdueCritical} /><MiniStat label={t('ui.actions.overdueTotal')} k={a.overdueTotal} />
              <MiniStat label={t('ui.actions.closure')} k={a.closure} /><MiniStat label={t('ui.actions.onTime')} k={a.onTime} />
            </div>
          ) : null}
          <h3 className="sub"><span>{t('ui.actions.next')}</span></h3>
          {a.nextSteps.length ? (
            <ol className="steps">
              {a.nextSteps.map((s) => (
                <li key={s.id}>
                  <span className="step-t">{tx(t, s.text)}</span>
                  {s.evidence ? <span className="signal-m">{tx(t, s.evidence)}</span> : null}
                  <span className="signal-m muted">{t(`ui.steps.src.${s.source}`)} · {tx(t, s.ownerRole)} · {due(s.dueInDays)}</span>
                </li>
              ))}
            </ol>
          ) : <p className="muted">{t('ui.actions.noSteps')}</p>}
        </div>
      </div>
    </Panel>
  );
}
