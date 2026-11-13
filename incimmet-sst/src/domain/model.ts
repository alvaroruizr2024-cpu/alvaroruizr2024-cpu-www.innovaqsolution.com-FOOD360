/**
 * CONTRATO DE VISTA Y DE SERVICIOS — la interfaz (src/ui, src/map) solo consume estos tipos;
 * el motor (src/engine) y la ingesta (src/ingest) los producen. Todo texto viaja como clave i18n (+params).
 */
import type {
  Availability, CellRef, CountryCode, Dataset, ISODate, Lang, ModuleKey, Month, Priority, Project, ReconItem,
  SourceFile, StatRow, TextRef,
} from './types';
import type { Formatters, TFn } from '../i18n/core';

export type UnitKey =
  | 'hh' | 'people' | 'events' | 'cases' | 'days' | 'hours' | 'pct' | 'pp' | 'per1e6hh' | 'per200khh' | 'per1e4hh'
  | 'per100workers' | 'per100kworkers' | 'score' | 'index' | 'probability' | 'count' | 'months' | 'none';
/** ok: valor válido · zero: cero real con exposición válida · nd: no disponible (denominador 0/ausente, sin datos)
 *  na: no aplica · pending: fuente pendiente · insufficient: datos insuficientes · disabled: deshabilitado (p. ej. predicción) */
export type DataState = 'ok' | 'zero' | 'nd' | 'na' | 'pending' | 'insufficient' | 'disabled';
export type StatusLevel = 'good' | 'warn' | 'crit' | 'neutral' | 'nodata' | 'noexposure' | 'na';
export type Direction = 'down' | 'up' | 'range' | 'context';
export type PeriodMode = 'month' | 'ytd' | 'r12' | 'custom';
export type CompareMode = 'none' | 'yoy' | 'prev' | 'r12';
export type KpiGroup = 'R' | 'P' | 'O' | 'H' | 'PE' | 'CO' | 'BR' | 'D' | 'Q' | 'C' | 'SIG';

const seq = (p: string, n: number) => Array.from({ length: n }, (_, i) => `${p}${String(i + 1).padStart(2, '0')}`);
/** Catálogo del encargo: 82 indicadores y variantes por país. */
export const KPI_IDS_82: string[] = [
  ...seq('R', 16), ...seq('P', 18), ...seq('O', 16), ...seq('H', 8), ...seq('PE', 3), ...seq('CO', 6), ...seq('BR', 2), ...seq('D', 8), ...seq('Q', 5),
];
/** Variantes de conciliación con el origen (esquema corporativo reportado ×1e6 HH): C01 IF, C02 IS, C03 IA, C04 TRIFR/TACSA. SIG = señales tempranas por reglas. */
export const KPI_IDS_EXTRA: string[] = ['C01', 'C02', 'C03', 'C04', 'SIG'];
export const KPI_IDS: string[] = [...KPI_IDS_82, ...KPI_IDS_EXTRA];
/** Banda con todas las bases disponibles (DEMO o carga completa). */
export const DEFAULT_CARDS_FULL = ['R05', 'R11', 'R12', 'P04', 'O12', 'O09', 'H01', 'SIG'];
/** Banda inicial con solo estadísticas mensuales reportadas (sección 19.5); HH y dotación van en el bloque de contexto. */
export const DEFAULT_CARDS_REPORTED = ['R05', 'R11', 'R12', 'C02', 'R06', 'R15', 'Q02', 'SIG'];
/** Campos de texto por KPI: clave i18n `kpi.<ID>.<campo>`. */
export const KPI_TEXT_FIELDS = ['name', 'short', 'purpose', 'formula', 'numerator', 'denominator', 'exclusions', 'source', 'periodicity', 'owner', 'target', 'missing'] as const;

