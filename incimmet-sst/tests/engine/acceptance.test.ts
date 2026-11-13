/** Aceptación del encargo (§17) con datos controlados y sintéticos. */
import { describe, expect, it } from 'vitest';
import type { CaseRecord, ControlRecord, EventRecord, VerificationRecord } from '../../src/domain/types';
import { KPI_IDS } from '../../src/domain/model';
import { AV, E, PREFS, action, activity, fact, flt, mkDs, proj, val } from './helpers';

const demo = E.demoDataset();

describe('§17.1 regional = suma de países', () => {
  const ds = mkDs({
    projects: [proj('DEMO-A', 'PE'), proj('DEMO-B', 'PE'), proj('DEMO-C', 'CO'), proj('DEMO-D', 'BR')],
    monthly: [
      fact('DEMO-A', 'PE', '2026-10', { hh: 400000, accFatal: 0, accLti: 2, accNv3: 1, accNv2: 0, lostDays: 30 }),
      fact('DEMO-B', 'PE', '2026-10', { hh: 100000, accFatal: 0, accLti: 0, accNv3: 0, accNv2: 1, lostDays: 0 }),
      fact('DEMO-C', 'CO', '2026-10', { hh: 250000, accFatal: 0, accLti: 1, accNv3: 0, accNv2: 2, lostDays: 12 }),
      fact('DEMO-D', 'BR', '2026-10', { hh: 50000, accLti: 1, accNoLostTime: 2, lostDays: 4 }),
    ],
  });
  it('numeradores y denominadores regionales coinciden con la suma de los países', () => {
    for (const id of ['R01', 'R06', 'R11', 'C02']) {
      const k = val(ds, flt(), id); const cs = Object.values(k.byCountry);
      expect(cs.reduce((t, c) => t + (c.numerator ?? 0), 0)).toBeCloseTo(k.numerator ?? NaN, 9);
      if (k.denominator !== null) expect(cs.reduce((t, c) => t + (c.denominator ?? 0), 0)).toBeCloseTo(k.denominator, 9);
    }
    const r11 = val(ds, flt(), 'R11');
    expect(r11.numerator).toBe(4); expect(r11.denominator).toBe(800000); expect(r11.value).toBeCloseTo(5, 9);
    const mean = Object.values(r11.byCountry).reduce((t, c) => t + (c.value ?? 0), 0) / 3;
    expect(Math.abs(mean - 5)).toBeGreaterThan(1);                       // nunca un promedio de tasas
  });
  it('se cumple también en el conjunto de demostración', () => {
    const f = flt('2026-10', { periodMode: 'r12' });
    for (const id of ['R01', 'R11', 'R12', 'R15', 'C02']) {
      const k = val(demo, f, id); const cs = Object.values(k.byCountry);
      expect(cs).toHaveLength(3);
      expect(cs.reduce((t, c) => t + (c.numerator ?? 0), 0)).toBeCloseTo(k.numerator ?? NaN, 6);
      if (k.denominator !== null) expect(cs.reduce((t, c) => t + (c.denominator ?? 0), 0)).toBeCloseTo(k.denominator, 6);
    }
  });
});

