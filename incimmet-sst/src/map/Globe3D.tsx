import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import { AmbientLight, DirectionalLight, MeshLambertMaterial } from 'three';
import { geoBounds, geoGraticule10 } from 'd3-geo';
import type { CountryCode } from '../domain/types';
import { CountryLabel, MarkerButton, countryView, labelSides, markerView, radiusFor, toneOf, useSize, type StageProps, type Tone } from './shared';

/**
 * Globo 3D (fragmento diferido): three.js vía react-globe.gl, sin teselas, tokens ni servicios externos.
 * Esfera de océano sin textura, tierras de contexto planas y los tres países foco extruidos con el color de estado.
 * Sin rotación automática: el bucle de dibujo se pausa cuando no hay interacción ni cambios (lámina estática y exportable).
 */
/**
 * Vista inicial centrada en Sudamérica. La referencia del encargo (lat −12, lng −60, altitud ≈ 1,7) dejaba los países muy pequeños en el panel
 * de la lámina y sin sitio para las etiquetas del lado del Pacífico: se usa lng −64 y altitud 1,25, que sube en paneles estrechos para conservar el ancho visible.
 */
const HOME = { lat: -12, lng: -64 };
const homeFor = (w: number, h: number) => ({ ...HOME, altitude: Math.min(1.9, 1.25 * Math.max(1, (1.05 * h) / Math.max(1, w))) });
const ALT = { base: 0.003, context: 0.006, focus: 0.035, selected: 0.06 };
const RADIUS = 100;
const RENDERER = { antialias: true, alpha: true, preserveDrawingBuffer: true };

type Poly = { key: string; kind: 'base' | 'context' | 'focus'; code?: CountryCode; geometry: unknown };
type Html = { key: string; lat: number; lng: number; alt: number; el: HTMLDivElement };
type RGBA = [number, number, number, number];

// Los colores salen de los tokens CSS (--map-*, estado); estos valores solo se usan si la hoja de tokens no está cargada.
const VARS = { ocean: '--map-ocean', land: '--map-land', border: '--map-border', graticule: '--map-graticule', axis: '--axis', accent: '--accent', ok: '--ok', warn: '--warn', crit: '--crit', neutral: '--neutral', nodata: '--nodata' } as const;
type Tokens = Record<keyof typeof VARS, string>;
const FALLBACK: Tokens = { ocean: '#06203A', land: '#133552', border: 'rgba(84,200,240,0.55)', graticule: 'rgba(182,199,217,0.10)', axis: 'rgba(182,199,217,0.32)', accent: '#54C8F0', ok: '#3DDC97', warn: '#F5B841', crit: '#FF6B6B', neutral: '#8FA5BC', nodata: '#5E748C' };
const TOKEN_KEYS = Object.keys(VARS) as Array<keyof Tokens>;

