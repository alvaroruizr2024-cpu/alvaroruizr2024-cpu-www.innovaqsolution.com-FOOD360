import { useId, useMemo, useRef } from 'react';
import { geoAzimuthalEqualArea, geoGraticule10, geoPath } from 'd3-geo';
import type { FeatureCollection } from 'geojson';
import type { GeoData } from './geo';
import { CountryLabel, MarkerButton, countryView, labelSides, markerView, radiusFor, useSize, type StageProps } from './shared';

/** Espacio (px) que necesita una etiqueta lateral: guía + ancho aproximado de la etiqueta. */
const LABEL_ROOM = 112;

/** Mapa 2D en SVG (d3-geo, proyección acimutal equivalente ajustada a los tres países). No requiere WebGL y es el sustituto inmediato del globo 3D. */
export default function Map2D({ geo, model, markers, t, fmt, onCountry, onMarker, onClear, onTip }: StageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(ref);
  const hatch = `rm-hatch-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const sides = useMemo(() => labelSides(geo.focus), [geo]);
  const view = useMemo(() => {
    if (w < 60 || h < 60) return null;
    const pad = Math.max(12, Math.min(w, h) * 0.07);
    const fc: FeatureCollection = { type: 'FeatureCollection', features: geo.focus };
    const projection = geoAzimuthalEqualArea().rotate([60, 12]).clipAngle(85).precision(0.4).fitExtent([[pad, pad], [w - pad, h - pad]], fc);
    // La holgura horizontal se deja del lado de las etiquetas laterales (océano), sin reducir la escala.
    const box = geoPath(projection).bounds(fc);
    const [tx, ty] = projection.translate();
    const west = [...sides.values()].includes('west');
    const east = [...sides.values()].includes('east');
    if (west && !east) projection.translate([tx + (w - pad - box[1][0]), ty]);
    else if (east && !west) projection.translate([tx + (pad - box[0][0]), ty]);
    projection.clipExtent([[-4, -4], [w + 4, h + 4]]);
    const path = geoPath(projection);
    const all = (fs: GeoData['base']) => fs.map((f) => path(f) ?? '').join('');
    return {
      projection, graticule: path(geoGraticule10()) ?? '', base: all(geo.base), context: all(geo.context),
      focus: new Map(geo.focus.map((f) => [f.properties.code, path(f) ?? ''])),
    };
  }, [geo, w, h, sides]);
  const ctx = { model, t, fmt };
  const byCode = new Map(model.countries.map((c) => [c.code, c]));
  const shapes = [...geo.focus].sort((a, b) => Number(byCode.get(a.properties.code)?.selected ?? false) - Number(byCode.get(b.properties.code)?.selected ?? false));
  const sized = markers.map((m) => ({ m, r: radiusFor(m.sizeValue, model.sizeDomain) })).sort((a, b) => b.r - a.r);

  return (
    <div className="rm-2d" ref={ref}>
      {view && (
        <>
          <svg className="rm-svg" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" focusable="false">
            <defs>
              <pattern id={hatch} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line className="rm-hatch" x1="0" y1="0" x2="0" y2="6" /></pattern>
            </defs>
            <rect className="rm-ocean" width={w} height={h} />
            <path className="rm-grat" d={view.graticule} />
            <path className="rm-base" d={view.base} />
            <path className="rm-context" d={view.context} />
            {shapes.map((f) => {
              const d = view.focus.get(f.properties.code) ?? '';
              const c = byCode.get(f.properties.code);
              if (!c) return <path key={f.properties.code} className="rm-country-base" d={d} />;
              const v = countryView(c, ctx);
              return (
                <g key={c.code} className={`rm-country rm-tone-${v.tone}${c.selected ? ' is-selected' : ''}`} onClick={() => onCountry(c.code)}
                  onMouseEnter={() => onTip(v.key)} onMouseLeave={() => onTip(null)}>
                  <path className="rm-country-base" d={d} />
                  <path className="rm-country-tint" d={d} />
                  {v.kind === 'nodata' && <path d={d} fill={`url(#${hatch})`} />}
                  <path className="rm-country-line" d={d} />
                </g>
              );
            })}
          </svg>
          <div className="rm-over">
            {geo.focus.map((f) => {
              const c = byCode.get(f.properties.code);
              const p = view.projection(f.properties.anchor);
              if (!c || !p) return null;
              const want = sides.get(c.code) ?? 'center';
              const side = (want === 'west' && p[0] - LABEL_ROOM < 2) || (want === 'east' && p[0] + LABEL_ROOM > w - 2) ? 'center' : want;
              return (
                <div key={c.code} className="rm-pin" style={{ left: p[0], top: p[1] }}>
                  <CountryLabel c={c} v={countryView(c, ctx)} side={side} onClick={() => onCountry(c.code)} onTip={onTip} />
                </div>
              );
            })}
            {sized.map(({ m, r }) => {
              const p = view.projection([m.lon, m.lat]);
              if (!p) return null;
              return (
                <div key={m.projectId} className={`rm-pin${m.selected ? ' is-top' : ''}`} style={{ left: p[0], top: p[1] }}>
                  <MarkerButton m={m} v={markerView(m, ctx)} r={r} demoTag={t('map.demo.tag')} onClick={() => onMarker(m)} onClear={onClear} onTip={onTip} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