describe('§17.2 un evento con varios afectados', () => {
  const ev = (id: string, type: EventRecord['type'] = 'accident_injury'): EventRecord => ({ id, projectId: 'DEMO-A', country: 'PE', occurredAt: '2026-10-08', reportedAt: '2026-10-08', closedAt: null, type, mechanism: 'struck_by', risk: null,
    potential: 2, highPotential: false, withLoss: true, shift: 'day', company: 'DEMO Propio', activity: 'production' });
  const cs = (id: string, eventId: string, classification: CaseRecord['classification'], bodyParts: string[]): CaseRecord => ({ id, eventId, projectId: 'DEMO-A', classification, workRelationship: 'own', lostDays: classification === 'lti' ? 10 : 0, chargedDays: 0, bodyParts });
  const ds = mkDs({
    projects: [proj('DEMO-A', 'PE')], monthly: [fact('DEMO-A', 'PE', '2026-10', { hh: 200000, workers: 1000 }, 'records')],
    events: [ev('DEMO-E1'), ev('DEMO-E1'), ev('DEMO-E2', 'near_miss')],     // la fila repetida no crea otro evento
    cases: [cs('DEMO-C1', 'DEMO-E1', 'lti', ['hand_l']), cs('DEMO-C2', 'DEMO-E1', 'medical', ['head', 'neck']), cs('DEMO-C3', 'DEMO-E1', 'first_aid', ['hand_l'])],
  }, ['exposure', 'accidents', 'potential', 'cases']);
  it('conserva un evento y tres casos', () => {
    const f = flt();
    expect(val(ds, f, 'R03').value).toBe(2);                              // 1 accidente + 1 casi accidente
    const r04 = val(ds, f, 'R04');
    expect(r04.value).toBe(3); expect(r04.unit).toBe('cases'); expect(r04.secondary[0].value).toBe(1);
    expect(val(ds, f, 'R06').value).toBe(1);                              // el caso más grave fija el nivel del evento
    expect(val(ds, f, 'R07').value).toBe(1);
    expect(val(ds, f, 'R08').value).toBe(1);
    expect(val(ds, f, 'R10').value).toBe(10);
    expect(val(ds, f, 'R11').value).toBeCloseTo(5, 9);
    const h = E.sheet(ds, f, PREFS).health;
    expect(h.totalCases).toBe(3); expect(h.multiZoneCases).toBe(1);
    expect(h.bodyParts.find((b) => b.key === 'hand_l')?.cases).toBe(2);
  });
  it('en la demostración existe un evento con 3 casos y sigue siendo un evento', () => {
    const by = new Map<string, number>(); for (const c of demo.cases) by.set(c.eventId, (by.get(c.eventId) ?? 0) + 1);
    expect([...by.values()].filter((n) => n === 3)).toHaveLength(1);
    const all = flt('2026-10', { periodMode: 'custom', from: '2023-11', to: '2026-10' });
    expect(val(demo, all, 'R04').value).toBe(demo.cases.length);
    expect(val(demo, all, 'R04').secondary[0].value).toBe(demo.events.filter((e) => e.type === 'accident_injury').length);
    expect(val(demo, all, 'R03').value).toBe(demo.events.length);
  });
});

describe('§17.3 filtros', () => {
  const f = flt('2026-10', { periodMode: 'r12' });
  const hhOf = (pred: (id: string) => boolean): number => demo.monthly.filter((m) => pred(m.projectId) && m.month >= '2025-11' && m.month <= '2026-10').reduce((t, m) => t + (m.v.hh ?? 0), 0);
  it('país y proyecto recalculan numeradores y denominadores', () => {
    const pe = new Set(demo.projects.filter((p) => p.country === 'PE').map((p) => p.id));
    expect(val(demo, { ...f, countries: ['PE'] }, 'R01').value).toBe(hhOf((id) => pe.has(id)));
    const one = val(demo, { ...f, projectIds: ['DEMO-P4'] }, 'R11');
    expect(one.denominator).toBe(hhOf((id) => id === 'DEMO-P4'));
    expect(Object.keys(one.byCountry)).toEqual(['CO']);
    const sh = E.sheet(demo, { ...f, countries: ['PE'] }, PREFS);
    expect(sh.projects.every((p) => p.country === 'PE')).toBe(true);
    expect(sh.map.countries.map((c) => c.code)).toEqual(['PE', 'CO', 'BR']);
    expect(sh.map.countries.find((c) => c.code === 'PE')?.selected).toBe(true);
  });
  it('el filtro de cuerpo reduce los casos pero conserva las HH', () => {
    const base = val(demo, f, 'R13'); const hand = val(demo, { ...f, bodyPart: 'hand_l' }, 'R13');
    expect(hand.denominator).toBe(base.denominator);
    expect(hand.numerator).toBeLessThan(base.numerator ?? 0);
    expect(val(demo, { ...f, bodyPart: 'hand_l' }, 'R01').value).toBe(val(demo, f, 'R01').value);
    expect(val(demo, { ...f, mechanism: 'vehicle' }, 'R04').value).toBeLessThan(val(demo, f, 'R04').value ?? 0);
    const sh = E.sheet(demo, { ...f, bodyPart: 'hand_l' }, PREFS);
    expect(sh.health.denominatorNote?.key).toBe('eng.note.denominatorKept');
    expect(E.sheet(demo, f, PREFS).health.denominatorNote).toBeNull();
    expect(sh.health.bodyParts.find((b) => b.key === 'hand_l')?.cases).toBe(sh.health.totalCases);   // solo quedan casos con esa zona
  });
});

