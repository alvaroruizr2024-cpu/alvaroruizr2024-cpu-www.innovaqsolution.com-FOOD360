/**
 * BANCO DE PRUEBAS del mapa (solo desarrollo): `npx vite --port 5174` → http://localhost:5174/map-dev.html
 * Modelo sintético con marcadores «DEMO» en ubicaciones ficticias; sin cifras ni nombres reales. No entra en el build de producción.
 * Parámetros: ?mode=3d|2d|list&theme=dark|light&lang=es|en|pt&case=a|b&sel=PE&project=DEMO-07&w=680&h=470&rm=1&strict=0
 */
import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans-condensed/500.css';
import '@fontsource/ibm-plex-sans-condensed/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '../styles/tokens.css';
import type { CountryCode, Lang } from '../domain/types';
import type { DataState, MapCountry, MapLayer, MapModel, StatusLevel } from '../domain/model';
import { makeFormatters, makeT, registerDict } from '../i18n/core';
import '../i18n/kpi';
import RegionMap from './RegionMap';

registerDict({
  es: { 'dev.map.statusDef': 'Verde: ≤ meta · Ámbar: hasta meta × 1,2 · Rojo: por encima de la meta. Un dato ausente no es un cero.', 'dev.map.pending': 'Fuente pendiente: requiere la tabla del módulo', 'dev.map.note': 'Datos de demostración: valores sintéticos.' },
  en: { 'dev.map.statusDef': 'Green: ≤ target · Amber: up to target × 1.2 · Red: above target. Missing data is not a zero.', 'dev.map.pending': 'Source pending: requires the module table', 'dev.map.note': 'Demo data: synthetic values.' },
  pt: { 'dev.map.statusDef': 'Verde: ≤ meta · Âmbar: até meta × 1,2 · Vermelho: acima da meta. Dado ausente não é zero.', 'dev.map.pending': 'Fonte pendente: requer a tabela do módulo', 'dev.map.note': 'Dados de demonstração: valores sintéticos.' },
});

type Seed = [id: string, name: string, country: CountryCode, lat: number, lon: number, status: StatusLevel, state: DataState, value: number | null, size: number | null];
// Ubicaciones FICTICIAS dentro de cada país (DEMO): no corresponden a ningún proyecto real.
const SEEDS: Seed[] = [
  ['DEMO-01', 'DEMO Andes 01', 'PE', -12.4, -75.2, 'crit', 'ok', 4.8, 520000],
  ['DEMO-02', 'DEMO Altiplano 02', 'PE', -14.8, -72.6, 'warn', 'ok', 2.6, 310000],
  ['DEMO-03', 'DEMO Costa 03', 'PE', -4.6, -80.2, 'good', 'zero', 0, 140000],
  ['DEMO-04', 'DEMO Cordillera 04', 'CO', 7.7, -73.1, 'good', 'ok', 0.9, 260000],
  ['DEMO-05', 'DEMO Llanos 05', 'CO', 3.4, -71.2, 'nodata', 'nd', null, 90000],
  ['DEMO-06', 'DEMO Valle 06', 'CO', 0.4, -74.8, 'noexposure', 'nd', null, null],
  ['DEMO-07', 'DEMO Serra 07', 'BR', -18.9, -44.6, 'warn', 'ok', 2.2, 640000],
  ['DEMO-08', 'DEMO Norte 08', 'BR', -6.3, -50.4, 'good', 'ok', 0.7, 410000],
  ['DEMO-09', 'DEMO Planalto 09', 'BR', -13.7, -47.3, 'na', 'na', null, 60000],
  ['DEMO-10', 'DEMO Sul 10', 'BR', -21.9, -49.9, 'neutral', 'ok', 1.4, 200000],
];
const LOOSE: Array<[string, string, CountryCode, StatusLevel, DataState, number | null, number | null]> = [
  ['DEMO-11', 'DEMO Sin coordenadas 11', 'PE', 'warn', 'ok', 2.9, 180000],
  ['DEMO-12', 'DEMO Sin coordenadas 12', 'CO', 'good', 'zero', 0, 75000],
  ['DEMO-13', 'DEMO Sin coordenadas 13', 'BR', 'nodata', 'pending', null, null],
];
const COUNTRY_CASES: Record<'a' | 'b', Record<CountryCode, [StatusLevel, DataState, number | null]>> = {
  a: { PE: ['crit', 'ok', 3.6], CO: ['good', 'ok', 0.9], BR: ['warn', 'ok', 1.8] },
  b: { PE: ['good', 'zero', 0], CO: ['noexposure', 'nd', null], BR: ['nodata', 'pending', null] },
};