export interface KpiDef {
  id: string; group: KpiGroup;
  category: 'result' | 'exposure' | 'preventive' | 'proactive' | 'health' | 'national' | 'predictive' | 'quality' | 'reconciliation' | 'signals';
  unit: UnitKey; decimals: number; direction: Direction; constant: number | null;
  profile: 'corporate' | CountryCode; requires: ModuleKey[]; version: string; effectiveDate: ISODate;
}

export interface Filters {
  periodMode: PeriodMode; month: Month; from: Month; to: Month;   // from/to coherentes con periodMode+month (custom: libres)
  compare: CompareMode;
  countries: CountryCode[]; projectIds: string[];                 // vacío = todos
  companies: string[]; activities: string[]; shifts: string[]; risks: string[]; severities: string[]; eventTypes: string[];
  bodyPart: string | null; mechanism: string | null;              // filtran numeradores; el denominador HH se conserva (se explica)
}
export interface Prefs { cards: string[]; mapLayer: MapLayer; mapIndicator: string | null }
export interface FilterOptions {
  months: Month[]; minMonth: Month | null; maxMonth: Month | null;
  countries: Array<{ code: CountryCode; hasData: boolean }>;
  projects: Array<{ id: string; name: string; country: CountryCode; status: Project['status']; isDemo: boolean }>;
  companies: string[]; activities: string[]; shifts: string[]; risks: string[]; severities: string[]; eventTypes: string[];
  /** false = dimensión no disponible en la fuente (control deshabilitado con explicación). */
  availableDims: Record<'company' | 'activity' | 'shift' | 'risk' | 'severity' | 'eventType' | 'bodyPart' | 'mechanism', boolean>;
}

export interface CoverageNote { country?: CountryCode; projectId?: string; kind: 'included' | 'excluded' | 'partial'; reason: TextRef }
export interface KpiCompare {
  mode: CompareMode; from: Month; to: Month; value: number | null;
  abs: number | null; pct: number | null; pp: number | null;   // pct solo si base ≠ 0; pp para porcentajes
  coverageEquivalent: boolean; note: TextRef | null;
}
export interface KpiValue {
  id: string; state: DataState; value: number | null; unit: UnitKey; decimals: number; direction: Direction;
  numerator: number | null; denominator: number | null; constant: number | null;
  reason: TextRef | null;                       // por qué N/D, N/A, pendiente, deshabilitado…
  status: StatusLevel; statusNote: TextRef | null;
  target: { value: number; kind: 'corporate' | 'contractual' | 'normative'; version: string; note: TextRef | null } | null;
  compare: KpiCompare | null;
  spark: Array<{ month: Month; value: number | null }>;   // hasta 13 puntos mensuales
  interval: [number, number] | null;            // IC 95 % (tasas) cuando aplica
  coverage: CoverageNote[];
  flags: string[];                              // small_exposure · mixed_definitions · recalculated_differs · reported_count · demo · simulation · target_scope_unconfirmed · active_critical_failure
  byCountry: Partial<Record<CountryCode, { value: number | null; state: DataState; numerator: number | null; denominator: number | null; status: StatusLevel }>>;
  secondary: Array<{ label: TextRef; value: number | null; unit: UnitKey; decimals: number }>; // líneas de apoyo en la tarjeta (p. ej. 12M, conteo)
}

