/** Libros sintéticos DEMO para las pruebas de ingesta (ninguna cifra ni nombre real). */
import { buildXlsx, col, layout, monthsFrom, NEW_FORMAT, OLD_FORMAT, putBlock, type Val } from './helpers';

const z = (n: number): number[] => Array.from({ length: n }, () => 0);

/** Corporativo: hoja vigente MediaMovil31 (consolidado sin título + 4 proyectos numerados + 1 histórico de formato anterior) y una hoja anterior superpuesta. */
export function corporateWorkbook(): Uint8Array {
  const months = monthsFrom('2031-01', 8);
  const cells: Record<string, Val> = {};
  const stride = layout(NEW_FORMAT).height + 2;
  const at = (k: number): number => 10 + k * stride;
  const hhA = [1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700];
  const hhB: Val[] = [700, 710, 720, null, null, 300, 310, 320];       // 3 primeros meses = copia de GAMMA (resto de plantilla)
  const hhG = [700, 710, 720, 730, 740, 750, 760, 770];
  const hhD: Val[] = [400, 410, 420, 430, 1, null, null, null];         // mes 5: marcador de posición (HH = 1, dotación 0)
  const A = putBlock(cells, NEW_FORMAT, 2, 4, { title: '1. DEMO ALFA', start: at(1), months, values: {
    hh: hhA, workers: [10, 10, 10, 10, 10, 10, 10, 10], accFatal: z(8), accLti: [0, 1, 0, 0, 0, 0, 0, 0], accNv3: z(8), accNv2: [0, null, 0, 0, 0, 0, 0, 0], accNv1: z(8),
    accProperty: [1, 0, 0, 0, 0, 0, 0, 0], lostDays: [0, 5, 0, 0, 0, 0, 0, 0], pg56: z(8), pg4: z(8), ssoma: [90, 91, 92, 93, 94, 95, 96, 97], pTrifr: [3, 3, 3, 3, 3, 3, 3, 3], tTrifr: [4, 4, 4, 4, 4, 4, 4, 4],
    trifr: months.map((_, i) => ({ f: `SUM(${col(4, i)}${at(1) + 9}:${col(4, i)}${at(1) + 12})*1000000/${col(4, i)}${at(1) + 26}`, v: i === 1 ? 1e6 / 1100 : 0 })),
  } });
  const B = putBlock(cells, NEW_FORMAT, 2, 4, { title: '2. DEMO BETA', start: at(2), months, values: { hh: hhB, workers: [7, 7, 7, null, null, 3, 3, 3], accLti: z(8), pg4: z(8), pg56: z(8) } });
  const G = putBlock(cells, NEW_FORMAT, 2, 4, { title: '3. DEMO GAMMA', start: at(3), months, values: { hh: hhG, workers: [8, 8, 8, 8, 8, 8, 8, 8], accLti: [0, 0, 0, 0, 1, 0, 0, 0], pg4: [0, 0, 0, 0, 2, 0, 0, 0], pg56: z(8) } });
  const D = putBlock(cells, NEW_FORMAT, 2, 4, { title: '4. DEMO DELTA', start: at(4), months, values: { hh: hhD, workers: [5, 5, 5, 5, 0, null, null, null], accLti: [0, 0, 0, 0, 0, null, null, null], pg4: z(5), pg56: z(5) } });
  const H = putBlock(cells, OLD_FORMAT, 2, 4, { title: 'DEMO HISTORICO', start: at(5), months, values: { hh: [50, 60], workers: [1, 1], accLti: [0, 0] } });
  const n = (v: Val): number => (typeof v === 'number' ? v : 0);
  const sum = (rows: number[], i: number): string => rows.map((r) => col(4, i) + r).join('+');
  const hhRep = months.map((_, i) => hhA[i] + n(hhB[i]) + hhG[i] + n(hhD[i]) + (i < 2 ? [50, 60][i] : 0));
  const ltiRep = [0, 1, 0, 0, 0, 0, 0, 0]; // solo ALFA + BETA: omite GAMMA y DELTA
  const C = at(0);
  putBlock(cells, NEW_FORMAT, 2, 4, { title: ' ', start: C, months, values: {
    hh: months.map((_, i) => ({ f: sum([A.hh, B.hh, G.hh, D.hh, H.hh], i), v: hhRep[i] })),
    workers: months.map((_, i) => ({ f: sum([A.workers, B.workers, G.workers, D.workers, H.workers], i), v: [31, 31, 30, 23, 18, 21, 21, 21][i] })),
    accFatal: months.map((_, i) => ({ f: sum([A.accFatal, B.accFatal, G.accFatal, D.accFatal], i), v: 0 })),
    accLti: months.map((_, i) => ({ f: sum([A.accLti, B.accLti], i), v: ltiRep[i] })),
    accNv3: months.map((_, i) => ({ f: sum([A.accNv3], i), v: 0 })),
    accNv2: months.map((_, i) => ({ f: sum([A.accNv2], i), v: 0 })),
    accNv1: months.map((_, i) => ({ f: sum([A.accNv1], i), v: 0 })),
    accPerson: months.map(() => 0),                                    // mes 2: no coincide con la suma de niveles (1)
    accProperty: months.map((_, i) => ({ f: sum([A.accProperty], i), v: i === 0 ? 1 : 0 })),
    pg4: months.map((_, i) => ({ f: sum([A.pg4, B.pg4, G.pg4, D.pg4], i), v: i === 4 ? 2 : 0 })),
    lostDays: months.map((_, i) => ({ f: sum([A.lostDays], i), v: i === 1 ? 5 : 0 })),
    trifr: months.map((_, i) => ({ f: `SUM(${col(4, i)}${C + 9}:${col(4, i)}${C + 12})*1000000/${col(4, i)}${C + 26}`, v: (ltiRep[i] * 1e6) / hhRep[i] })),
    if: months.map((_, i) => (i === 7 ? { f: `${col(4, i)}${C + 10}*1000000/0`, e: '#DIV/0!' } : { f: `(${col(4, i)}${C + 10}+${col(4, i)}${C + 9})*1000000/${col(4, i)}${C + 26}`, v: (ltiRep[i] * 1e6) / hhRep[i] })),
    hhY: months.map((_, i) => ({ f: `SUM($D${C + 26}:${col(4, i)}${C + 26})`, v: hhRep.slice(0, i + 1).reduce((s, x) => s + x, 0) })),
    tTrifr: [4, 4, 4, 4, 4, 4, 4, 5],                                  // último mes +1: patrón de autorrelleno
    tIf: [2, 2, 2, 2, 2, 2, 2, 2],
  } });
  cells[col(4, 8) + (C + 26)] = { f: `SUM(D${C + 26}:K${C + 26})`, v: 99999 }; // columna de totales sin fecha en el encabezado: se ignora
  const old: Record<string, Val> = {};
  putBlock(old, NEW_FORMAT, 2, 4, { title: '1. DEMO ANTIGUO', start: 10, months: monthsFrom('2030-01', 6), values: { hh: [9, 9, 9, 9, 9, 9] } });
  return buildXlsx([{ name: 'MediaMovil30', cells: old }, { name: 'MediaMovil31', cells, hiddenRows: [at(5) + 1] }, { name: 'DEMO Cliente', state: 'hidden', cells: { A1: 'DEMO' } }]);
}

