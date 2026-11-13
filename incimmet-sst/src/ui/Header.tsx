import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { BookOpen, FlaskConical, Funnel, LayoutGrid, Menu, Monitor, Moon, Presentation, RotateCcw, Scale, Search, SlidersHorizontal, Sun, Undo2, Upload, LogOut } from 'lucide-react';
import { logout, useAuth } from '../auth/auth';
import { LANGS, type CountryCode } from '../domain/types';
import type { CompareMode, FilterOptions, Filters } from '../domain/model';
import type { TFn } from '../i18n/core';
import { getIngestApi } from '../engineProvider';
import { actions, useI18n, type SheetCtx } from '../state/store';
import { COUNTRY_COLOR } from './charts';
import { Popover, Seg } from './primitives';

export type ExportKind = 'png' | 'pdf' | 'csv' | 'xlsx';
/** Logotipo oficial solo si existe public/brand/incimmet-logo.(svg|png); si no, rótulo tipográfico (nunca un logotipo inventado). */
const LOGO: string | null = (Object.values(import.meta.glob('/public/brand/incimmet-logo.{svg,png}', { eager: true, query: '?url', import: 'default' }))[0] as string | undefined) ?? null;
const toggle = <T,>(xs: T[], x: T): T[] => (xs.includes(x) ? xs.filter((v) => v !== x) : [...xs, x]);
type RecKey = 'companies' | 'activities' | 'shifts' | 'risks' | 'severities' | 'eventTypes';
export const REC_DIMS: Array<[keyof FilterOptions['availableDims'], RecKey]> = [['company', 'companies'], ['activity', 'activities'], ['shift', 'shifts'], ['risk', 'risks'], ['severity', 'severities'], ['eventType', 'eventTypes']];