// ---------------- mapa ----------------
export type MapLayer = 'events' | 'exposure' | 'controls' | 'actions' | 'health';
export interface MapCountry {
  code: CountryCode; status: StatusLevel; state: DataState; value: number | null; sizeValue: number | null;
  reason: TextRef | null; projects: number; activeProjects: number; selected: boolean; hasData: boolean;
}
export interface MapMarker {
  projectId: string; name: string; country: CountryCode; lat: number; lon: number; status: StatusLevel; state: DataState;
  value: number | null; sizeValue: number | null; isDemo: boolean; selected: boolean;
}
export interface MapModel {
  layer: MapLayer; layers: Array<{ key: MapLayer; availability: Availability }>;
  indicatorId: string; unit: UnitKey; decimals: number; sizeUnit: UnitKey; period: { from: Month; to: Month };
  statusDefinition: TextRef;               // definición explícita de verde/ámbar/rojo y de los estados sin dato
  countries: MapCountry[];
  markers: MapMarker[];                    // solo proyectos con coordenadas (validadas o DEMO)
  unlocated: Array<Omit<MapMarker, 'lat' | 'lon'>>; // proyectos reales sin maestro de coordenadas → lista
  sizeDomain: [number, number]; note: TextRef | null;
}
export interface RegionMapProps {
  model: MapModel; lang: Lang; theme: 'dark' | 'light'; mode: '3d' | '2d' | 'list'; reducedMotion: boolean;
  t: TFn; fmt: Formatters;
  onModeChange(m: '3d' | '2d' | 'list'): void;
  onSelectCountry(code: CountryCode | null): void;   // 1.er clic: filtra
  onSelectProject(id: string | null): void;          // 1.er clic: filtra
  onOpenProject(id: string): void;                   // 2.º clic: ficha
  onLayerChange(l: MapLayer): void;
}

// ---------------- tendencias ----------------
export interface SeriesPoint { month: Month; value: number | null; lo?: number | null; hi?: number | null; flag?: string | null }
export interface Series {
  key: string; label: TextRef; kind: 'bar' | 'line' | 'target' | 'forecast' | 'band';
  colorRole: string;                       // token CSS, p. ej. 'seq-5', 'series-1', 'target', 'deemph'
  points: SeriesPoint[];
}
export interface TrendChart { key: 'counts' | 'rates' | 'exposure'; title: TextRef; unit: UnitKey; decimals: number; stacked: boolean; series: Series[]; notes: TextRef[] }
export interface TrendModel {
  months: Month[]; selected: { from: Month; to: Month }; charts: TrendChart[];
  forecast: { enabled: boolean; isSimulation: boolean; cutoff: Month | null; reason: TextRef | null };
}

// ---------------- paneles ----------------
export interface RiskCell {
  risk: string; projectId: string; due: number; done: number; conform: number; activeFailures: number;
  coveragePct: number | null; effectivenessPct: number | null; status: StatusLevel;
}
export interface RiskPanelModel {
  availability: Availability; risks: Array<{ key: string; label: TextRef }>; projects: Array<{ id: string; name: string }>;
  cells: RiskCell[]; coverage: KpiValue; effectiveness: KpiValue; activeFailures: KpiValue;
}
export interface Signal {
  id: string; ruleId: string; priority: Priority;
  kind: 'safety' | 'exposure' | 'data' | 'control' | 'action' | 'plan' | 'health';
  title: TextRef; whatChanged: TextRef; evidence: Array<{ text: TextRef; ref: CellRef | null }>;
  scope: { country: CountryCode | null; projectId: string | null; projectName: string | null };
  ownerRole: TextRef;            // rol sugerido «por configurar», nunca un nombre
  dueInDays: number | null;      // plazo sugerido
  recommendation: TextRef;       // control recomendado (recomendación, no ejecución)
  isDemo: boolean;
}
export interface PredictiveGate {
  enabled: boolean; isSimulation: boolean; reasons: TextRef[];
  validation: null | {
    model: string; version: string; trainedAt: string; window: { from: Month; to: Month }; horizons: number[];
    sample: { months: number; events: number }; baselineName: string; baselineScore: number | null; candidateScore: number | null;
    intervalCoverage: number | null; calibration: TextRef | null; lastValidatedAt: string;
  };
  outputs: null | {
    expected: Array<{ horizonDays: 30 | 60 | 90; expected: number; lo: number; hi: number }>;   // D01
    probability: Array<{ horizonDays: 30 | 60 | 90; p: number }>;                               // D02
    futureRate: { value: number; hhAssumed: number; assumption: TextRef } | null;                // D03
  };
}
export interface SignalsModel { signals: Signal[]; counts: Record<Priority, number>; predictive: PredictiveGate }

