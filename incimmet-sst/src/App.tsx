import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, FlaskConical, Pause, Play, Upload, X } from 'lucide-react';
import { COUNTRIES } from './domain/types';
import type { SheetModel } from './domain/model';
import { getIngestApi } from './engineProvider';
import { exportCsv, exportPdf, exportPng, exportXlsx, fileBase } from './export';
import { actions, useI18n, useSheet, type SheetCtx } from './state/store';
import { Drawers } from './ui/drawers';
import { Footer } from './ui/Footer';
import { Header, type ExportKind } from './ui/Header';
import { KpiBand, hasValue } from './ui/KpiBand';
import { ActionsPanel, Boundary, HealthPanel, MapPanel, PlanPanel, RiskPanel, TrendPanel, useReducedMotion } from './ui/panels';
import { TipLayer, fmtKv, tx } from './ui/primitives';

/** Modo presentación: Región → País → Riesgo → Acción. Cualquier tecla o clic lo pausa; el contenido se lee sin animación. */
const TOUR = [{ key: 'region', zone: 'band' }, { key: 'country', zone: 'map' }, { key: 'risk', zone: 'risk' }, { key: 'action', zone: 'actions' }] as const;
function Tour({ model, step }: { model: SheetModel; step: number }) {
  const { t, fmt } = useI18n();
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(reduced);
  const i = ((step % TOUR.length) + TOUR.length) % TOUR.length, cur = TOUR[i];
  useEffect(() => {
    if (paused) return;
    const id = window.setTimeout(() => actions.setTour((i + 1) % TOUR.length), 8000);
    return () => window.clearTimeout(id);
  }, [i, paused]);
  useEffect(() => {
    const inside = (e: Event) => !!(e.target as Element | null)?.closest?.('.tour');
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') actions.setTour(null); else if (!inside(e)) setPaused(true); };
    const onDown = (e: PointerEvent) => { if (!inside(e)) setPaused(true); };
    window.addEventListener('keydown', onKey); window.addEventListener('pointerdown', onDown, true);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onDown, true); };
  }, []);
  const m = model, s0 = m.signals.signals[0], n0 = m.actions.nextSteps[0];
  const text = cur.key === 'region'
    ? t('ui.tour.regionText', { period: fmt.monthRange(m.meta.period.from, m.meta.period.to), hh: hasValue(m.context.hh) ? fmtKv(fmt, m.context.hh.value, 'hh', 0) : '—', n: m.signals.signals.length })
    : cur.key === 'country' ? m.map.countries.map((c) => `${t(`country.${c.code}`)}: ${c.value == null ? t('ui.state.nd.short') : fmt.num(c.value, m.map.decimals)} (${t(`ui.status.${c.status}`)})`).join(' · ')
    : cur.key === 'risk' ? (s0 ? `${t(`ui.prio.${s0.priority}`)}: ${tx(t, s0.title)}` : t('ui.signals.none'))
    : n0 ? `${tx(t, n0.text)} — ${tx(t, n0.ownerRole)}` : t('ui.actions.noSteps');
  const go = (k: number) => { setPaused(true); actions.setTour((k + TOUR.length) % TOUR.length); };
  return (
    <div className="tour" role="region" aria-label={t('ui.menu.present')}>
      <div className="tour-s">{TOUR.map((s, k) => <button key={s.key} type="button" className={k === i ? 'on' : undefined} aria-current={k === i ? 'step' : undefined} onClick={() => go(k)}>{t(`ui.tour.${s.key}`)}</button>)}</div>
      <p className="tour-t" aria-live="polite">{text}</p>
      <div className="tour-c">
        <button type="button" className="icon-btn" aria-label={t('ui.tour.prev')} title={t('ui.tour.prev')} onClick={() => go(i - 1)}><ChevronLeft size={16} aria-hidden="true" /></button>
        <button type="button" className="icon-btn" aria-label={t(paused ? 'ui.tour.play' : 'ui.tour.pause')} title={t(paused ? 'ui.tour.play' : 'ui.tour.pause')} onClick={() => setPaused(!paused)}>{paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}</button>
        <button type="button" className="icon-btn" aria-label={t('ui.tour.next')} title={t('ui.tour.next')} onClick={() => go(i + 1)}><ChevronRight size={16} aria-hidden="true" /></button>
        <button type="button" className="icon-btn" aria-label={t('ui.tour.exit')} title={t('ui.tour.exit')} onClick={() => actions.setTour(null)}><X size={16} aria-hidden="true" /></button>
      </div>
    </div>
  );
}

