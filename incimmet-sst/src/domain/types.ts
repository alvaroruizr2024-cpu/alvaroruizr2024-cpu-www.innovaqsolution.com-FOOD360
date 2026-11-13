/**
 * CONTRATO DE DATOS — INCIMMET SST (no contiene datos).
 * Convención de valores en MonthlyFact.v:  undefined = el campo no existe en la fuente (no aplica);
 * null = existe pero está vacío / sin cierre / con error (ver p[k].q);  número = valor informado (0 es un cero real).
 */
export type CountryCode = 'PE' | 'CO' | 'BR';
export const COUNTRIES: CountryCode[] = ['PE', 'CO', 'BR'];
export type Lang = 'es' | 'en' | 'pt';
export const LANGS: Lang[] = ['es', 'en', 'pt'];
export type Month = string;   // 'YYYY-MM'
export type ISODate = string; // 'YYYY-MM-DD'
export interface TextRef { key: string; params?: Record<string, string | number> }
export interface CellRef { file: string; sheet: string; cell: string; formula?: string | null }

export type QualityFlag =
  | 'ok' | 'empty' | 'error' | 'placeholder' | 'template_duplicate' | 'future' | 'not_closed' | 'hardcoded' | 'excluded';

export type MeasureKey =
  | 'hh' | 'workers' | 'lostDays' | 'chargedDays'
  // accidentes con lesión por consecuencia (conteo de accidentes tal como se reporta; NV = nivel INCIMMET)
  | 'accFatal' | 'accLti' | 'accNv3' | 'accNv2' | 'accNv1' | 'accNoLostTime'
  | 'accPerson' | 'accProperty' | 'incPerson' | 'incProperty' | 'incInvestigated'
  // potencial (no es consecuencia real)
  | 'hpriLoss' | 'hpriNoLoss' | 'pg56' | 'pg4' | 'pg3' | 'pg2' | 'pg1'
  | 'trainingHours' | 'ssomaScore'
  // solo disponibles cuando hay registros individuales (events/cases)
  | 'fatalities' | 'casesInjury' | 'casesLti' | 'casesRestricted' | 'casesMedical' | 'casesFirstAid' | 'nearMiss' | 'hazardReports';

export interface Project {
  id: string; name: string; country: CountryCode;
  entity: string | null; client: string | null; activity: string | null;
  status: 'active' | 'closed' | 'unknown';
  /** Solo con maestro validado. Proyectos DEMO: coords ficticias con coordsVerified=false y coordsSource='DEMO'. */
  coords: { lat: number; lon: number } | null; coordsVerified: boolean; coordsSource: string | null;
  /** IANA; null si no hay maestro aprobado (Brasil no recibe una zona única por defecto). */
  timezone: string | null;
  isDemo: boolean;
  firstMonth: Month | null; lastMonth: Month | null;
  sourceKey: string | null; sourceBlock: CellRef | null;
  notes?: TextRef[];
}

export interface FactProv { c: string; f?: string | null; raw?: string | number | null; q?: QualityFlag } // c = 'Hoja!A1'
export interface MonthlyFact {
  projectId: string; country: CountryCode; month: Month;
  company?: string | null; shift?: string | null; activity?: string | null;
  basis: 'reported_counts' | 'records';
  file?: string;
  v: Partial<Record<MeasureKey, number | null>>;
  p?: Partial<Record<MeasureKey, FactProv>>;
}

export type ReportedIndicator = MeasureKey | 'IF' | 'IS' | 'IA' | 'TRIFR' | 'TACSA' | 'TF' | 'TG' | 'trainingPct';
/** Cifras tal como las guarda la fuente (consolidados, índices, acumulados): solo para conciliación; nunca se suman como hechos. */
export interface ReportedStat {
  scope: 'country' | 'project'; country: CountryCode; projectId: string | null; month: Month;
  indicator: ReportedIndicator; periodType: 'month' | 'ytd' | 'rolling12';
  value: number | null; raw: string | number | null; quality: QualityFlag; ref: CellRef;
}
export interface Target {
  indicator: 'TRIFR' | 'IF' | 'IS' | 'IA'; scope: 'corporate' | 'project'; kind: 'corporate' | 'contractual' | 'normative';
  country: CountryCode | null; projectId: string | null; month: Month;
  stored: number | null;      // valor guardado en la fuente
  effective: number | null;   // valor usado por el motor (regla documentada si difiere de stored)
  flagKey: string | null; ref: CellRef | null; version: string;
}

