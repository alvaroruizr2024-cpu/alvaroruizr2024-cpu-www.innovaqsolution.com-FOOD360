import type { CountryCode } from '../domain/types';
import type { MapMarker, MapModel } from '../domain/model';
import type { Formatters, TFn } from '../i18n/core';
import { Glyph, countryView, markerView, type Unlocated } from './shared';

interface Props {
  model: MapModel; markers: MapMarker[]; unlocated: Unlocated[]; query: string; indicator: string; t: TFn; fmt: Formatters;
  onCountry(code: CountryCode): void; onProject(p: Unlocated): void; onOpen(id: string): void;
}
const share = (v: number | null, max: number) => (v != null && max > 0 ? Math.max(0, Math.min(1, v / max)) * 100 : 0);

/** Equivalente accesible del mapa: las mismas cifras, estados y acciones (filtrar / abrir ficha) en una tabla. */
export default function MapList({ model, markers, unlocated, query, indicator, t, fmt, onCountry, onProject, onOpen }: Props) {
  const ctx = { model, t, fmt };
  const onMap = new Set(markers.map((m) => m.projectId));
  const projects: Unlocated[] = [...markers, ...unlocated].sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name));
  const maxCountry = Math.max(0, ...model.countries.map((c) => c.sizeValue ?? 0));
  const maxProject = Math.max(model.sizeDomain[1], 0);
  const unit = model.unit === 'none' ? '' : fmt.unit(model.unit);
  const sizeUnit = fmt.unit(model.sizeUnit);
  const expo = (size: string, pct: number) => (
    <span className="rm-expo"><span className="num">{size}</span><span className="rm-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span></span>
  );
  return (
    <div className="rm-list" tabIndex={0} role="region" aria-label={t('map.mode.list.title')}>
      <table className="rm-table">
        <caption>{t('map.list.caption', { indicator, unit: unit || '—', period: fmt.monthRange(model.period.from, model.period.to) })}</caption>
        <thead>
          <tr>
            <th scope="col">{t('map.list.col.name')}</th><th scope="col">{t('map.list.col.status')}</th><th scope="col" className="num">{t('map.list.col.value', { unit: unit || '—' })}</th>
            <th scope="col">{t('map.list.col.exposure', { unit: sizeUnit })}</th><th scope="col">{t('map.list.col.state')}</th><th scope="col">{t('map.list.col.action')}</th>
          </tr>
        </thead>
        <tbody>
          <tr className="rm-table-group"><th colSpan={6} scope="colgroup">{t('map.list.countries')}</th></tr>
          {model.countries.map((c) => {
            const v = countryView(c, ctx);
            return (
              <tr key={c.code} className={c.selected ? 'is-selected' : undefined}>
                <th scope="row">
                  <button type="button" className="rm-link" aria-pressed={c.selected} title={t(c.selected ? 'map.hint.countrySel' : 'map.hint.country')} onClick={() => onCountry(c.code)}>{v.name}</button>
                  <span className="rm-sub">{t('map.tip.projects', { active: c.activeProjects, n: c.projects })}</span>
                </th>
                <td><span className={`rm-st rm-tone-${v.tone}`}><Glyph kind={v.kind} size={13} />{v.status}</span></td>
                <td className="num">{v.hasValue ? v.num : '—'}</td>
                <td>{expo(v.sizeNum, share(c.sizeValue, maxCountry))}</td>
                <td>{t(`map.state.${c.state}`)}{c.reason ? <span className="rm-sub">{t(c.reason.key, c.reason.params)}</span> : null}</td>
                <td />
              </tr>
            );
          })}
          <tr className="rm-table-group"><th colSpan={6} scope="colgroup">{t('map.list.projects', { n: projects.length })}</th></tr>
          {projects.map((p) => {
            const v = markerView(p, ctx);
            return (
              <tr key={p.projectId} className={p.selected ? 'is-selected' : undefined}>
                <th scope="row">
                  <button type="button" className="rm-link" aria-pressed={p.selected} title={t(p.selected ? 'map.hint.projectSel' : 'map.hint.project')} onClick={() => onProject(p)}>{p.name}</button>
                  <span className="rm-sub">{t(`country.${p.country}`)}</span>
                </th>
                <td><span className={`rm-st rm-tone-${v.tone}`}><Glyph kind={v.kind} size={13} />{v.status}</span></td>
                <td className="num">{v.hasValue ? v.num : '—'}</td>
                <td>{expo(v.sizeNum, share(p.sizeValue, maxProject))}</td>
                <td>{t(`map.state.${p.state}`)}<span className="rm-sub">{t(!onMap.has(p.projectId) ? 'map.list.loc.none' : p.isDemo ? 'map.list.loc.demo' : 'map.list.loc.map')}</span></td>
                <td><button type="button" className="rm-btn" aria-label={t('map.list.openAria', { name: p.name })} onClick={() => onOpen(p.projectId)}>{t('map.list.open')}</button></td>
              </tr>
            );
          })}
          {projects.length === 0 && query && <tr><td colSpan={6}>{t('map.search.none', { q: query })}</td></tr>}
        </tbody>
      </table>
      <p className="rm-p">{t(model.statusDefinition.key, model.statusDefinition.params)}</p>
      {model.note && <p className="rm-p">{t(model.note.key, model.note.params)}</p>}
    </div>
  );
}