/** Colombia: formato anterior; consolidado en A3; dos proyectos; dos meses finales solo con encabezado. */
export function colombiaWorkbook(): Uint8Array {
  const months = monthsFrom('2031-01', 6);
  const cells: Record<string, Val> = {};
  const stride = layout(OLD_FORMAT).height + 2;
  const N = putBlock(cells, OLD_FORMAT, 1, 2, { title: 'DEMO NORTE ', start: 3 + stride, months, values: {
    hh: [100, 110, 120, 130], workers: [4, 4, 4, 4], pg56: [1, 0, 0, 0], pg4: [0, 2, 0, 0], accFatal: z(4), accLti: [0, 0, 1, 0], accNv3: z(4), accNv2: z(4), lostDays: [0, 0, 3, 2],
    tacsa: months.map((_, i) => (i < 4 ? { f: `SUM(${col(2, i)}${3 + stride + 9}:${col(2, i)}${3 + stride + 12})*1000000/${col(2, i)}${3 + stride + 22}`, v: i === 2 ? 1e6 / 120 : 0 } : null)),
  } });
  const S = putBlock(cells, OLD_FORMAT, 1, 2, { title: 'DEMO SUR', start: 3 + 2 * stride, months, values: { hh: [200, 210, 220, 0], workers: [6, 6, 6, 0], pg56: z(4), pg4: [0, 1, 0, 0], accFatal: z(4), accLti: z(4), lostDays: z(4) } });
  const f = (rows: number[], i: number): string => '+SUM(' + rows.map((r) => col(2, i) + r).join('+') + ')';
  const hh = [300, 320, 340, 130, 0, 0];
  const lti = [0, 0, 1, 0, 0, 0];
  putBlock(cells, OLD_FORMAT, 1, 2, { title: 'COLOMBIA GENERAL', start: 3, months, values: {
    hh: months.map((_, i) => ({ f: f([N.hh, S.hh], i), v: hh[i] })),
    workers: months.map((_, i) => ({ f: f([N.workers, S.workers], i), v: [10, 10, 10, 4, 0, 0][i] })),
    pg56: months.map((_, i) => ({ f: f([N.pg56, S.pg56], i), v: i === 0 ? 1 : 0 })),
    pg4: months.map((_, i) => ({ f: f([N.pg56, S.pg56], i), v: i === 0 ? 1 : 0 })),     // desplazada: suma las filas «Nv. 5,6»
    accFatal: months.map((_, i) => ({ f: f([N.accFatal, S.accFatal], i), v: 0 })),
    accLti: months.map((_, i) => ({ f: f([N.accLti, S.accLti], i), v: lti[i] })),
    lostDays: months.map((_, i) => (i === 2 ? 3 : { f: f([N.lostDays, S.lostDays], i), v: [0, 0, 3, 2, 0, 0][i] })), // mes 3 escrito a mano
    tacsa: months.map((_, i) => (hh[i] ? { f: `SUM(${col(2, i)}12:${col(2, i)}15)*1000000/${col(2, i)}25`, v: (lti[i] * 1e6) / hh[i] } : { f: `SUM(${col(2, i)}12:${col(2, i)}15)*1000000/${col(2, i)}25`, e: '#DIV/0!' })),
    tacsaR: months.map((_, i) => ({ f: `SUM($B12:${col(2, i)}15)*1000000/${col(2, i)}31`, v: (lti.slice(0, i + 1).reduce((s, x) => s + x, 0) * 1e6) / hh.slice(0, i + 1).reduce((s, x) => s + x, 0) })),
    hhR: months.map((_, i) => ({ f: `+SUM($B25:${col(2, i)}25)`, v: hh.slice(0, i + 1).reduce((s, x) => s + x, 0) })),
  } });
  return buildXlsx([{ name: 'Hoja1', cells }]);
}

