#!/usr/bin/env node
/**
 * Cartografía local del mapa regional: sin teselas, tokens ni servicios externos.
 * Fuente: paquete world-atlas (Natural Earth, dominio público) -> GeoJSON en public/geo/.
 *   focus-50m.json    Perú, Colombia y Brasil a 1:50 m (ISO numérico 604, 170, 076): properties { code, name, anchor }
 *   context-110m.json demás países de América a 1:110 m: properties { name }
 *   base-110m.json    tierras restantes a 1:110 m, disueltas (sin fronteras), más la huella 110 m de los tres países foco:
 *                     fondo del globo 3D y relleno bajo los contornos de 50 m. properties { name }
 * anchor = geoCentroid [lon, lat] del polígono mayor de cada país foco: se calcula, nunca se inventa.
 * Uso: npm run geo  (las salidas son datos públicos y se versionan).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoArea, geoCentroid } from 'd3-geo';
import { feature, merge } from 'topojson-client';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'public/geo');
const atlas = (file) => JSON.parse(readFileSync(resolve(root, 'node_modules/world-atlas', file), 'utf8'));
const FOCUS = { '604': 'PE', '170': 'CO', '076': 'BR' };
/** Caja geográfica de América: clasifica cada polígono por su centroide (separa, p. ej., la Guayana Francesa del resto de Francia). */
const inAmericas = ([lon, lat]) => lon >= -170 && lon <= -25 && lat >= -60 && lat <= 84;
const HEMISPHERE = 2 * Math.PI;
const round = (v, digits) => { const k = 10 ** digits; return Math.round(v * k) / k; };

function cleanRing(ring, digits) {
  const out = [];
  for (const [x, y] of ring) {
    const p = [round(x, digits), round(y, digits)];
    const q = out[out.length - 1];
    if (!q || q[0] !== p[0] || q[1] !== p[1]) out.push(p);
  }
  if (out.length && (out[0][0] !== out[out.length - 1][0] || out[0][1] !== out[out.length - 1][1])) out.push([...out[0]]);
  return out.length >= 4 ? out : null;
}
/** Redondea, descarta anillos degenerados y asegura la convención de d3-geo (exterior con área esférica < hemisferio; huecos al revés). */
function cleanPolygon(rings, digits) {
  const out = [];
  for (let i = 0; i < rings.length; i++) {
    let ring = cleanRing(rings[i], digits);
    if (!ring) { if (i === 0) return null; continue; }
    const big = geoArea({ type: 'Polygon', coordinates: [ring] }) > HEMISPHERE;
    if (i === 0 ? big : !big) ring = ring.reverse();
    out.push(ring);
  }
  return out;
}
const polygonsOf = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);
const toGeometry = (polys) => (polys.length === 1 ? { type: 'Polygon', coordinates: polys[0] } : { type: 'MultiPolygon', coordinates: polys });
const areaOf = (poly) => geoArea({ type: 'Polygon', coordinates: poly });
const clean = (geometry, digits) => polygonsOf(geometry).map((p) => cleanPolygon(p, digits)).filter(Boolean);

// --- países foco (1:50 m) ---
const topo50 = atlas('countries-50m.json');
const focus = topo50.objects.countries.geometries.filter((g) => FOCUS[g.id]).map((g) => {
  const polys = clean(feature(topo50, g).geometry, 3);
  const largest = polys.reduce((a, b) => (areaOf(b) > areaOf(a) ? b : a));
  const [lon, lat] = geoCentroid({ type: 'Polygon', coordinates: largest });
  return { type: 'Feature', properties: { code: FOCUS[g.id], name: g.properties.name, anchor: [round(lon, 3), round(lat, 3)] }, geometry: toGeometry(polys) };
}).sort((a, b) => a.properties.code.localeCompare(b.properties.code));
if (focus.length !== 3) throw new Error(`Se esperaban 3 países foco y se hallaron ${focus.length}`);

// --- contexto de América y resto de tierras (1:110 m) ---
const topo110 = atlas('countries-110m.json');
const context = [];
const rest = [];
for (const g of topo110.objects.countries.geometries) {
  if (!g.arcs) continue;
  const parts = (g.type === 'Polygon' ? [g.arcs] : g.arcs).map((arcs) => ({ type: 'Polygon', arcs }));
  if (FOCUS[g.id]) { rest.push(...parts); continue; }
  const american = [];
  for (const part of parts) (inAmericas(geoCentroid(feature(topo110, part))) ? american : rest).push(part);
  if (!american.length) continue;
  const polys = american.map((part) => cleanPolygon(feature(topo110, part).geometry.coordinates, 2)).filter(Boolean);
  if (polys.length) context.push({ type: 'Feature', properties: { name: g.properties.name }, geometry: toGeometry(polys) });
}
const base = [{ type: 'Feature', properties: { name: 'Land (dissolved)' }, geometry: toGeometry(clean(merge(topo110, rest), 2)) }];

mkdirSync(outDir, { recursive: true });
const write = (file, features) => {
  const json = JSON.stringify({ type: 'FeatureCollection', source: 'Natural Earth via world-atlas (public domain)', features });
  writeFileSync(resolve(outDir, file), json);
  console.log(`${file}: ${features.length} features, ${(json.length / 1024).toFixed(1)} kB`);
};
write('focus-50m.json', focus);
write('context-110m.json', context);
write('base-110m.json', base);
for (const f of focus) console.log(`  ${f.properties.code} ${f.properties.name}: anchor [lon, lat] = ${JSON.stringify(f.properties.anchor)}`);
console.log(`  contexto: ${context.map((f) => f.properties.name).join(', ')}`);
