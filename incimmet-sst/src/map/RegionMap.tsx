import { Component, Suspense, lazy, useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { CountryCode } from '../domain/types';
import type { MapLayer, RegionMapProps } from '../domain/model';
import '../i18n/map';
import './map.css';
import { useGeo } from './geo';
import Map2D from './Map2D';
import MapList from './MapList';
import { Glyph, KINDS, KIND_TONE, MarkerDot, R_MAX, countryView, markerView, norm, type StageProps, type Unlocated } from './shared';

/** El globo 3D (three.js) viaja en un fragmento diferido; el mapa 2D lo sustituye mientras carga o si no hay WebGL. */
const Globe3D = lazy(() => import('./Globe3D'));

interface Tip { key: string; x: number; top: number; bottom: number; w: number; h: number }

class GlobeBoundary extends Component<{ onError(): void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch { return false; }
}
function tipStyle(tip: Tip): CSSProperties {
  const half = 122;
  const left = Math.min(Math.max(tip.x, half), Math.max(half, tip.w - half));
  return tip.top > 112 ? { left, bottom: tip.h - tip.top + 6 } : { left, top: tip.bottom + 6 };
}

/** Mapa regional (Perú, Colombia, Brasil): globo 3D, mapa 2D y lista accesible equivalentes, con barra, leyenda y búsqueda. */
export default function RegionMap(props: RegionMapProps) {
  const { lang, theme, mode, reducedMotion, t, fmt, onModeChange, onSelectCountry, onSelectProject, onOpenProject, onLayerChange } = props;
  // El mapa se actualiza con prioridad baja: las cifras de la lámina se pintan primero y el globo las sigue (respuesta de filtros).
  const model = useDeferredValue(props.model);
  const { geo, error } = useGeo();
  const [query, setQuery] = useState('');
  const [tip, setTip] = useState<Tip | null>(null);
  const [failed3d, setFailed3d] = useState(false);
  const webgl = useMemo(hasWebGL, []);
  const stageRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const ctx = useMemo(() => ({ model, t, fmt }), [model, t, fmt]);

  const q = norm(query);
  const matches = useCallback((p: { name: string; country: CountryCode }) => !q || norm(p.name).includes(q) || norm(t(`country.${p.country}`)).includes(q) || p.country.toLowerCase() === q, [q, t]);
  const markers = useMemo(() => model.markers.filter(matches), [model.markers, matches]);
  const unlocated = useMemo(() => model.unlocated.filter(matches), [model.unlocated, matches]);
  const total = model.markers.length + model.unlocated.length;
  const selCountry = model.countries.find((c) => c.selected) ?? null;
  const selProject: Unlocated | null = model.markers.find((m) => m.selected) ?? model.unlocated.find((u) => u.selected) ?? null;

  const onCountry = useCallback((code: CountryCode) => { onSelectCountry(model.countries.find((c) => c.code === code)?.selected ? null : code); }, [model.countries, onSelectCountry]);
  const onProject = useCallback((p: Unlocated) => { if (p.selected) onOpenProject(p.projectId); else onSelectProject(p.projectId); }, [onOpenProject, onSelectProject]);
  const hasProject = selProject != null;
  const hasCountry = selCountry != null;
  const onClear = useCallback(() => { if (hasProject) onSelectProject(null); else if (hasCountry) onSelectCountry(null); }, [hasProject, hasCountry, onSelectProject, onSelectCountry]);
  const onTip = useCallback((key: string | null) => {
    const stage = stageRef.current;
    const el = key && stage ? stage.querySelector<HTMLElement>(`[data-rm-key="${CSS.escape(key)}"]`) : null;
    if (!key || !stage || !el) { setTip(null); return; }
    const s = stage.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setTip({ key, x: r.left + r.width / 2 - s.left, top: r.top - s.top, bottom: r.bottom - s.top, w: s.width, h: s.height });
  }, []);

  const use3d = mode === '3d' && webgl && !failed3d;
  useEffect(() => { setTip(null); }, [mode, use3d, model.layer]);

  const indKey = `kpi.${model.indicatorId}.short`;
  const indName = t(indKey);
  const indicator = indName === indKey ? model.indicatorId : indName;
  const unitLabel = model.unit === 'none' ? '' : fmt.unit(model.unit);
  const sizeMax = Math.max(model.sizeDomain[1], 0);
  const pending = model.layers.filter((l) => l.availability.state === 'pending' || l.availability.state === 'disabled');
  const anyDemo = model.markers.some((m) => m.isDemo) || model.unlocated.some((u) => u.isDemo);

  const tipView = useMemo(() => {
    if (!tip) return null;
    if (tip.key.startsWith('c:')) {
      const c = model.countries.find((x) => `c:${x.code}` === tip.key);
      if (!c) return null;
      const v = countryView(c, ctx);
      return { v, lines: [t('map.tip.projects', { active: c.activeProjects, n: c.projects }), `${t('map.tip.exposure')}: ${v.size}`, c.reason ? t(c.reason.key, c.reason.params) : ''], hint: t(c.selected ? 'map.hint.countrySel' : 'map.hint.country') };
    }
    const m = model.markers.find((x) => `m:${x.projectId}` === tip.key);
    if (!m) return null;
    const v = markerView(m, ctx);
    return { v, lines: [t(`country.${m.country}`), `${t('map.tip.exposure')}: ${v.size}`, m.isDemo ? t('map.list.loc.demo') : ''], hint: t(m.selected ? 'map.hint.projectSel' : 'map.hint.project') };
  }, [tip, model, ctx, t]);

  const stage: StageProps | null = geo ? { geo, model, markers, theme, reducedMotion, t, fmt, onCountry, onMarker: onProject, onClear, onTip } : null;
  const selName = selProject ? selProject.name : selCountry ? t(`country.${selCountry.code}`) : '';

  return (
    <section className={`rm${reducedMotion ? ' is-still' : ''}`} aria-label={t('map.title')} lang={lang === 'pt' ? 'pt-BR' : lang}>
      <div className="rm-toolbar">
        <div className="rm-seg" role="group" aria-label={t('map.mode.label')}>
          {(['3d', '2d', 'list'] as const).map((m) => (
            <button key={m} type="button" className={mode === m ? 'is-on' : undefined} aria-pressed={mode === m} title={t(`map.mode.${m}.title`)} onClick={() => onModeChange(m)}>{t(`map.mode.${m}`)}</button>
          ))}
        </div>
        <label className="rm-field" htmlFor={`${uid}-layer`}>{t('map.layer.label')}</label>
        <select id={`${uid}-layer`} className="rm-select" value={model.layer} aria-describedby={pending.length ? `${uid}-pending` : undefined} onChange={(e) => onLayerChange(e.target.value as MapLayer)}>
          {model.layers.map((l) => {
            const off = l.availability.state === 'pending' || l.availability.state === 'disabled';
            const name = t(`map.layer.${l.key}`);
            return (
              <option key={l.key} value={l.key} disabled={off && l.key !== model.layer}>
                {off ? `${name} — ${t(l.availability.reasonKey)}` : l.availability.state === 'partial' ? `${name} (${t('map.layer.partial')})` : name}
              </option>
            );
          })}
        </select>
        <div className="rm-search">
          <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M10.6 10.6l3.4 3.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          <input type="search" value={query} placeholder={t('map.search.placeholder')} aria-label={t('map.search.label')} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <span className="rm-count" role="status">{q ? t('map.search.count', { n: markers.length + unlocated.length, total }) : ''}</span>
        {selName && <button type="button" className="rm-btn rm-clear" aria-label={`${t('map.selection.clear')}: ${selName}`} title={t('map.selection.clear')} onClick={onClear}><span aria-hidden="true">✕ </span>{selName}</button>}
      </div>

      <div className={`rm-body${mode === 'list' ? ' is-list' : ''}`}>
        <div className={`rm-stage is-${mode === 'list' ? 'list' : use3d ? '3d' : '2d'}`} ref={stageRef}>
          {mode === 'list' ? (
            <MapList model={model} markers={markers} unlocated={unlocated} query={query} indicator={indicator} t={t} fmt={fmt} onCountry={onCountry} onProject={onProject} onOpen={onOpenProject} />
          ) : error ? (
            <p className="rm-wait" role="alert">{t('map.notice.geoError')}</p>
          ) : !stage ? (
            <p className="rm-wait" role="status">{t('map.notice.geoLoading')}</p>
          ) : use3d ? (
            <GlobeBoundary onError={() => setFailed3d(true)}>
              <Suspense fallback={<Map2D {...stage} />}><Globe3D {...stage} /></Suspense>
            </GlobeBoundary>
          ) : (
            <Map2D {...stage} />
          )}
          {mode === '3d' && !use3d && stage && <p className="rm-notice" role="status">{t(webgl ? 'map.notice.chunkFailed' : 'map.notice.noWebgl')}</p>}
          {mode !== 'list' && stage && model.markers.length > 0 && (
            <div className="rm-sizekey rm-tone-neutral">
              <span>{t('map.legend.size', { unit: fmt.unit(model.sizeUnit) })}</span>
              <span aria-hidden="true"><MarkerDot kind="neutral" d={R_MAX} />{fmt.compact(sizeMax / 4, 1)}</span>
              <span aria-hidden="true"><MarkerDot kind="neutral" d={R_MAX * 2} />{fmt.compact(sizeMax, 1)}</span>
            </div>
          )}
          {tip && tipView && (
            <div className={`rm-tip rm-tone-${tipView.v.tone}`} style={tipStyle(tip)} aria-hidden="true">
              <b>{tipView.v.name}</b>
              <span className="rm-tip-row"><Glyph kind={tipView.v.kind} size={12} />{tipView.v.status}{tipView.v.hasValue ? ` · ${tipView.v.value}` : ''}</span>
              {tipView.lines.filter(Boolean).map((line) => <span key={line} className="rm-tip-dim">{line}</span>)}
              <span className="rm-tip-hint">{tipView.hint}</span>
            </div>
          )}
        </div>

        {mode !== 'list' && (
          <aside className="rm-rail">
            <section className="rm-card rm-legend" aria-label={t('map.legend.title')}>
              <div><span className="rm-legend-ind">{indicator}</span>{indicator !== model.indicatorId && <span className="rm-legend-id">{model.indicatorId}</span>}</div>
              <p className="rm-legend-meta">{[unitLabel, fmt.monthRange(model.period.from, model.period.to)].filter(Boolean).join(' · ')}</p>
              <ul className="rm-keys">
                {KINDS.map((k) => <li key={k} className={`rm-tone-${KIND_TONE[k]}`}><Glyph kind={k} size={13} /><span>{t(`map.status.${k}`)}</span></li>)}
              </ul>
              <p className="rm-p">{t(model.statusDefinition.key, model.statusDefinition.params)}</p>
              {model.markers.length > 0 && <p className="rm-p">{t('map.legend.size', { unit: fmt.unit(model.sizeUnit) })}. {t('map.legend.sameScale', { max: fmt.compact(sizeMax, 1) })}</p>}
              {model.note && <p className="rm-p">{t(model.note.key, model.note.params)}</p>}
              {anyDemo && <p className="rm-p">{t('map.demo.note')}</p>}
              {pending.length > 0 && (
                <div id={`${uid}-pending`}>
                  <h3 className="rm-h">{t('map.layer.pendingTitle')}</h3>
                  <ul className="rm-pending">{pending.map((l) => <li key={l.key}><b>{t(`map.layer.${l.key}`)}:</b> {t(l.availability.reasonKey)}</li>)}</ul>
                </div>
              )}
              <p className="rm-src">{t('map.source')}</p>
            </section>
            {model.unlocated.length > 0 && (
              <section className="rm-card rm-unloc" aria-label={t('map.unlocated.title', { n: model.unlocated.length })}>
                <h3 className="rm-h">{t('map.unlocated.title', { n: model.unlocated.length })}</h3>
                <p className="rm-p">{t('map.unlocated.hint')}</p>
                {unlocated.length === 0 && <p className="rm-p">{t('map.search.none', { q: query })}</p>}
                <ul className="rm-ulist">
                  {unlocated.map((u) => {
                    const v = markerView(u, ctx);
                    return (
                      <li key={u.projectId}>
                        <button type="button" className={`rm-urow rm-tone-${v.tone}${u.selected ? ' is-selected' : ''}`} aria-pressed={u.selected} aria-label={v.aria} onClick={() => onProject(u)}
                          onKeyDown={(e) => { if (e.key === 'Escape' && u.selected) onClear(); }}>
                          <span className="rm-urow-line"><span className="rm-urow-name">{u.name}</span><span className="rm-urow-cc">{u.country}</span></span>
                          <span className="rm-urow-line"><span className="rm-urow-st"><Glyph kind={v.kind} size={12} />{v.status}</span>{v.hasValue && <span className="rm-urow-val">{v.num}{v.unitShort ? ` ${v.unitShort}` : ''}</span>}</span>
                          <span className="rm-bar" title={`${t('map.tip.exposure')}: ${v.size}`}><i style={{ width: `${sizeMax > 0 && u.sizeValue ? Math.min(1, u.sizeValue / sizeMax) * 100 : 0}%` }} /></span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </aside>
        )}
      </div>
    </section>
  );
}