describe('§17.4 cero HH y cero accidentes', () => {
  it('cero HH produce N/D con motivo; cero accidentes con HH válidas produce tasa cero', () => {
    const z = mkDs({ projects: [proj('DEMO-A', 'PE')], monthly: [fact('DEMO-A', 'PE', '2026-10', { hh: 0, accFatal: 0, accLti: 0, accNv3: 0, accNv2: 0, lostDays: 0 })] });
    const nd = val(z, flt(), 'R11');
    expect(nd.state).toBe('nd'); expect(nd.value).toBeNull(); expect(nd.reason?.key).toBe('eng.reason.zeroDenominator'); expect(nd.status).toBe('noexposure');
    const none = mkDs({ projects: [proj('DEMO-A', 'PE')], monthly: [fact('DEMO-A', 'PE', '2026-10', { accFatal: 0, accLti: 1, accNv3: 0, accNv2: 0 })] });
    expect(val(none, flt(), 'R11').state).toBe('nd'); expect(val(none, flt(), 'R11').value).toBeNull();
    const ok = mkDs({ projects: [proj('DEMO-A', 'PE')], monthly: [fact('DEMO-A', 'PE', '2026-10', { hh: 150000, accFatal: 0, accLti: 0, accNv3: 0, accNv2: 0, lostDays: 0 })] });
    const zero = val(ok, flt(), 'R11');
    expect(zero.state).toBe('zero'); expect(zero.value).toBe(0); expect(zero.interval?.[0]).toBe(0); expect(zero.interval?.[1]).toBeGreaterThan(0);
  });
});

describe('§17.5–17.7 plan y acciones', () => {
  const base = { projects: [proj('DEMO-A', 'PE')], monthly: [fact('DEMO-A', 'PE', '2026-10', { hh: 100000 })] };
  it('las actividades futuras no reducen el cumplimiento a la fecha', () => {
    const plan = [...[1, 2, 3, 4].map((i) => activity(`DEMO-PA${i}`, `2026-0${i + 2}-15`, true)), ...[1, 2, 3, 4, 5, 6].map((i) => activity(`DEMO-PF${i}`, `2026-1${1 + (i % 2)}-1${i}`, false))];
    const ds = mkDs({ ...base, planActivities: plan }, ['exposure', 'accidents', 'plan']);
    expect(val(ds, flt(), 'O12').value).toBe(100);
    expect(val(ds, flt(), 'O12').denominator).toBe(4);
    expect(val(ds, flt(), 'O13').value).toBe(40);
    const late = mkDs({ ...base, planActivities: [...plan, activity('DEMO-PL', '2026-09-10', false)] }, ['exposure', 'accidents', 'plan']);
    expect(val(late, flt(), 'O12').value).toBe(80);                      // lo exigible no ejecutado sí es incumplimiento
  });
  it('una reprogramación conserva el vencimiento original y la historia', () => {
    const a = action('DEMO-X1', { openedAt: '2026-07-01', originalDue: '2026-08-01', currentDue: '2026-12-15', reschedules: [{ at: '2026-07-28', from: '2026-08-01', to: '2026-12-15', reason: 'DEMO' }], priority: 'critical' });
    const ds = mkDs({ ...base, actions: [a] }, ['exposure', 'accidents', 'actions']);
    const o09 = val(ds, flt(), 'O09');
    expect(o09.value).toBe(1); expect(o09.status).toBe('crit');
    expect(val(ds, flt(), 'O15').value).toBe(91);                         // del 1-ago al 31-oct: el retraso no se borra
    expect(ds.actions[0].originalDue).toBe('2026-08-01'); expect(ds.actions[0].reschedules).toHaveLength(1);
    const sh = E.sheet(ds, flt(), PREFS);
    expect(sh.actions.aging.find((b) => b.bucket === '90+')?.overdueByDelay).toBe(1);
    expect(sh.actions.overdueCritical.value).toBe(1);
    for (const x of demo.actions.filter((y) => y.reschedules.length)) { expect(x.reschedules[0].from).toBe(x.originalDue); expect(x.currentDue).not.toBe(x.originalDue); }
    for (const x of demo.planActivities.filter((y) => y.reschedules.length)) expect(x.reschedules[0].from).toBe(x.baselineDue);
  });
  it('las dos cohortes de cierre no se confunden', () => {
    const ds = mkDs({ ...base, actions: [
      action('DEMO-XA', { openedAt: '2026-09-10', originalDue: '2026-10-10', closedAt: '2026-10-12', acceptedAt: '2026-10-13' }),
      action('DEMO-XB', { openedAt: '2026-10-02', originalDue: '2026-11-15' }),
      action('DEMO-XC', { openedAt: '2026-10-03', originalDue: '2026-10-20', closedAt: '2026-10-25', acceptedAt: '2026-10-26' }),
      action('DEMO-XD', { openedAt: '2026-10-05', originalDue: '2026-10-30', closedAt: '2026-10-28', acceptedAt: '2026-10-29' }),
    ] }, ['exposure', 'accidents', 'actions']);
    const o07 = val(ds, flt(), 'O07'); const o08 = val(ds, flt(), 'O08');
    expect([o07.numerator, o07.denominator]).toEqual([2, 3]);             // abiertas en el período: B, C, D
    expect([o08.numerator, o08.denominator]).toEqual([1, 3]);             // vencen en el período: A, C, D
    expect(o07.value).not.toBe(o08.value);
  });
});

