import type {
  CellRef, CountryCode, MeasureKey, Month, MonthlyFact, Project, QualityFlag, ReconItem, ReportedStat, SourceFile, Target,
} from '../../domain/types';
import type { IngestPreviewBlock } from '../../domain/model';
import type { Cell } from '../xlsx/read';

/** Celda del consolidado de la fuente con el análisis de las referencias de su fórmula. */
export interface ConsolCell {
  country: CountryCode; month: Month; measure: MeasureKey; label: string; ref: CellRef; value: number | null;
  isFormula: boolean; hardcoded: boolean;
  sameRow: string[];                                                             // proyectos sumados desde su fila homóloga
  mismatch: Array<{ projectId: string | null; label: string | null; cell: string }>; // referencias a otra etiqueta o fuera de todo bloque
}
export interface ParsedSource {
  source: SourceFile; country: CountryCode;
  projects: Project[]; monthly: MonthlyFact[]; reported: ReportedStat[]; targets: Target[];
  blocks: IngestPreviewBlock[]; items: ReconItem[]; consol: ConsolCell[];
  stats: { cellsRead: number; duplicatesFlagged: number; errorCells: number };
}

export const monthIndex = (m: Month): number => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)) - 1;
export const monthFromIndex = (i: number): Month => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
export const monthAdd = (m: Month, d: number): Month => monthFromIndex(monthIndex(m) + d);
/** Agrupa meses ordenados en tramos consecutivos. */
export function monthRuns(months: Month[]): Month[][] {
  const out: Month[][] = [];
  const sorted = [...new Set(months)].sort();
  for (const m of sorted) {
    const last = out[out.length - 1];
    if (last && monthIndex(last[last.length - 1]) + 1 === monthIndex(m)) last.push(m); else out.push([m]);
  }
  return out;
}
export const slug = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'sin-nombre';

/** Texto numérico con separadores según evidencia ('1.234,5' · '1,234.5' · '1234,5'). */
export function parseNumber(s: string): number | null {
  let t = s.trim().replace(/\s/g, '');
  if (!/^[-+]?[\d.,]+%?$/.test(t) || !/\d/.test(t)) return null;
  const pct = t.endsWith('%');
  if (pct) t = t.slice(0, -1);
  const ld = t.lastIndexOf('.');
  const lc = t.lastIndexOf(',');
  if (ld >= 0 && lc >= 0) t = ld > lc ? t.replace(/,/g, '') : t.replace(/\./g, '').replace(',', '.');
  else if (lc >= 0) t = t.split(',').length === 2 && t.length - lc - 1 !== 3 ? t.replace(',', '.') : t.replace(/,/g, '');
  else if (ld >= 0 && t.split('.').length > 2) t = t.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) ? (pct ? n / 100 : n) : null;
}
/** Valor numérico de una celda: en blanco → null/'empty'; error guardado → null/'error' (nunca cero); 0 explícito → 0. */
export function readNum(cell: Cell | undefined): { value: number | null; q: QualityFlag; raw: string | number | null } {
  if (!cell || cell.v === null) return { value: null, q: 'empty', raw: null };
  if (cell.t === 'n' && typeof cell.v === 'number') return { value: cell.v, q: 'ok', raw: cell.v };
  if (cell.t === 'e') return { value: null, q: 'error', raw: String(cell.v) };
  if (cell.t === 's' && typeof cell.v === 'string') {
    if (cell.v.trim() === '') return { value: null, q: 'empty', raw: null };
    const n = parseNumber(cell.v);
    return n === null ? { value: null, q: 'error', raw: cell.v } : { value: n, q: 'ok', raw: cell.v };
  }
  return { value: null, q: 'error', raw: typeof cell.v === 'boolean' ? String(cell.v) : cell.v };
}

