import { BookOpen, CircleCheck, CircleDashed, Clock, Database, OctagonAlert, Scale, X } from 'lucide-react';
import type { Filters, SourceStatus } from '../domain/model';
import { actions, useI18n, type SheetCtx } from '../state/store';
import { hasValue } from './KpiBand';
import { REC_DIMS } from './Header';
import { fmtKv, tx } from './primitives';

const SRC_ICON: Record<SourceStatus['state'], typeof Clock> = { loaded: CircleCheck, stale: Clock, missing: CircleDashed, error: OctagonAlert };
export function Footer({ ctx }: { ctx: SheetCtx }) {
  const { app, model, options } = ctx;
  const { t, fmt } = useI18n();
  const f = app.filters;
  const chips: Array<{ key: string; label: string; remove(): void }> = [];
  f.countries.forEach((c) => chips.push({ key: `c-${c}`, label: t(`country.${c}`), remove: () => actions.setFilters({ countries: f.countries.filter((x) => x !== c) }) }));
  f.projectIds.forEach((id) => chips.push({ key: `p-${id}`, label: options.projects.find((p) => p.id === id)?.name ?? id, remove: () => actions.setFilters({ projectIds: f.projectIds.filter((x) => x !== id) }) }));
  REC_DIMS.forEach(([dim, k]) => f[k].forEach((v) => chips.push({ key: `${k}-${v}`, label: `${t(`ui.filter.${dim}`)}: ${v}`, remove: () => actions.setFilters({ [k]: f[k].filter((x) => x !== v) } as Partial<Filters>) })));
  if (f.bodyPart) { const b = model?.health.bodyParts.find((x) => x.key === f.bodyPart); chips.push({ key: 'body', label: `${t('ui.filter.bodyPart')}: ${b ? tx(t, b.label) : f.bodyPart}`, remove: () => actions.setFilters({ bodyPart: null }) }); }
  if (f.mechanism) { const m = model?.health.mechanisms.find((x) => x.key === f.mechanism); chips.push({ key: 'mech', label: `${t('ui.filter.mechanism')}: ${m ? tx(t, m.label) : f.mechanism}`, remove: () => actions.setFilters({ mechanism: null }) }); }
  if (f.periodMode === 'custom') chips.push({ key: 'period', label: `${t('ui.period.custom')}: ${fmt.monthRange(f.from, f.to)}`, remove: () => actions.setPeriod('ytd', f.to) });
  const q = model?.quality;
  return (
    <footer className="ftr">
      <div className="ftr-chips" role="group" aria-label={t('ui.footer.filters')}>
        <span className="ftr-l">{t('ui.footer.filters')}:</span>
        {chips.length ? chips.map((c) => (
          <button key={c.key} type="button" className="fchip" onClick={c.remove} title={t('ui.footer.remove', { name: c.label })} aria-label={t('ui.footer.remove', { name: c.label })}><span>{c.label}</span><X size={12} aria-hidden="true" /></button>
        )) : <span className="muted">{t('ui.footer.noFilters')}</span>}
      </div>
      {model && q ? (
        <button type="button" className="ftr-btn ftr-q" onClick={() => actions.open({ kind: 'recon' })} title={t('ui.footer.openRecon')}>
          <Scale size={13} aria-hidden="true" />
          <span>{t('ui.footer.coverage')} <span className="mono">Q02</span> <b className="num">{hasValue(q.exposureCoverage) ? fmtKv(fmt, q.exposureCoverage.value, q.exposureCoverage.unit, 1) : t(`ui.state.${q.exposureCoverage.state}.short`)}</b>
            {' · '}{t('ui.footer.recon', { material: q.recon.material, minor: q.recon.minor, info: q.recon.info })}</span>
        </button>
      ) : null}
      <button type="button" className="ftr-btn ftr-m" onClick={() => actions.open({ kind: 'method' })}><BookOpen size={13} aria-hidden="true" /><span>{t('ui.footer.method')}</span></button>
      {model ? (
        <ul className="ftr-src" aria-label={t('ui.footer.sources')}>
          {model.meta.sources.map((s) => {
            const I = SRC_ICON[s.state];
            return (
              <li key={s.key} title={[s.file, tx(t, s.note)].filter(Boolean).join(' — ')}>
                <I size={12} className={`src-${s.state}`} aria-hidden="true" />
                <span>{s.country ?? s.key.toUpperCase()}: {t(`ui.src.${s.state}`)}{s.lastDataMonth ? ` · ${fmt.month(s.lastDataMonth)}` : ''}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
      <span className="ftr-ds trunc"><Database size={12} aria-hidden="true" /><span>{t(`ui.footer.kind.${model?.meta.datasetKind ?? 'none'}`)}{model?.meta.datasetKind === 'real' && model.meta.datasetLabel ? `: ${model.meta.datasetLabel}` : ''}</span></span>
    </footer>
  );
}
