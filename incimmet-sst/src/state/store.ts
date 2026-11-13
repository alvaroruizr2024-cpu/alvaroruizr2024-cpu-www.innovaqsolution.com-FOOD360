/** Estado único de la lámina: filtros, preferencias, idioma, tema, modo de datos, pila de deshacer y panel abierto. */
import { useMemo, useSyncExternalStore } from 'react';
import type { Dataset, Lang, Month } from '../domain/types';
import type { Engine, FilterOptions, Filters, PeriodMode, Prefs, SheetModel } from '../domain/model';
import { getEngine, subscribeServices } from '../engineProvider';
import { makeFormatters, makeT, type Formatters, type TFn } from '../i18n/core';

export type ThemePref = 'dark' | 'light' | 'system';
export type DataMode = 'real' | 'demo' | 'none';
export type MapMode = '3d' | '2d' | 'list';
export interface LoadEntry { at: string; files: string[]; cutoff: string | null; facts: number }
export type DrawerState =
  | { kind: 'kpi'; id: string } | { kind: 'project'; id: string } | { kind: 'signal'; id: string } | { kind: 'risk'; risk: string; projectId: string }
  | { kind: 'catalog' } | { kind: 'method' } | { kind: 'recon' } | { kind: 'import' } | { kind: 'custom' } | null;
export interface AppState {
  booted: boolean; lang: Lang; themePref: ThemePref; theme: 'dark' | 'light'; dataMode: DataMode; real: Dataset | null;
  filters: Filters; prefs: Prefs; cardsCustom: boolean; undo: Filters[]; mapMode: MapMode; history: LoadEntry[]; rev: number;
  drawer: DrawerState; tour: number | null;
}
interface Saved { lang?: Lang; themePref?: ThemePref; dataMode?: DataMode; cards?: string[] | null; mapLayer?: Prefs['mapLayer']; mapIndicator?: string | null; mapMode?: MapMode; history?: LoadEntry[] }
const LS_KEY = 'incimmet.sst.v1';
const REAL_KEY = 'dataset.real';

const qs = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
function pick<T extends string>(v: string | null, allowed: readonly T[]): T | null { return v != null && (allowed as readonly string[]).includes(v) ? (v as T) : null; }
export const urlParams = {
  data: pick(qs.get('data'), ['real', 'demo', 'none'] as const),
  lang: pick(qs.get('lang'), ['es', 'en', 'pt'] as const),
  theme: pick(qs.get('theme'), ['dark', 'light'] as const),
};