/** Fuente elegida, motivo y regla por tipo de hallazgo (claves i18n rec.*). */
const META: Record<string, [string, string, string]> = {
  consol_omits_blocks: ['project_blocks', 'formula_scope', 'sum_blocks'],
  consol_ref_shifted: ['project_blocks', 'formula_ref', 'sum_blocks'],
  consol_hardcoded: ['project_blocks', 'hardcoded', 'sum_blocks'],
  consol_flagged: ['project_blocks', 'flagged_excluded', 'sum_blocks'],
  consol_differs: ['project_blocks', 'unexplained', 'sum_blocks'],
  index_differs: ['recalculated', 'components_differ', 'recalc_indices'],
  index_coverage: ['recalculated', 'coverage_mismatch', 'paired_months'],
  error_cells: ['none', 'zero_denominator', 'no_zero_fill'],
  future_months: ['none', 'header_only', 'last_hh_month'],
  not_closed: ['contractor_form', 'numerator_empty', 'null_not_zero'],
  template_duplicate: ['project_blocks', 'identical_series', 'duplicate_null'],
  header_dates: ['project_blocks', 'header_dates', 'header_sequence'],
  placeholder: ['project_blocks', 'placeholder', 'placeholder_null'],
  target_autofill: ['modal_target', 'autofill', 'modal_year'],
  sheets_not_imported: ['newest_sheet', 'overlapping_views', 'single_canonical'],
  section_not_imported: ['country_workbook', 'overlapping_copy', 'single_canonical'],
  year_from_filename: ['contractor_form', 'no_year_in_sheet', 'year_filename'],
  hidden_sheet: ['contractor_form', 'unverified_sheet', 'hidden_not_combined'],
  empty_sheet: ['contractor_form', 'no_records', 'cases_pending'],
  headcount_missing: ['none', 'blank_row', 'null_not_zero'],
  location_pending: ['none', 'no_master', 'master_required'],
  hardcoded_constant: ['as_stored', 'hardcoded', 'flag_only'],
  ref_mismatch_no_effect: ['as_stored', 'formula_ref', 'flag_only'],
  composition_change: ['project_blocks', 'formula_scope', 'sum_blocks'],
  person_row_not_sum: ['level_rows', 'definition_unconfirmed', 'levels_count'],
  meta_cell_ignored: ['none', 'not_a_target', 'flag_only'],
  unlabeled_row: ['none', 'no_label', 'flag_only'],
  avg_of_pct: ['recalculated', 'avg_pct', 'sum_ratio'],
  source_missing: ['none', 'not_loaded', 'load_source'],
  training_unit: ['contractor_form', 'unit_unconfirmed', 'flag_only'],
  lost_days_combined: ['contractor_form', 'combined_days', 'flag_only'],
};
export const ISSUE_TYPES = Object.keys(META);
export interface ItemInit {
  severity?: ReconItem['severity']; country: CountryCode | null; projectId?: string | null; projectName?: string | null;
  months?: Month[] | null; kpis?: string[]; params?: Record<string, string | number>;
  reported?: number | null; recalculated?: number | null; refs?: CellRef[];
}
export function mkItem(type: string, init: ItemInit): ReconItem {
  const meta = META[type.split('.')[0]] ?? ['none', 'unexplained', 'flag_only']; // 'index_differs.ytd' comparte metadatos con su tipo base
  const rep = init.reported ?? null;
  const rec = init.recalculated ?? null;
  return {
    id: '', severity: init.severity ?? 'info', country: init.country, projectId: init.projectId ?? null, projectName: init.projectName ?? null,
    months: init.months && init.months.length ? [...init.months].sort() : null, kpisAffected: init.kpis ?? [],
    issueKey: 'rec.issue.' + type, params: init.params ?? {},
    sourceChosenKey: 'rec.source.' + meta[0], reasonKey: 'rec.reason.' + meta[1], ruleKey: 'rec.rule.' + meta[2],
    reportedValue: rep, recalculatedValue: rec, delta: rep !== null && rec !== null ? rec - rep : null,
    refs: (init.refs ?? []).slice(0, 12),
  };
}
/** KPI del catálogo afectados por cada medida o índice de origen. */
export const KPI_BY_INDICATOR: Record<string, string[]> = {
  hh: ['R01', 'R11', 'R12', 'C01', 'C02', 'C04', 'Q02'], workers: ['R02'], lostDays: ['R10', 'C02', 'C03'],
  accFatal: ['R05', 'R12', 'C01', 'C04'], accLti: ['R06', 'R11', 'R12', 'C01', 'C04'], accNv3: ['R07', 'R12', 'C04'], accNv2: ['R07', 'R12', 'C04'],
  accNv1: ['R08'], accNoLostTime: ['R07', 'BR01'], accPerson: ['R04'], accProperty: ['R09'], incPerson: ['R03'], incProperty: ['R03'], incInvestigated: ['R03'],
  hpriLoss: ['R15'], hpriNoLoss: ['R15'], pg56: ['R15'], pg4: ['R15'], pg3: ['R15'], pg2: ['R15'], pg1: ['R15'],
  IF: ['C01', 'R11'], IS: ['C02'], IA: ['C03'], TRIFR: ['C04', 'R12'], TACSA: ['C04', 'R12'], TF: ['BR01'], TG: ['BR02'],
};
export const kpisFor = (ind: string, country: CountryCode | null): string[] => {
  const base = KPI_BY_INDICATOR[ind] ?? [];
  const pe = country === 'PE' ? (ind === 'IF' ? ['PE01'] : ind === 'IS' ? ['PE02'] : ind === 'IA' ? ['PE03'] : []) : [];
  return [...new Set([...base, ...pe])];
};
