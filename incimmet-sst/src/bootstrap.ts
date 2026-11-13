/** Conexión de servicios. Debe ser la PRIMERA importación de main.tsx: así el estado (src/state/store.ts) nace ya con el motor real.
 *  Todo el cálculo y la lectura de libros ocurre en el navegador; nada sale del equipo. */
import { createEngine } from './engine';
import { ingestApi } from './ingest';
import { setEngine, setIngestApi } from './engineProvider';

setEngine(createEngine());
setIngestApi(ingestApi);

// Solo en `vite dev`: `?mock=reported|full` sustituye el motor por el simulador de interfaz (cifras sintéticas, marca DEMO).
if (import.meta.env.DEV) {
  const v = new URLSearchParams(location.search).get('mock');
  if (v === 'reported' || v === 'full') {
    const { createMockEngine } = await import('./dev/mockEngine');
    setEngine(createMockEngine(v), true);
  }
}