export interface PlanCell { program: string; month: Month; due: number; done: number; pct: number | null; state: 'ok' | 'late' | 'future' | 'na' }
export interface PlanPanelModel {
  availability: Availability; programs: Array<{ key: string; label: TextRef }>; months: Month[]; cells: PlanCell[];
  toDate: KpiValue; annual: KpiValue; weighted: KpiValue;
  byProgram: Array<{ program: string; due: number; done: number; pct: number | null }>;
  training: { availability: Availability; hours: KpiValue; intensity: KpiValue; monthly: SeriesPoint[] };
}
export interface HealthPanelModel {
  availability: Availability;            // salud agregada
  injuries: Availability;                // detalle de casos (cuerpo/mecanismos)
  bodyParts: Array<{ key: string; label: TextRef; cases: number; view: 'front' | 'back' | 'both' }>;
  totalCases: number; multiZoneCases: number;
  mechanisms: Array<{ key: string; label: TextRef; cases: number; cumPct: number }>;
  denominatorNote: TextRef | null;       // «el filtro de cuerpo/mecanismo no reduce las HH…»
  surveillance: KpiValue; hygieneOverLimit: KpiValue;
  /** Disponible con conteos reportados: consecuencia real vs. potencial por nivel (no se suman entre sí). */
  pyramid: { availability: Availability; levels: Array<{ level: string; label: TextRef; consequence: number | null; potential: number | null }>; notes: TextRef[] };
  lostDays: KpiValue;
}
export interface NextStep { id: string; text: TextRef; evidence: TextRef | null; ownerRole: TextRef; dueInDays: number | null; source: 'data_quality' | 'reconciliation' | 'signal' | 'action' | 'module' }
export interface ActionsPanelModel {
  availability: Availability;
  aging: Array<{ bucket: '0-30' | '31-60' | '61-90' | '90+'; openByAge: number; overdueByDelay: number }>;
  overdueCritical: KpiValue; overdueTotal: KpiValue; closure: KpiValue; onTime: KpiValue;
  delay: { median: number | null; p90: number | null };
  nextSteps: NextStep[];
}
export interface ProjectRow {
  projectId: string; name: string; country: CountryCode; status: Project['status']; isDemo: boolean; hasCoords: boolean; state: DataState;
  hh: number | null; workers: number | null; fatal: number | null; lti: number | null; tri: number | null; hipo: number | null; lostDays: number | null;
  ltifr: number | null; ltifrCI: [number, number] | null; trifr: number | null; trifrCI: [number, number] | null;
  ssoma: number | null; attention: number | null;   // «Puntaje de atención» 0–100: nunca con %
  statusLevel: StatusLevel; smallExposure: boolean; selected: boolean;
}
export interface SourceStatus { key: string; file: string | null; country: CountryCode | null; loadedAt: string | null; lastDataMonth: Month | null; state: 'loaded' | 'missing' | 'stale' | 'error'; note: TextRef | null }
export interface QualityModel {
  completeness: KpiValue; exposureCoverage: KpiValue; duplicates: KpiValue; timeliness: KpiValue; freshness: KpiValue;
  coverage: Array<{ country: CountryCode; measure: TextRef; months: Array<{ month: Month; state: 'ok' | 'missing' | 'not_closed' | 'no_exposure' | 'error' | 'future' | 'na' }> }>;
  recon: { material: number; minor: number; info: number };
}
export interface SheetMeta {
  datasetKind: 'real' | 'demo' | 'none'; datasetLabel: string; isDemo: boolean; live: false;
  cutoffMonth: Month | null; lastLoadedAt: string | null;
  period: { mode: PeriodMode; from: Month; to: Month }; comparePeriod: { from: Month; to: Month } | null;
  sources: SourceStatus[]; modules: Record<ModuleKey, Availability>;
  banners: Array<{ level: 'info' | 'warn'; text: TextRef }>;   // p. ej. «BR: accidentes de octubre sin cierre»
}
export interface SheetModel {
  meta: SheetMeta;
  context: { hh: KpiValue; workers: KpiValue };
  cards: KpiValue[];           // exactamente 8, en orden de casilla
  map: MapModel; trend: TrendModel; risk: RiskPanelModel; signals: SignalsModel;
  plan: PlanPanelModel; health: HealthPanelModel; actions: ActionsPanelModel;
  projects: ProjectRow[]; quality: QualityModel;
}