// ---------- registros individuales (DEMO y futuras cargas reales) ----------
export type EventType = 'accident_injury' | 'accident_property' | 'incident' | 'near_miss' | 'hazard_report';
export interface EventRecord {
  id: string; projectId: string; country: CountryCode;
  occurredAt: ISODate; reportedAt: ISODate | null; closedAt: ISODate | null;
  type: EventType; mechanism: string | null; risk: string | null;
  potential: 1 | 2 | 3 | 4 | 5 | 6 | null; highPotential: boolean; withLoss: boolean;
  shift: string | null; company: string | null; activity: string | null;
  descriptionOriginal?: string | null;
  firstResponseHours?: number | null; reporterId?: string | null; qualityOk?: boolean | null;
  investigationDueAt?: ISODate | null; investigationClosedAt?: ISODate | null;
}
export type CaseClass = 'fatal' | 'lti' | 'restricted' | 'medical' | 'first_aid';
export interface CaseRecord {
  id: string; eventId: string; projectId: string; classification: CaseClass;
  workRelationship: 'own' | 'contractor'; lostDays: number; chargedDays: number; bodyParts: string[];
}
export interface ControlRecord {
  id: string; projectId: string; risk: string; barrier: string; standard: string;
  owner: string | null; frequencyDays: number; critical: boolean;
}
export interface VerificationRecord {
  id: string; controlId: string; projectId: string; dueAt: ISODate; doneAt: ISODate | null;
  result: 'conform' | 'fail' | 'invalid' | null; hasEvidence: boolean; operational: boolean | null; recoveredAt: ISODate | null;
}
export interface Reschedule { at: ISODate; from: ISODate; to: ISODate; reason?: string | null }
export interface PlanActivity {
  id: string; projectId: string; program: string; owner: string | null; weight: number;
  baselineDue: ISODate; currentDue: ISODate; reschedules: Reschedule[];
  doneAt: ISODate | null; acceptedAt: ISODate | null; hasEvidence: boolean;
}
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export interface ActionRecord {
  id: string; projectId: string; source: string; findingKey: string | null; priority: Priority; owner: string | null;
  openedAt: ISODate; originalDue: ISODate; currentDue: ISODate; reschedules: Reschedule[];
  closedAt: ISODate | null; acceptedAt: ISODate | null; effectivenessRequired: boolean; effectivenessOk: boolean | null;
}
export type ProgramKey =
  | 'risk_assessment' | 'controls_implemented' | 'inspections' | 'competencies' | 'training' | 'training_effectiveness'
  | 'permits' | 'maintenance' | 'emergency' | 'drills' | 'audits' | 'moc' | 'legal' | 'leadership' | 'participation'
  | 'report_quality' | 'interventions' | 'investigations' | 'health_surveillance' | 'restrictions' | 'hygiene_monitoring'
  | 'ergonomics' | 'fatigue' | 'psychosocial' | 'absenteeism' | 'occupational_disease';
/** Agregado mensual genérico numerador/denominador por programa (salud siempre agregada, sin personas). */
export interface ProgramStat {
  projectId: string; month: Month; program: ProgramKey;
  due?: number; done?: number; onTime?: number; conform?: number; evaluated?: number; eligible?: number;
  applicable?: number; hours?: number; extra?: Record<string, number>;
}
export interface HygieneMeasurement {
  projectId: string; month: Month; agent: 'silica' | 'noise' | 'vibration' | 'heat' | 'gases' | 'other';
  method: string; unit: string; valid: number; overLimit: number; peopleEvaluated?: number; peopleOverexposed?: number;
}

export type ModuleKey =
  | 'exposure' | 'accidents' | 'potential' | 'cases' | 'controls' | 'plan' | 'actions' | 'health' | 'hygiene'
  | 'training' | 'programs' | 'projectsGeo' | 'predictive';
export interface Availability {
  state: 'available' | 'partial' | 'pending' | 'disabled';
  reasonKey: string;             // i18n
  requirements?: string[];       // claves i18n de tablas/campos requeridos
  templateFile?: string | null;  // p. ej. '/templates/plan_anual.csv'
}

export interface SourceFile {
  key: string; name: string; profile: 'corporate' | 'colombia' | 'incired' | 'template' | 'unknown';
  country: CountryCode | null; sha256: string | null; sizeBytes: number | null; loadedAt: string; modifiedAt: string | null;
  lastDataMonth: Month | null;
  sheets: Array<{ name: string; state: 'visible' | 'hidden'; used: boolean; noteKey?: string }>;
  warnings: TextRef[];
}

export interface ReconItem {
  id: string; severity: 'material' | 'minor' | 'info';
  country: CountryCode | null; projectId: string | null; projectName: string | null; months: Month[] | null;
  kpisAffected: string[];
  issueKey: string; params: Record<string, string | number>;   // i18n rec.*
  sourceChosenKey: string; reasonKey: string; ruleKey: string; // i18n rec.*
  reportedValue: number | null; recalculatedValue: number | null; delta: number | null;
  refs: CellRef[];
}

export interface DatasetConfig {
  taxonomyVersion: string;
  triMeasures: MeasureKey[];     // qué conteos forman el TRI del perfil vigente (v1 reportado: accFatal, accLti, accNv3, accNv2)
  ltiMeasures: MeasureKey[];     // v1: accLti
  rateConstant: number;          // 1_000_000
  warnBand: number;              // 0.20 → ámbar hasta meta×1.2
  smallExposureHH: number;       // 100_000
  predictiveApproved: boolean;   // false por defecto: no publicar probabilidades sin aprobación
}

export interface Dataset {
  schema: 1; id: string; kind: 'real' | 'demo'; label: string; createdAt: string;
  cutoffMonth: Month;                 // último mes con datos del consolidado
  sources: SourceFile[];
  projects: Project[];
  monthly: MonthlyFact[];
  reported: ReportedStat[];
  targets: Target[];
  events: EventRecord[]; cases: CaseRecord[];
  controls: ControlRecord[]; verifications: VerificationRecord[];
  planActivities: PlanActivity[]; actions: ActionRecord[];
  programStats: ProgramStat[]; hygiene: HygieneMeasurement[];
  reconciliation: ReconItem[];
  modules: Record<ModuleKey, Availability>;
  config: DatasetConfig;
}

/** Tabla larga de estadísticas mensuales (sección 19.5). Se deriva bajo demanda para exportación/auditoría. */
export interface StatRow {
  country: CountryCode; project: string; month: Month; population: string; indicator: string;
  rawValue: string | number | null; value: number | null; unit: string;
  periodType: 'month' | 'ytd' | 'rolling12'; file: string; sheet: string; cell: string; formula: string | null;
  quality: QualityFlag; version: string; valueKind: 'stored' | 'recalculated';
}
