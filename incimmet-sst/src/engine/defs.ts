import type { CountryCode, ModuleKey } from '../domain/types';
import type { Direction, KpiDef, KpiGroup, UnitKey } from '../domain/model';
import { KPI_IDS } from '../domain/model';

export const METHOD_VERSION = '1.0.0';
export const EFFECTIVE_DATE = '2026-11-13';
// id | unidad | decimales | dirección | constante | módulos requeridos
const T = `
R01|hh|0|context||exposure
R02|people|0|context||exposure
R03|events|0|context||accidents
R04|events|0|down||accidents
R05|events|0|down||accidents
R06|events|0|down||accidents
R07|events|0|down||accidents
R08|cases|0|context||accidents
R09|events|0|down||accidents
R10|days|0|down||accidents
R11|per1e6hh|2|down|1000000|exposure,accidents
R12|per1e6hh|2|down|1000000|exposure,accidents
R13|per200khh|2|down|200000|exposure
R14|per200khh|2|down|200000|exposure
R15|per1e6hh|2|down|1000000|exposure,potential
R16|cases|0|context||cases
P01|pct|1|up|100|programs
P02|pct|1|up|100|programs
P03|pct|1|up|100|controls
P04|pct|1|up|100|controls
P05|count|0|down||controls
P06|pct|1|up|100|programs
P07|pct|1|up|100|programs
P08|pct|1|up|100|programs
P09|pct|1|up|100|programs
P10|pct|1|up|100|programs
P11|pct|1|up|100|programs
P12|pct|1|up|100|programs
P13|pct|1|up|100|programs
P14|pct|1|up|100|programs
P15|pct|1|up|100|programs
P16|pct|1|up|100|programs
P17|hours|0|context||training
P18|pct|2|context|100|training,exposure
O01|per1e4hh|2|context|10000|exposure,cases
O02|pct|1|up|100|programs
O03|pct|1|up|100|programs
O04|pct|1|up|100|programs
O05|hours|1|down||cases
O06|pct|1|up|100|programs
O07|pct|1|up|100|actions
O08|pct|1|up|100|actions
O09|count|0|down||actions
O10|pct|1|up|100|actions
O11|pct|1|down|100|actions
O12|pct|1|up|100|plan
O13|pct|1|up|100|plan
O14|pct|1|up|100|plan
O15|days|0|down||actions
O16|pct|1|up|100|programs
H01|pct|1|up|100|health
H02|pct|1|up|100|health
H03|pct|1|up|100|hygiene
H04|pct|1|down|100|hygiene
H05|pct|1|down|100|hygiene
H06|pct|1|up|100|health
H07|pct|1|up|100|health
H08|pct|1|up|100|health
PE01|per1e6hh|2|down|1000000|exposure,accidents
PE02|per1e6hh|2|down|1000000|exposure,accidents
PE03|index|3|down||exposure,accidents
CO01|per100workers|2|down|100|exposure,accidents
CO02|per100workers|2|down|100|exposure,accidents
CO03|pct|1|down|100|accidents
CO04|per100kworkers|1|down|100000|health
CO05|per100kworkers|1|down|100000|health
CO06|pct|2|down|100|health
BR01|per1e6hh|2|down|1000000|exposure,accidents
BR02|per1e6hh|2|down|1000000|exposure,accidents
D01|events|1|context||predictive
D02|probability|2|context||predictive
D03|per1e6hh|2|context|1000000|predictive
D04|index|2|range||exposure,accidents
D05|probability|2|down||actions
D06|pct|1|up|100|plan
D07|pct|1|down|100|controls
D08|events|1|context||predictive
Q01|pct|1|up|100|
Q02|pct|1|up|100|
Q03|pct|1|down|100|
Q04|pct|1|up|100|
Q05|months|0|down||
C01|per1e6hh|2|down|1000000|exposure,accidents
C02|per1e6hh|2|down|1000000|exposure,accidents
C03|index|3|down||exposure,accidents
C04|per1e6hh|2|down|1000000|exposure,accidents
SIG|count|0|down||`;
const CAT: Record<KpiGroup, KpiDef['category']> = { R: 'result', P: 'preventive', O: 'proactive', H: 'health', PE: 'national', CO: 'national', BR: 'national', D: 'predictive', Q: 'quality', C: 'reconciliation', SIG: 'signals' };
export const DEFS: KpiDef[] = T.trim().split('\n').map((line) => {
  const [id, unit, dec, dir, k, req] = line.split('|');
  const group = (id === 'SIG' ? 'SIG' : id.replace(/\d+/g, '')) as KpiGroup;
  return {
    id, group, category: id === 'R01' || id === 'R02' ? 'exposure' : CAT[group], unit: unit as UnitKey, decimals: Number(dec), direction: dir as Direction,
    constant: k ? Number(k) : null, profile: group === 'PE' || group === 'CO' || group === 'BR' ? (group as CountryCode) : 'corporate',
    requires: (req ? req.split(',') : []) as ModuleKey[], version: METHOD_VERSION, effectiveDate: EFFECTIVE_DATE,
  };
});
export const DEF: Map<string, KpiDef> = new Map(DEFS.map((d) => [d.id, d] as const));
if (DEFS.length !== KPI_IDS.length || KPI_IDS.some((id) => !DEF.has(id))) throw new Error('engine: catálogo incompleto');