function buildModel(variant: 'a' | 'b', layer: MapLayer, selCountry: CountryCode | null, selProject: string | null): MapModel {
  const exposure = layer === 'exposure';
  const countries: MapCountry[] = (['PE', 'CO', 'BR'] as CountryCode[]).map((code) => {
    const [status, state, value] = COUNTRY_CASES[variant][code];
    const mine = SEEDS.filter((s) => s[2] === code);
    const size = mine.reduce((a, s) => a + (s[8] ?? 0), 0);
    return { code, status: exposure ? 'neutral' : status, state: exposure ? 'ok' : state, value: exposure ? size : value, sizeValue: size, reason: null, projects: mine.length + 1, activeProjects: mine.length, selected: selCountry === code, hasData: state === 'ok' || state === 'zero' };
  });
  const pending = { state: 'pending' as const, reasonKey: 'dev.map.pending' };
  return {
    layer,
    layers: [{ key: 'events', availability: { state: 'available', reasonKey: '' } }, { key: 'exposure', availability: { state: 'available', reasonKey: '' } }, { key: 'controls', availability: pending }, { key: 'actions', availability: pending }, { key: 'health', availability: pending }],
    indicatorId: exposure ? 'R01' : 'R12', unit: exposure ? 'hh' : 'per1e6hh', decimals: exposure ? 0 : 2, sizeUnit: 'hh', period: { from: '2026-01', to: '2026-10' },
    statusDefinition: { key: 'dev.map.statusDef' }, countries,
    markers: SEEDS.map(([projectId, name, country, lat, lon, status, state, value, sizeValue]) => ({
      projectId, name, country, lat, lon, status: exposure ? 'neutral' : status, state: exposure ? (sizeValue ? 'ok' : 'nd') : state, value: exposure ? sizeValue : value, sizeValue, isDemo: true, selected: selProject === projectId,
    })),
    unlocated: LOOSE.map(([projectId, name, country, status, state, value, sizeValue]) => ({ projectId, name, country, status, state, value, sizeValue, isDemo: true, selected: selProject === projectId })),
    sizeDomain: [0, 650000], note: { key: 'dev.map.note' },
  };
}

function App() {
  const qs = useMemo(() => new URLSearchParams(window.location.search), []);
  const [lang, setLang] = useState<Lang>(((qs.get('lang') as Lang | null) ?? 'es'));
  const [theme, setTheme] = useState<'dark' | 'light'>(qs.get('theme') === 'light' ? 'light' : 'dark');
  const [mode, setMode] = useState<'3d' | '2d' | 'list'>(((qs.get('mode') as '3d' | '2d' | 'list' | null) ?? '3d'));
  const [layer, setLayer] = useState<MapLayer>('events');
  const [country, setCountry] = useState<CountryCode | null>(qs.get('sel') as CountryCode | null);
  const [project, setProject] = useState<string | null>(qs.get('project'));
  const [log, setLog] = useState('—');
  const variant = qs.get('case') === 'b' ? 'b' : 'a';
  useEffect(() => { document.documentElement.dataset.theme = theme; document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang; }, [theme, lang]);
  const t = useMemo(() => makeT(lang), [lang]);
  const fmt = useMemo(() => makeFormatters(lang), [lang]);
  const model = useMemo(() => buildModel(variant, layer, country, project), [variant, layer, country, project]);
  return (
    <div className="dev">
      <div className="dev-bar">
        <span>map-dev · DEMO</span>
        {(['es', 'en', 'pt'] as Lang[]).map((l) => <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>{l}</button>)}
        <button id="dev-theme" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme}</button>
        <output id="dev-log">{log}</output>
      </div>
      <main className="dev-panel" style={{ width: Number(qs.get('w')) || 680, height: Number(qs.get('h')) || 470 }}>
        <RegionMap model={model} lang={lang} theme={theme} mode={mode} reducedMotion={qs.get('rm') === '1'} t={t} fmt={fmt}
          onModeChange={setMode}
          onSelectCountry={(c) => { setCountry(c); setLog(`selectCountry(${c})`); }}
          onSelectProject={(id) => { setProject(id); setLog(`selectProject(${id})`); }}
          onOpenProject={(id) => setLog(`openProject(${id})`)}
          onLayerChange={(l) => { setLayer(l); setLog(`layer(${l})`); }} />
      </main>
    </div>
  );
}

// ?strict=0 monta sin StrictMode (p. ej. para medir el bucle de dibujo sin el doble montaje de desarrollo).
const strict = new URLSearchParams(window.location.search).get('strict') !== '0';
createRoot(document.getElementById('root')!).render(strict ? <StrictMode><App /></StrictMode> : <App />);