// ---------------- detalle / fichas ----------------
export interface DetailRow { label: TextRef | string; value: number | null; unit?: UnitKey; ref?: CellRef | null; note?: TextRef | null }
export interface KpiDetail {
  def: KpiDef; value: KpiValue;
  numeratorRows: DetailRow[]; denominatorRows: DetailRow[];
  eligibleRecords: number | null; exclusions: Array<{ reason: TextRef; count: number | null }>;
  reported: { value: number | null; ref: CellRef | null; delta: number | null; note: TextRef | null } | null;  // cifra guardada en origen vs recalculada
  series: Array<{ month: Month; value: number | null; numerator: number | null; denominator: number | null }>;
  byProject: Array<{ projectId: string; name: string; country: CountryCode; value: number | null; numerator: number | null; denominator: number | null; state: DataState }>;
  notes: TextRef[]; lastUpdated: string | null;
}
export interface ProjectSheet { project: Project; kpis: KpiValue[]; trend: TrendModel; signals: Signal[]; recon: ReconItem[]; notes: TextRef[] }
export interface LocalMethodology {
  countries: Array<{ code: CountryCode; profile: TextRef; validity: TextRef; population: TextRef; kpis: KpiValue[]; reportedScheme: KpiValue[]; notes: TextRef[] }>;
  rules: TextRef[];
}
export interface ExportTable { key: string; title: string; columns: string[]; rows: Array<Array<string | number | null>>; meta: Array<[string, string]> }

export interface Engine {
  catalog(): KpiDef[];
  defaultFilters(ds: Dataset | null): Filters;
  defaultCards(ds: Dataset | null): string[];
  filterOptions(ds: Dataset | null): FilterOptions;
  sheet(ds: Dataset | null, f: Filters, prefs: Prefs): SheetModel;          // < 300 ms con los datos previstos
  kpiValues(ds: Dataset | null, f: Filters): KpiValue[];                    // todos los KPI_IDS, para el catálogo
  kpiDetail(ds: Dataset | null, f: Filters, kpiId: string): KpiDetail;
  projectSheet(ds: Dataset, f: Filters, projectId: string): ProjectSheet;
  localMethodology(ds: Dataset | null, f: Filters): LocalMethodology;
  exportTables(ds: Dataset, f: Filters, lang: Lang): ExportTable[];
  statRows(ds: Dataset): StatRow[];
  demoDataset(seed?: number): Dataset;
}

// ---------------- ingesta (importador) ----------------
export interface InputFile { name: string; bytes: Uint8Array; lastModified?: number | null }
export interface IngestPreviewBlock { file: string; sheet: string; title: string; country: CountryCode | null; kind: 'project' | 'consolidated' | 'historical' | 'ignored'; firstMonth: Month | null; lastMonth: Month | null; measures: number; note: TextRef | null }
export interface IngestResult {
  dataset: Dataset | null; files: SourceFile[]; blocks: IngestPreviewBlock[];
  issues: ReconItem[]; errors: TextRef[]; stats: { cellsRead: number; factsCreated: number; duplicatesFlagged: number; errorCells: number; ms: number };
}
export interface IngestApi {
  /** Detecta perfil de cada libro, convierte matrices mensuales a hechos con procedencia y concilia. 100 % local. */
  ingestFiles(files: InputFile[], previous?: Dataset | null): Promise<IngestResult>;
  /** Hoja de cálculo mínima para exportar: usado por src/export. */
  writeWorkbook(sheets: Array<{ name: string; rows: Array<Array<string | number | null>> }>): Uint8Array;
}
export type { SourceFile };
