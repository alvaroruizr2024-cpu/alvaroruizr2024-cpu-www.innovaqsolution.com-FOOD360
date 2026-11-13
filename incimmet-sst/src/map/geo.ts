import { useEffect, useState } from 'react';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import type { CountryCode } from '../domain/types';

/** anchor = [lon, lat] del centroide del polígono mayor (calculado por scripts/build-geo.mjs). */
export interface FocusProps { code: CountryCode; name: string; anchor: [number, number] }
export type FocusFeature = Feature<Polygon | MultiPolygon, FocusProps>;
export type LandFeature = Feature<Polygon | MultiPolygon, { name: string }>;
export interface GeoData { focus: FocusFeature[]; context: LandFeature[]; base: LandFeature[] }

let cache: Promise<GeoData> | null = null;
async function getJson<T>(file: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}geo/${file}`);
  if (!res.ok) throw new Error(`geo/${file}: HTTP ${res.status}`);
  return (await res.json()) as T;
}
/** Cartografía local (public/geo, Natural Earth): una descarga por sesión, sin servicios externos. */
export function loadGeo(): Promise<GeoData> {
  if (!cache) {
    const p = Promise.all([
      getJson<{ features: FocusFeature[] }>('focus-50m.json'),
      getJson<{ features: LandFeature[] }>('context-110m.json'),
      getJson<{ features: LandFeature[] }>('base-110m.json'),
    ]).then(([f, c, b]) => ({ focus: f.features, context: c.features, base: b.features }));
    p.catch(() => { if (cache === p) cache = null; });
    cache = p;
  }
  return cache;
}
export function useGeo(): { geo: GeoData | null; error: boolean } {
  const [state, setState] = useState<{ geo: GeoData | null; error: boolean }>({ geo: null, error: false });
  useEffect(() => {
    let alive = true;
    loadGeo().then((geo) => { if (alive) setState({ geo, error: false }); }, () => { if (alive) setState({ geo: null, error: true }); });
    return () => { alive = false; };
  }, []);
  return state;
}