export const addMonths = (m: Month, n: number): Month => {
  const d = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
export function withPeriod(f: Filters, mode: PeriodMode, month: Month): Filters {
  if (mode === 'custom') return { ...f, periodMode: mode, month };
  const from = mode === 'month' ? month : mode === 'ytd' ? `${month.slice(0, 4)}-01` : addMonths(month, -11);
  return { ...f, periodMode: mode, month, from, to: month };
}

// ---------- IndexedDB (conjunto real importado: solo en este equipo) ----------
function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open('incimmet-sst', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('kv'); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function idbRun<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T | null> {
  try {
    const db = await idb();
    return await new Promise<T | null>((res, rej) => {
      const q = fn(db.transaction('kv', mode).objectStore('kv'));
      q.onsuccess = () => res((q.result as T) ?? null); q.onerror = () => rej(q.error);
    });
  } catch { return null; }
}
const idbGet = <T,>(k: string) => idbRun<T>('readonly', (s) => s.get(k));
const idbSet = (k: string, v: unknown) => idbRun<unknown>('readwrite', (s) => s.put(v, k));
const idbDel = (k: string) => idbRun<unknown>('readwrite', (s) => s.delete(k));

// ---------- estado ----------
const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: light)') : null;
const resolveTheme = (p: ThemePref): 'dark' | 'light' => (p === 'system' ? (mq?.matches ? 'light' : 'dark') : p);
function loadSaved(): Saved { try { const raw = localStorage.getItem(LS_KEY); return raw ? (JSON.parse(raw) as Saved) : {}; } catch { return {}; } }

let demo: { engine: Engine; ds: Dataset } | null = null;
function demoDataset(): Dataset { const e = getEngine(); if (!demo || demo.engine !== e) demo = { engine: e, ds: e.demoDataset() }; return demo.ds; }
export function datasetFor(s: Pick<AppState, 'dataMode' | 'real'>): Dataset | null { return s.dataMode === 'demo' ? demoDataset() : s.dataMode === 'real' ? s.real : null; }
function rebase(s: AppState): AppState {
  const ds = datasetFor(s); const e = getEngine();
  return { ...s, filters: e.defaultFilters(ds), undo: [], prefs: { ...s.prefs, cards: s.cardsCustom ? s.prefs.cards : e.defaultCards(ds) } };
}
function init(): AppState {
  const sv = loadSaved(); const e = getEngine();
  const themePref: ThemePref = urlParams.theme ?? sv.themePref ?? 'dark';
  return rebase({
    booted: false, lang: urlParams.lang ?? sv.lang ?? 'es', themePref, theme: resolveTheme(themePref),
    dataMode: urlParams.data ?? (sv.dataMode === 'demo' ? 'demo' : 'none'), real: null, filters: e.defaultFilters(null),
    prefs: { cards: Array.isArray(sv.cards) ? sv.cards : e.defaultCards(null), mapLayer: sv.mapLayer ?? 'events', mapIndicator: sv.mapIndicator ?? null },
    cardsCustom: Array.isArray(sv.cards), undo: [], mapMode: sv.mapMode ?? '3d', history: sv.history ?? [], rev: 0, drawer: null, tour: null,
  });
}
let state: AppState = init();
const listeners = new Set<() => void>();
function persist(): void {
  try {
    const s = state;
    const sv: Saved = { lang: s.lang, themePref: s.themePref, dataMode: s.dataMode, cards: s.cardsCustom ? s.prefs.cards : null, mapLayer: s.prefs.mapLayer, mapIndicator: s.prefs.mapIndicator, mapMode: s.mapMode, history: s.history };
    localStorage.setItem(LS_KEY, JSON.stringify(sv));
  } catch { /* almacenamiento no disponible */ }
}
function applyDom(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.lang = state.lang === 'pt' ? 'pt-BR' : state.lang;
}
function set(next: Partial<AppState>): void { state = { ...state, ...next }; persist(); applyDom(); listeners.forEach((l) => l()); }
const pushUndo = () => [...state.undo, state.filters].slice(-30);
applyDom();
mq?.addEventListener('change', () => { if (state.themePref === 'system') set({ theme: resolveTheme('system') }); });
subscribeServices(() => { demo = null; set(rebase({ ...state, rev: state.rev + 1 })); });

export const getState = (): AppState => state;
export const subscribe = (l: () => void): (() => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export const actions = {
  setFilters(patch: Partial<Filters>): void { set({ undo: pushUndo(), filters: { ...state.filters, ...patch } }); },
  setPeriod(mode: PeriodMode, month: Month): void { set({ undo: pushUndo(), filters: withPeriod(state.filters, mode, month) }); },
  setRange(a: Month, b: Month): void {
    const [from, to] = a <= b ? [a, b] : [b, a];
    actions.setFilters(from === to ? { periodMode: 'month', month: to, from, to } : { periodMode: 'custom', month: to, from, to });
  },
  undo(): void { const u = state.undo; if (u.length) set({ filters: u[u.length - 1], undo: u.slice(0, -1) }); },
  resetFilters(): void { set({ undo: pushUndo(), filters: getEngine().defaultFilters(datasetFor(state)) }); },
  setLang(lang: Lang): void { set({ lang }); },
  setThemePref(themePref: ThemePref): void { set({ themePref, theme: resolveTheme(themePref) }); },
  setMapMode(mapMode: MapMode): void { set({ mapMode }); },
  setPrefs(patch: Partial<Prefs>): void { set({ prefs: { ...state.prefs, ...patch } }); },
  setCards(cards: string[]): void { set({ cardsCustom: true, prefs: { ...state.prefs, cards } }); },
  resetCards(): void { set({ cardsCustom: false, prefs: { ...state.prefs, cards: getEngine().defaultCards(datasetFor(state)) } }); },
  setDataMode(dataMode: DataMode): void { set(rebase({ ...state, dataMode })); },
  open(drawer: DrawerState): void { set({ drawer, tour: null }); },
  close(): void { set({ drawer: null }); },
  setTour(tour: number | null): void { set({ tour, drawer: null }); },
  async setRealDataset(ds: Dataset, entry: LoadEntry): Promise<void> {
    await idbSet(REAL_KEY, ds);
    set(rebase({ ...state, real: ds, dataMode: 'real', history: [entry, ...state.history].slice(0, 12) }));
  },
  async clearLocal(): Promise<void> {
    await idbDel(REAL_KEY);
    set(rebase({ ...state, real: null, dataMode: state.dataMode === 'real' ? 'none' : state.dataMode, history: [], cardsCustom: false }));
    try { localStorage.removeItem(LS_KEY); } catch { /* sin almacenamiento */ }
  },
};

/** Orden de arranque: IndexedDB → (solo desarrollo) /__private/dataset.real.json → ninguno. */
export async function boot(): Promise<void> {
  let real = await idbGet<Dataset>(REAL_KEY);
  if (!real && import.meta.env.DEV && urlParams.data !== 'demo' && urlParams.data !== 'none') {
    try {
      const r = await fetch('/__private/dataset.real.json');
      if (r.ok) { const j = (await r.json()) as Partial<Dataset>; if (j && j.schema === 1 && Array.isArray(j.projects)) real = j as Dataset; }
    } catch { /* sin conjunto local */ }
  }
  const saved = loadSaved().dataMode;
  const dataMode: DataMode = urlParams.data ?? (saved === 'demo' ? 'demo' : real ? 'real' : 'none');
  set(rebase({ ...state, real: real ?? null, dataMode, booted: true }));
}

export function useApp(): AppState { return useSyncExternalStore(subscribe, getState, getState); }
export interface I18n { lang: Lang; t: TFn; fmt: Formatters }
export function useI18n(): I18n {
  const lang = useApp().lang;
  return useMemo(() => ({ lang, t: makeT(lang), fmt: makeFormatters(lang) }), [lang]);
}
export interface SheetCtx { app: AppState; ds: Dataset | null; engine: Engine; model: SheetModel | null; options: FilterOptions }
export function useSheet(): SheetCtx {
  const app = useApp(); const engine = getEngine(); const ds = datasetFor(app);
  const model = useMemo(() => (ds ? engine.sheet(ds, app.filters, app.prefs) : null), [engine, ds, app.filters, app.prefs, app.rev]);
  const options = useMemo(() => engine.filterOptions(ds), [engine, ds, app.rev]);
  return { app, ds, engine, model, options };
}