describe('§17.8 el idioma no altera las cifras', () => {
  it('las exportaciones tienen los mismos números en ES, EN y PT', () => {
    const f = flt('2026-10', { periodMode: 'ytd' });
    const [es, en, pt] = (['es', 'en', 'pt'] as const).map((l) => E.exportTables(demo, f, l));
    const nums = (t: typeof es) => t.map((x) => x.rows.map((r) => r.map((c) => (typeof c === 'number' ? c : null))));
    expect(nums(en)).toEqual(nums(es)); expect(nums(pt)).toEqual(nums(es));
    expect(en[0].title).not.toBe(es[0].title);
    const sheetValues = E.sheet(demo, f, PREFS).cards.map((c) => c.value);
    const kpiRows = es[0].rows.filter((r) => E.defaultCards(demo).includes(String(r[0])));
    expect(E.defaultCards(demo).map((id) => kpiRows.find((r) => r[0] === id)?.[2])).toEqual(sheetValues);   // exportación = vista
    expect(es[0].meta.some((m) => m[1].includes('DEMO'))).toBe(true);
  });
});

describe('§17.11 predicción deshabilitada', () => {
  it('muestra los motivos y ninguna cifra', () => {
    const months = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
    const ds = mkDs({ projects: [proj('DEMO-A', 'PE')], monthly: months.map((m) => fact('DEMO-A', 'PE', m, { hh: 120000, accFatal: 0, accLti: 1, accNv3: 0, accNv2: 1 })) });
    const sh = E.sheet(ds, flt(), PREFS); const g = sh.signals.predictive;
    expect(g.enabled).toBe(false); expect(g.outputs).toBeNull(); expect(g.reasons.length).toBeGreaterThan(0);
    expect(g.reasons.map((r) => r.key)).toEqual(expect.arrayContaining(['eng.pred.reason.months', 'eng.pred.reason.events', 'eng.pred.reason.notApproved']));
    expect(g.validation?.sample.months).toBe(6);
    for (const id of ['D01', 'D02', 'D03', 'D08']) { const k = val(ds, flt(), id); expect(k.state).toBe('disabled'); expect(k.value).toBeNull(); expect(k.reason).not.toBeNull(); expect(k.interval).toBeNull(); }
    expect(sh.trend.forecast.enabled).toBe(false); expect(sh.trend.forecast.reason).not.toBeNull();
    expect(sh.trend.charts.flatMap((c) => c.series).some((s) => s.kind === 'forecast')).toBe(false);
  });
  it('los mismos datos como conjunto real sin aprobación quedan deshabilitados; la demostración solo simula', () => {
    const real = { ...demo, kind: 'real' as const, id: 'DEMO-as-real' };
    const g = E.sheet(real, flt(), PREFS).signals.predictive;
    expect(g.enabled).toBe(false); expect(g.outputs).toBeNull(); expect(g.reasons.map((r) => r.key)).toContain('eng.pred.reason.notApproved');
    const d = E.sheet(demo, flt(), PREFS).signals.predictive;
    if (d.enabled) { expect(d.isSimulation).toBe(true); expect(val(demo, flt(), 'D01').flags).toContain('simulation'); expect(d.outputs?.probability.every((p) => p.p >= 0 && p.p <= 1)).toBe(true); }
    else { expect(d.outputs).toBeNull(); expect(d.reasons.length).toBeGreaterThan(0); }
  });
});