function ProjectCombo({ options, value, onChange, t }: { options: FilterOptions['projects']; value: string[]; onChange(ids: string[]): void; t: TFn }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = options.find((p) => p.id === value[0]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return [{ id: '', name: t('ui.filter.allProjects'), country: '' }, ...options.filter((p) => !s || p.name.toLowerCase().includes(s) || p.country.toLowerCase() === s)];
  }, [q, options, t]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) { setOpen(false); setQ(''); } };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  const choose = (id: string) => { onChange(id ? [id] : []); setOpen(false); setQ(''); };
  return (
    <div className="combo" ref={ref}>
      <Search size={13} aria-hidden="true" />
      <input role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" aria-label={t('ui.filter.project')} disabled={!options.length}
        placeholder={current ? current.name : t('ui.filter.allProjects')} value={open ? q : current ? current.name : ''}
        onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHi((h) => Math.min(list.length - 1, h + 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
          else if (e.key === 'Enter' && open && list[hi]) { e.preventDefault(); choose(list[hi].id); }
          else if (e.key === 'Escape') { setOpen(false); setQ(''); }
        }} />
      {open ? (
        <ul id={listId} role="listbox" className="combo-list">
          {list.map((p, i) => (
            <li key={p.id || 'all'} role="option" aria-selected={p.id === (value[0] ?? '')} className={i === hi ? 'hi' : undefined} onMouseDown={(e) => { e.preventDefault(); choose(p.id); }}>
              {p.country ? <span className="mono cc">{p.country}</span> : null}<span>{p.name}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function Header({ ctx, onExport, busy }: { ctx: SheetCtx; onExport(kind: ExportKind): void; busy: string | null }) {
  const { app, model, options } = ctx;
  const { t, fmt } = useI18n();
  const f = app.filters;
  const months = useMemo(() => [...options.months].reverse(), [options.months]);
  const nRec = REC_DIMS.reduce((s, [, k]) => s + f[k].length, 0);
  const noData = !model, xlsxOff = !getIngestApi();
  const auth = useAuth();
  return (
    <header className="hdr">
      <div className="hdr-1">
        <h1 className="brand">
          {LOGO ? <img src={LOGO} alt="INCIMMET" className="logo" /> : <span className="wordmark">INCIMMET</span>}
          <span className="brand-sep" aria-hidden="true" />
          <span className="brand-t"><span className="title">{t('ui.title')}</span><span className="tagline">{t('ui.tagline')}</span></span>
        </h1>
        <div className="hdr-meta">
          {model?.meta.isDemo ? <span className="demo-badge"><FlaskConical size={13} aria-hidden="true" /><span>{t('ui.demo.badge')}</span></span> : null}
          <Seg label={t('ui.data.label')} value={app.dataMode === 'none' ? null : app.dataMode} onChange={actions.setDataMode} items={[{ key: 'real', label: t('ui.data.real'), title: t('ui.data.real.hint') }, { key: 'demo', label: 'DEMO', title: t('ui.data.demo.hint') }]} />
          <Seg label={t('ui.lang.label')} value={app.lang} onChange={actions.setLang} items={LANGS.map((l) => ({ key: l, label: l.toUpperCase(), title: t(`ui.lang.${l}`) }))} />
          <Seg className="seg-theme" label={t('ui.theme.label')} value={app.themePref} onChange={actions.setThemePref} items={[
            { key: 'light', label: t('ui.theme.light'), icon: <Sun size={13} aria-hidden="true" /> }, { key: 'dark', label: t('ui.theme.dark'), icon: <Moon size={13} aria-hidden="true" /> },
            { key: 'system', label: t('ui.theme.system'), icon: <Monitor size={13} aria-hidden="true" /> }]} />
          <Popover icon={<Menu size={15} aria-hidden="true" />} title={t('ui.menu')} align="right" className="menu">
            {(close) => {
              const item = (icon: React.ReactNode, label: string, fn: () => void, disabled = false) => <button type="button" className="menu-i" disabled={disabled} onClick={() => { close(); fn(); }}>{icon}<span>{label}</span></button>;
              return (
                <div className="menu-list" role="group" aria-label={t('ui.menu')}>
                  {item(<SlidersHorizontal size={14} aria-hidden="true" />, t('ui.menu.customise'), () => actions.open({ kind: 'custom' }), noData)}
                  {item(<LayoutGrid size={14} aria-hidden="true" />, t('ui.menu.catalog'), () => actions.open({ kind: 'catalog' }))}
                  {item(<BookOpen size={14} aria-hidden="true" />, t('ui.menu.method'), () => actions.open({ kind: 'method' }))}
                  {item(<Upload size={14} aria-hidden="true" />, t('ui.menu.import'), () => actions.open({ kind: 'import' }))}
                  {item(<Scale size={14} aria-hidden="true" />, t('ui.menu.recon'), () => actions.open({ kind: 'recon' }), noData)}
                  <div className="menu-sep">{t('ui.menu.export')}</div>
                  <div className="menu-row">
                    {(['png', 'pdf', 'csv', 'xlsx'] as const).map((k) => (
                      <button key={k} type="button" className="btn btn-s" disabled={noData || busy != null || (k === 'xlsx' && xlsxOff)} title={k === 'xlsx' && xlsxOff ? t('ui.export.xlsxNeedsIngest') : t(`ui.export.${k}`)} onClick={() => { close(); onExport(k); }}>{k.toUpperCase()}</button>
                    ))}
                  </div>
                  {xlsxOff ? <p className="hint">{t('ui.export.xlsxNeedsIngest')}</p> : null}
                  {item(<Presentation size={14} aria-hidden="true" />, t('ui.menu.present'), () => actions.setTour(0), noData)}
                  {auth.session ? <><div className="menu-sep trunc" title={auth.session.email}>{t('auth.signedAs', { email: auth.session.email })}</div>
                  {item(<LogOut size={14} aria-hidden="true" />, t('auth.logout'), logout)}</> : null}
                </div>
              );
            }}
          </Popover>
        </div>
      </div>
      <div className="hdr-2" role="search" aria-label={t('ui.filters.aria')}>
        <label className="fld"><span className="sr">{t('ui.period.month')}</span>
          <select value={f.month} disabled={!months.length} onChange={(e) => actions.setPeriod(f.periodMode === 'custom' ? 'month' : f.periodMode, e.target.value)}>{months.map((m) => <option key={m} value={m}>{fmt.month(m, 'long')}</option>)}</select>
        </label>
        <Seg label={t('ui.period.mode')} value={f.periodMode === 'custom' ? null : f.periodMode} onChange={(k) => actions.setPeriod(k, f.month)}
          items={[{ key: 'month', label: t('ui.period.monthMode') }, { key: 'ytd', label: t('ui.period.ytd') }, { key: 'r12', label: t('ui.period.r12') }]} />
        {f.periodMode === 'custom' ? <span className="chip chip-neutral">{t('ui.period.custom')}: {fmt.monthRange(f.from, f.to)}</span> : null}
        <div className="seg chips" role="group" aria-label={t('ui.filter.countries')}>
          {options.countries.map((c) => (
            <button key={c.code} type="button" aria-pressed={f.countries.includes(c.code)} className={f.countries.includes(c.code) ? 'on' : undefined} disabled={!c.hasData} title={t(`country.${c.code}`)}
              onClick={() => actions.setFilters({ countries: toggle<CountryCode>(f.countries, c.code), projectIds: [] })}><i className="cdot" style={{ background: COUNTRY_COLOR[c.code] }} aria-hidden="true" />{c.code}</button>
          ))}
        </div>
        <ProjectCombo options={options.projects.filter((p) => !f.countries.length || f.countries.includes(p.country))} value={f.projectIds} onChange={(ids) => actions.setFilters({ projectIds: ids })} t={t} />
        <label className="fld"><span className="fld-l">{t('ui.cmp.label')}</span>
          <select value={f.compare} onChange={(e) => actions.setFilters({ compare: e.target.value as CompareMode })}>{(['yoy', 'prev', 'r12', 'none'] as const).map((m) => <option key={m} value={m}>{t(`ui.cmp.${m}`)}</option>)}</select>
        </label>
        <Popover icon={<Funnel size={14} aria-hidden="true" />} label={nRec ? `${t('ui.filters.more')} (${nRec})` : t('ui.filters.more')} className="filters">
          <div className="filters-grid">
            {REC_DIMS.map(([dim, key]) => {
              const avail = options.availableDims[dim] && options[key].length > 0;
              return (
                <label key={dim} className="fld fld-col"><span className="fld-l">{t(`ui.filter.${dim}`)}</span>
                  <select disabled={!avail} value={f[key][0] ?? ''} onChange={(e) => actions.setFilters({ [key]: e.target.value ? [e.target.value] : [] } as Partial<Filters>)}>
                    <option value="">{t('ui.filter.all')}</option>{options[key].map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                  {!avail ? <span className="hint">{t('ui.filters.unavailable')}</span> : null}
                </label>
              );
            })}
            <p className="hint filters-note">{t('ui.filters.note')}</p>
          </div>
        </Popover>
        <button type="button" className="btn btn-icon" disabled={!app.undo.length} onClick={actions.undo} title={t('ui.undo')} aria-label={t('ui.undo')}><Undo2 size={14} aria-hidden="true" /></button>
        <button type="button" className="btn" onClick={actions.resetFilters} disabled={noData}><RotateCcw size={14} aria-hidden="true" /><span>{t('ui.reset')}</span></button>
        {model ? <span className="updated trunc" title={t('ui.updated', { when: fmt.dateTime(model.meta.lastLoadedAt) })}>{t('ui.updated', { when: fmt.dateTime(model.meta.lastLoadedAt) })}{model.meta.cutoffMonth ? ` · ${t('ui.cutoff', { m: fmt.month(model.meta.cutoffMonth) })}` : ''}</span> : null}
      </div>
    </header>
  );
}