function readTokens(el: Element | null): Tokens {
  const cs = getComputedStyle(el ?? document.documentElement);
  const out = { ...FALLBACK };
  TOKEN_KEYS.forEach((k) => { const v = cs.getPropertyValue(VARS[k]).trim(); if (v) out[k] = v; });
  return out;
}
/** Relee los tokens cuando cambia el tema (prop o atributo data-theme): los colores se actualizan sin recrear el globo. */
function useTokens(ref: RefObject<HTMLElement | null>, theme: string): Tokens {
  const [tok, setTok] = useState<Tokens>(FALLBACK);
  useLayoutEffect(() => {
    const read = () => { const n = readTokens(ref.current); setTok((p) => (TOKEN_KEYS.every((k) => p[k] === n[k]) ? p : n)); };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
    return () => mo.disconnect();
  }, [ref, theme]);
  return tok;
}
let probe: CanvasRenderingContext2D | null | undefined;
function rgbaOf(color: string): RGBA {
  if (probe === undefined) probe = document.createElement('canvas').getContext('2d');
  if (!probe) return [128, 128, 128, 1];
  probe.fillStyle = '#000';
  probe.fillStyle = color;
  const s = String(probe.fillStyle);
  if (s.startsWith('#')) return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 1];
  const n = (s.match(/[\d.]+/g) ?? []).map(Number);
  return [n[0] ?? 128, n[1] ?? 128, n[2] ?? 128, n[3] ?? 1];
}
const css = (c: RGBA, alpha = c[3]) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.round(alpha * 1000) / 1000})`;
const mix = (a: RGBA, b: RGBA, k: number): RGBA => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, 1];

export default function Globe3D({ geo, model, markers, theme, reducedMotion, t, fmt, onCountry, onMarker, onClear, onTip }: StageProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const globe = useRef<GlobeMethods | undefined>(undefined);
  const hosts = useRef(new Map<string, Html>());
  const act = useRef({ until: 0, frames: 0, raf: 0, running: false });
  const disposeTimer = useRef<number | null>(null);
  const hadSelection = useRef(false);
  const touched = useRef(false);
  const sizeRef = useRef({ w: 0, h: 0 });
  const { w, h } = useSize(wrap);
  sizeRef.current = { w, h };
  const tok = useTokens(wrap, theme);
  const [ready, setReady] = useState(false);
  const ctx = { model, t, fmt };

  const material = useMemo(() => new MeshLambertMaterial({ color: FALLBACK.ocean }), []);
  const pal = useMemo(() => {
    const ocean = rgbaOf(tok.ocean);
    const land = rgbaOf(tok.land);
    const tone = {} as Record<Tone, { cap: string; side: string }>;
    (['ok', 'warn', 'crit', 'neutral', 'nodata'] as Tone[]).forEach((k) => { const c = rgbaOf(tok[k]); tone[k] = { cap: css(c, 0.84), side: css(mix(c, ocean, 0.6), 0.97) }; });
    return { ocean: `rgb(${ocean[0]},${ocean[1]},${ocean[2]})`, land: css(land, 1), landSide: css(mix(land, ocean, 0.5), 1), tone };
  }, [tok]);
  const byCode = useMemo(() => new Map(model.countries.map((c) => [c.code, c])), [model.countries]);
  const markerById = useMemo(() => new Map(markers.map((m) => [m.projectId, m])), [markers]);
  const polys = useMemo<Poly[]>(() => [
    ...geo.base.map((f, i) => ({ key: `b${i}`, kind: 'base' as const, geometry: f.geometry })),
    ...geo.context.map((f, i) => ({ key: `x${i}`, kind: 'context' as const, geometry: f.geometry })),
    ...geo.focus.map((f) => ({ key: f.properties.code, kind: 'focus' as const, code: f.properties.code, geometry: f.geometry })),
  ], [geo]);
  const sides = useMemo(() => labelSides(geo.focus), [geo]);
  const graticule = useMemo(() => geoGraticule10().coordinates.map((pts) => ({ pts })), []);
  /** Altitud de cámara que encuadra cada país (a partir de su extensión angular calculada). */
  const fit = useMemo(() => new Map(geo.focus.map((f) => {
    const [[w0, s0], [e0, n0]] = geoBounds(f);
    const half = Math.max(n0 - s0, (e0 - w0) * Math.cos((f.properties.anchor[1] * Math.PI) / 180)) / 2;
    const rho = (half * Math.PI) / 180;
    return [f.properties.code, Math.min(1.6, Math.max(0.55, Math.cos(rho) + Math.sin(rho) / 0.27 - 1))] as const;
  })), [geo]);

  /** Mantiene el bucle de dibujo activo `ms` y al menos 24 cuadros; después lo pausa (sin movimiento permanente). */
  const wake = useCallback((ms = 1500) => {
    const g = globe.current;
    if (!g) return;
    const a = act.current;
    a.until = Math.max(a.until, performance.now() + ms);
    a.frames = 0;
    if (a.running) return;
    a.running = true;
    g.resumeAnimation();
    const tick = () => {
      a.frames += 1;
      if (a.frames > 24 && performance.now() > a.until) { a.running = false; globe.current?.pauseAnimation(); return; }
      a.raf = requestAnimationFrame(tick);
    };
    a.raf = requestAnimationFrame(tick);
  }, []);
  const poke = useCallback(() => wake(1400), [wake]);
  const grab = useCallback(() => { touched.current = true; wake(1400); }, [wake]);

  const altOf = useCallback((code: CountryCode | undefined) => (code && byCode.get(code)?.selected ? ALT.selected : ALT.focus), [byCode]);
  const polyGeom = useCallback((d: object) => (d as Poly).geometry as never, []);
  const polyAlt = useCallback((d: object) => { const p = d as Poly; return p.kind === 'focus' ? altOf(p.code) : ALT[p.kind]; }, [altOf]);
  const toneFor = useCallback((code: CountryCode | undefined) => { const c = code ? byCode.get(code) : undefined; return pal.tone[c ? toneOf(c.status, c.state) : 'nodata']; }, [byCode, pal]);
  const polyCap = useCallback((d: object) => { const p = d as Poly; return p.kind === 'focus' ? toneFor(p.code).cap : pal.land; }, [toneFor, pal]);
  const polySide = useCallback((d: object) => { const p = d as Poly; return p.kind === 'focus' ? toneFor(p.code).side : pal.landSide; }, [toneFor, pal]);
  const polyStroke = useCallback((d: object) => {
    const p = d as Poly;
    if (p.kind !== 'focus') return tok.axis;
    return p.code && byCode.get(p.code)?.selected ? tok.accent : tok.border;
  }, [byCode, tok.axis, tok.accent, tok.border]);
  const polyClick = useCallback((d: object) => { const p = d as Poly; if (p.kind === 'focus' && p.code) onCountry(p.code); }, [onCountry]);
  const polyHover = useCallback((d: object | null) => { const p = d as Poly | null; onTip(p && p.kind === 'focus' && p.code ? `c:${p.code}` : null); }, [onTip]);
  const cursor = useCallback((_type: string, d: object) => (d as Poly | null)?.kind === 'focus', []);
  const gratColor = useCallback(() => tok.graticule, [tok.graticule]);

  const html = useMemo(() => {
    const next: Html[] = [];
    const seen = new Set<string>();
    const put = (key: string, lat: number, lng: number, alt: number, marker: boolean) => {
      let it = hosts.current.get(key);
      if (!it) {
        const el = document.createElement('div');
        el.className = marker ? 'rm-html is-marker' : 'rm-html';
        el.style.pointerEvents = 'auto';
        it = { key, lat, lng, alt, el };
        hosts.current.set(key, it);
      }
      it.lat = lat; it.lng = lng; it.alt = alt;
      seen.add(key);
      next.push(it);
    };
    for (const f of geo.focus) { const { code, anchor } = f.properties; if (byCode.has(code)) put(`c:${code}`, anchor[1], anchor[0], altOf(code) + 0.004, false); }
    for (const m of markers) put(`m:${m.projectId}`, m.lat, m.lon, altOf(m.country) + 0.006, true);
    for (const key of [...hosts.current.keys()]) if (!seen.has(key)) hosts.current.delete(key);
    return next;
  }, [geo, byCode, markers, altOf]);

  const onReady = useCallback(() => {
    const g = globe.current;
    if (!g) return;
    const c = g.controls();
    c.autoRotate = false;
    c.enablePan = false;
    c.minDistance = RADIUS * 1.28;
    c.maxDistance = RADIUS * 3.9;
    const sun = new DirectionalLight(0xffffff, 0.22 * Math.PI);
    sun.position.set(-2.4 * RADIUS, 1.1 * RADIUS, 0.4 * RADIUS);
    g.lights([new AmbientLight(0xffffff, 0.78 * Math.PI), sun]);
    g.pointOfView(homeFor(sizeRef.current.w, sizeRef.current.h), 0);
    setReady(true);
  }, []);

  useEffect(() => { material.color.set(pal.ocean); }, [material, pal.ocean]);
  useEffect(() => { wake(reducedMotion ? 700 : 1800); });
  // Si cambia el tamaño del panel y nadie ha movido el globo ni hay selección, se reencuadra la vista inicial.
  useEffect(() => { const g = globe.current; if (g && ready && !hadSelection.current && !touched.current) g.pointOfView(homeFor(w, h), 0); }, [ready, w, h]);

  const selCountry = model.countries.find((c) => c.selected)?.code ?? null;
  const selMarker = model.markers.find((m) => m.selected) ?? null;
  const selLat = selMarker?.lat ?? null;
  const selLon = selMarker?.lon ?? null;
  useEffect(() => {
    const g = globe.current;
    if (!g || !ready) return;
    const ms = reducedMotion ? 0 : 900;
    if (selLat != null && selLon != null) g.pointOfView({ lat: selLat, lng: selLon, altitude: 0.8 }, ms);
    else if (selCountry) {
      const f = geo.focus.find((x) => x.properties.code === selCountry);
      if (f) g.pointOfView({ lat: f.properties.anchor[1], lng: f.properties.anchor[0], altitude: fit.get(selCountry) ?? 1 }, ms);
    } else if (hadSelection.current) g.pointOfView(homeFor(sizeRef.current.w, sizeRef.current.h), ms);
    hadSelection.current = selCountry != null || selLat != null;
    wake(ms + 700);
  }, [ready, selCountry, selLat, selLon, reducedMotion, geo, fit, wake]);

  // Liberación diferida: compatible con el doble montaje de StrictMode en desarrollo.
  useEffect(() => {
    if (disposeTimer.current != null) { window.clearTimeout(disposeTimer.current); disposeTimer.current = null; }
    const a = act.current;
    return () => {
      const g = globe.current;
      cancelAnimationFrame(a.raf);
      a.running = false;
      disposeTimer.current = window.setTimeout(() => {
        try { g?.pauseAnimation(); g?.controls().dispose(); const r = g?.renderer(); r?.dispose(); r?.forceContextLoss(); material.dispose(); } catch { /* ya liberado */ }
      }, 0);
    };
  }, [material]);

  const zoom = (k: number) => {
    const g = globe.current;
    if (!g) return;
    touched.current = true;
    g.pointOfView({ altitude: Math.min(2.8, Math.max(0.3, g.pointOfView().altitude * k)) }, reducedMotion ? 0 : 250);
    wake(1000);
  };
  const reset = () => { touched.current = false; globe.current?.pointOfView(homeFor(w, h), reducedMotion ? 0 : 600); wake(1400); };

  return (
    <div className="rm-globe" ref={wrap} onPointerDown={grab} onPointerMove={poke} onWheel={grab} onKeyDown={poke} onFocus={poke} onTouchStart={poke}>
      {w > 0 && h > 0 && (
        <Globe ref={globe} width={w} height={h} backgroundColor="rgba(0,0,0,0)" rendererConfig={RENDERER} animateIn={false} waitForGlobeReady
          globeMaterial={material} showGraticules={false} showAtmosphere={theme === 'dark'} atmosphereColor={tok.accent} atmosphereAltitude={0.13} onGlobeReady={onReady}
          polygonsData={polys} polygonGeoJsonGeometry={polyGeom} polygonAltitude={polyAlt} polygonCapColor={polyCap} polygonSideColor={polySide} polygonStrokeColor={polyStroke}
          polygonCapCurvatureResolution={4} polygonsTransitionDuration={reducedMotion ? 0 : 280} onPolygonClick={polyClick} onPolygonHover={polyHover}
          pathsData={graticule} pathPoints={(d: object) => (d as { pts: number[][] }).pts} pathPointLat={(p: number[]) => p[1]} pathPointLng={(p: number[]) => p[0]}
          pathPointAlt={0.0015} pathColor={gratColor} pathStroke={null} pathTransitionDuration={0}
          htmlElementsData={html} htmlLat={(d: object) => (d as Html).lat} htmlLng={(d: object) => (d as Html).lng} htmlAltitude={(d: object) => (d as Html).alt}
          htmlElement={(d: object) => (d as Html).el} htmlTransitionDuration={0} showPointerCursor={cursor} />
      )}
      {html.map((it) => {
        if (it.key.startsWith('c:')) {
          const c = byCode.get(it.key.slice(2) as CountryCode);
          return c ? createPortal(<CountryLabel c={c} v={countryView(c, ctx)} side={sides.get(c.code)} onClick={() => onCountry(c.code)} onTip={onTip} />, it.el, it.key) : null;
        }
        const m = markerById.get(it.key.slice(2));
        return m ? createPortal(
          <MarkerButton m={m} v={markerView(m, ctx)} r={radiusFor(m.sizeValue, model.sizeDomain)} demoTag={t('map.demo.tag')} onClick={() => onMarker(m)} onClear={onClear} onTip={onTip} />,
          it.el, it.key) : null;
      })}
      <div className="rm-zoom">
        <button type="button" aria-label={t('map.zoom.in')} title={t('map.zoom.in')} onClick={() => zoom(0.75)}>+</button>
        <button type="button" aria-label={t('map.zoom.out')} title={t('map.zoom.out')} onClick={() => zoom(1.33)}>−</button>
        <button type="button" aria-label={t('map.zoom.reset')} title={t('map.zoom.reset')} onClick={reset}>⌂</button>
      </div>
    </div>
  );
}