describe('§17.12 ningún verde con una falla crítica activa', () => {
  const ctrl = (id: string): ControlRecord => ({ id, projectId: 'DEMO-A', risk: 'work_at_height', barrier: 'DEMO barrera', standard: 'DEMO-STD', owner: null, frequencyDays: 30, critical: true });
  const ver = (id: string, controlId: string, result: VerificationRecord['result'], recoveredAt: string | null = null): VerificationRecord => ({ id, controlId, projectId: 'DEMO-A', dueAt: '2026-10-15', doneAt: '2026-10-14', result, hasEvidence: true, operational: result === 'conform', recoveredAt });
  const build = (recoveredAt: string | null) => mkDs({
    projects: [proj('DEMO-A', 'PE')], monthly: [fact('DEMO-A', 'PE', '2026-10', { hh: 100000 })], controls: Array.from({ length: 20 }, (_, i) => ctrl(`DEMO-K${i}`)),
    verifications: Array.from({ length: 20 }, (_, i) => ver(`DEMO-V${i}`, `DEMO-K${i}`, i === 0 ? 'fail' : 'conform', i === 0 ? recoveredAt : null)),
  }, ['exposure', 'accidents', 'controls']);
  it('95 % de efectividad no puede ser verde si hay una falla activa', () => {
    const ds = build(null); const p04 = val(ds, flt(), 'P04');
    expect(p04.value).toBe(95); expect(p04.target?.value).toBe(90); expect(p04.status).toBe('crit'); expect(p04.flags).toContain('active_critical_failure');
    expect(val(ds, flt(), 'P05').value).toBe(1); expect(val(ds, flt(), 'P05').status).toBe('crit');
    const sh = E.sheet(ds, flt(), PREFS);
    expect(sh.risk.cells[0].status).toBe('crit');
    expect(sh.signals.signals.some((s) => s.ruleId === 'criticalFailure' && s.priority === 'critical')).toBe(true);
    const rec = build('2026-10-20');
    expect(val(rec, flt(), 'P04').status).toBe('good'); expect(val(rec, flt(), 'P05').value).toBe(0);
  });
  it('la demostración trae una falla crítica activa y su tarjeta no es verde', () => {
    expect(val(demo, flt(), 'P05').value).toBeGreaterThanOrEqual(1);
    expect(val(demo, flt(), 'P04').status).toBe('crit');
  });
});

describe('aritmética independiente', () => {
  it('6 incapacitantes, 0 mortales, 4.280.550 HH y 186 días → IF 1,402 · IS 43,452 · IA 0,06091', () => {
    const ds = mkDs({ projects: [proj('DEMO-A', 'PE')], monthly: [fact('DEMO-A', 'PE', '2026-10', { hh: 4280550, accFatal: 0, accLti: 6, accNv3: 0, accNv2: 0, lostDays: 186 })] });
    for (const [a, b] of [['C01', 'PE01'], ['C02', 'PE02'], ['C03', 'PE03']]) expect(val(ds, flt(), a).value).toBe(val(ds, flt(), b).value);
    expect(val(ds, flt(), 'C01').value).toBeCloseTo(1.402, 3);
    expect(val(ds, flt(), 'C02').value).toBeCloseTo(43.452, 3);
    expect(val(ds, flt(), 'C03').value).toBeCloseTo(0.06091, 5);
    expect(val(ds, flt(), 'R11').value).toBeCloseTo(1.402, 3);
  });
  it('0,65 × 4,34 / 1.000 = 0,002821', () => {
    const ds = mkDs({ projects: [proj('DEMO-A', 'PE')], monthly: [fact('DEMO-A', 'PE', '2026-10', { hh: 100_000_000, accFatal: 0, accLti: 65, accNv3: 0, accNv2: 0, lostDays: 434 })] });
    expect(val(ds, flt(), 'C01').value).toBeCloseTo(0.65, 12); expect(val(ds, flt(), 'C02').value).toBeCloseTo(4.34, 12);
    expect(val(ds, flt(), 'C03').value).toBeCloseTo(0.002821, 9);
  });
  it('el catálogo cubre los 82 indicadores más C01–C04 y SIG', () => {
    expect(E.catalog().map((d) => d.id)).toEqual(KPI_IDS); expect(KPI_IDS).toHaveLength(87);
    expect(E.kpiValues(demo, flt()).map((k) => k.id)).toEqual(KPI_IDS);
    expect(AV.state).toBe('available');
  });
});