function Onboarding({ ctx }: { ctx: SheetCtx }) {
  const { t } = useI18n();
  return (
    <main id="main" className="main onboard" tabIndex={-1}>
      <div className="onboard-box">
        <h2>{t('ui.onboard.title')}</h2>
        <p>{t(ctx.app.dataMode === 'real' ? 'ui.onboard.noReal' : 'ui.onboard.text')}</p>
        <p className="hint">{t('ui.onboard.local')}</p>
        <div className="row">
          <button type="button" className="btn btn-accent" onClick={() => actions.open({ kind: 'import' })}><Upload size={15} aria-hidden="true" /><span>{t('ui.onboard.load')}</span></button>
          <button type="button" className="btn" onClick={() => actions.setDataMode('demo')}><FlaskConical size={15} aria-hidden="true" /><span>{t('ui.onboard.demo')}</span></button>
        </div>
      </div>
    </main>
  );
}

export default function App() {
  const ctx = useSheet();
  const { app, model, ds, engine } = ctx;
  const { t, fmt } = useI18n();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const [enter, setEnter] = useState(!reduced);
  useEffect(() => {
    if (!enter) return;
    const off = () => setEnter(false);
    const id = window.setTimeout(off, 600);
    window.addEventListener('pointerdown', off); window.addEventListener('keydown', off);
    return () => { window.clearTimeout(id); window.removeEventListener('pointerdown', off); window.removeEventListener('keydown', off); };
  }, [enter]);
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(null), 4500); return () => window.clearTimeout(id); }, [toast]);
  useEffect(() => { document.title = `INCIMMET | ${t('ui.title')}`; }, [t]);

  const onExport = async (kind: ExportKind) => {
    const node = sheetRef.current;
    if (!model || !ds || !node) return;
    const f = app.filters, name = fileBase(model.meta.isDemo, app.lang);
    const footer = [`INCIMMET | ${t('ui.title')}`, `${t('ui.export.meta.period')}: ${fmt.monthRange(f.from, f.to)}`, `${t('ui.export.meta.countries')}: ${(f.countries.length ? f.countries : COUNTRIES).join(' ')}`,
      f.projectIds.length ? `${t('ui.col.project')}: ${f.projectIds.map((id) => ctx.options.projects.find((p) => p.id === id)?.name ?? id).join(', ')}` : '', `${t('ui.export.meta.lang')}: ${app.lang.toUpperCase()}`,
      model.meta.cutoffMonth ? `${t('ui.export.meta.cutoff')}: ${fmt.month(model.meta.cutoffMonth)}` : '', `${t('ui.export.meta.units')}: ${t('ui.export.unitsNote')}`,
      `${t('ui.export.meta.methodology')}: ${engine.catalog()[0]?.version ?? '—'}`, model.meta.isDemo ? t('ui.demo.badge').toUpperCase() : ''].filter(Boolean).join(' · ');
    setBusy(kind);
    try {
      if (kind === 'png') await exportPng(node, name);
      else if (kind === 'pdf') await exportPdf(node, name, footer);
      else {
        const tables = engine.exportTables(ds, f, app.lang), api = getIngestApi();
        if (kind === 'csv') exportCsv(tables, name, app.lang);
        else if (api) exportXlsx(tables, name, api, t('ui.export.metaSheet'));
      }
      setToast(t('ui.export.done', { kind: kind.toUpperCase() }));
    } catch { setToast(t('ui.export.error')); } finally { setBusy(null); }
  };

  if (!app.booted) return <div className="boot" role="status">{t('ui.loading')}</div>;
  const zone = app.tour != null ? TOUR[((app.tour % TOUR.length) + TOUR.length) % TOUR.length].zone : undefined;
  return (
    <>
      <a className="skip" href="#main">{t('ui.skip')}</a>
      <div ref={sheetRef} className="sheet" data-ready="" data-tour={zone} data-enter={enter ? '' : undefined}>
        <Header ctx={ctx} onExport={(k) => { void onExport(k); }} busy={busy} />
        {model ? (
          <Boundary fallback={<main id="main" className="main onboard"><p className="note">{t('ui.error.render')}</p></main>}>
            <main id="main" className="main" tabIndex={-1}>
              <KpiBand model={model} />
              <div className="row-c"><MapPanel model={model} app={app} /><TrendPanel model={model} /><RiskPanel model={model} /></div>
              <div className="row-b"><PlanPanel model={model} /><HealthPanel model={model} app={app} /><ActionsPanel model={model} /></div>
            </main>
          </Boundary>
        ) : <Onboarding ctx={ctx} />}
        <Footer ctx={ctx} />
      </div>
      <Drawers ctx={ctx} />
      {app.tour != null && model ? <Tour model={model} step={app.tour} /> : null}
      <TipLayer />
      <div className="toast-wrap" role="status" aria-live="polite">{toast ? <div className="toast">{toast}</div> : null}</div>
    </>
  );
}
