/** Servicios de la lámina: motor de cálculo e ingesta. `src/bootstrap.ts` conecta los reales antes de montar la aplicación;
 *  si nadie los conecta, `getEngine()` crea el motor real (nunca un simulador). El simulador de desarrollo solo entra con
 *  `?mock=reported|full` en `vite dev` (ver src/bootstrap.ts) y no forma parte de la compilación de producción. */
import type { Engine, IngestApi } from './domain/model';
import { createEngine } from './engine';
import { ingestApi as localIngest } from './ingest';

let engine: Engine | null = null;
let ingestApi: IngestApi | null = localIngest;
let mock = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function getEngine(): Engine { if (!engine) engine = createEngine(); return engine; }
export function setEngine(e: Engine, isMock = false): void { engine = e; mock = isMock; emit(); }
export function getIngestApi(): IngestApi | null { return ingestApi; }
export function setIngestApi(a: IngestApi | null): void { ingestApi = a; emit(); }
export function usingMockEngine(): boolean { return mock; }
export function subscribeServices(f: () => void): () => void { subs.add(f); return () => { subs.delete(f); }; }
