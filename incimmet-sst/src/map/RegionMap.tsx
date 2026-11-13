import type { RegionMapProps } from '../domain/model';
/** STUB — lo reemplaza el frente de mapa (3D / 2D / lista). */
export default function RegionMap(props: RegionMapProps) {
  return <div role="img" aria-label="Mapa regional (pendiente)">{props.model.countries.map((c) => c.code).join(' · ')}</div>;
}