/** Formulario de contratista: meses como texto, acumulado y meta; junio con HH pero sin cierre de accidentes. */
export function contractorWorkbook(): Uint8Array {
  const c: Record<string, Val> = { C2: 'Anexo DEMO - Estatística', J5: 'Empresa:    ', K5: 'DEMO CONTRATISTA', J6: 'Responsável: DEMO PERSONA', P8: 'Acum. ', Q8: 'Meta' };
  ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].forEach((m, i) => { c[col(4, i) + 8] = m; c[col(4, i) + 18] = 2; });
  const put = (row: number, label: string, vals: Val[], from = 0): void => { c['B' + row] = label; vals.forEach((v, i) => { if (v !== null) c[col(4, from + i) + row] = v; }); };
  put(9, 'ACIDENTE SEM AFASTAMENTO', [0, 0, 0, 1, 0]); c.P9 = { f: 'SUM(D9:O9)', v: 1 };
  put(10, 'ACIDENTE COM AFASTAMENTO', [0, 0, 0, 0, 0]); c.P10 = { f: 'SUM(D10:O10)', v: 0 };
  put(11, 'DIAS PERDIDOS+DIAS DEBITADOS', [0, 0, 0, 0, 0]); c.P11 = { f: 'SUM(D11:O11)', v: 0 };
  put(12, 'HORAS DE TREINAMENTO', [10, 20, 30, 40], 2); c.P12 = { f: 'SUM(D12:O12)', v: 100 };
  put(13, '% DE TREINAMENTO', [{ f: 'D12/D14', e: '#DIV/0!' }, { f: 'E12/E14', e: '#DIV/0!' }, { f: 'F12/F14', v: 0.01 }, { f: 'G12/G14', v: 0.01 }, { f: 'H12/H14', v: 0.01 }, { f: 'I12/I14', v: 0.01 }]); c.P13 = { f: 'AVERAGE(D13:O13)', e: '#DIV/0!' };
  put(14, 'HOMEM HORAS TRABALHADAS', [1000, 2000, 3000, 4000], 2); c.P14 = { f: 'SUM(D14:O14)', v: 10000 }; c.Q14 = { f: 'SUM(D14:P14)', v: 20000 };
  put(15, 'TAXA DE FREQUÊNCIA', ['D', 'E', 'F', 'G', 'H', 'I'].map((k, i) => ({ f: `IF(${k}14=0," ",SUM(${k}9:${k}10)*1000000/${k}14)`, v: i < 2 ? ' ' : i === 3 ? 500 : 0 }))); c.P15 = { f: 'IF(P14=0," ",SUM(P9:P10)*1000000/P14)', v: 100 };
  put(16, 'TAXA DE GRAVIDADE', ['D', 'E', 'F', 'G', 'H', 'I'].map((k, i) => ({ f: `IF(${k}14=0," ",${k}11*1000000/${k}14)`, v: i < 2 ? ' ' : 0 }))); c.P16 = { f: 'IF(P14=0," ",P11*1000000/P14)', v: 0 };
  c.B17 = 'EFETIVO:'; c.P17 = { f: 'SUM(D17:O17)', v: 0 };
  return buildXlsx([
    { name: 'Estatistica', cells: c, hiddenCols: [17] },
    { name: 'Dados de Acidentes Pessoais', cells: { A1: 'DEMO encabezado', B1: 'DEMO fecha' } },
    { name: 'HHT', state: 'hidden', cells: { A1: 'Jan', B1: 123 } },
  ]);
}
