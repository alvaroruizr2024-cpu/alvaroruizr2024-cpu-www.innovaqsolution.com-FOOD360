/** Reglas de cálculo, estados, comparación, señales, DEMO, i18n y desempeño (datos sintéticos). */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { TextRef } from '../../src/domain/types';
import { LANGS } from '../../src/domain/types';
import { DEFAULT_CARDS_FULL, DEFAULT_CARDS_REPORTED, KPI_IDS } from '../../src/domain/model';
import { ATTENTION_WEIGHTS, pendingModule } from '../../src/engine';
import { compareRange, resolveRange } from '../../src/engine/period';
import { poissonCI } from '../../src/engine/stats';
import { statusFor } from '../../src/engine/status';
import { hasKey, translate } from '../../src/i18n/core';
import { E, PREFS, fact, flt, mkDs, proj, textKeys, val } from './helpers';

const demo = E.demoDataset();
const level = { accFatal: 0, accNv3: 0, accNv2: 0 };

describe('cobertura pareada e indefinido ≠ cero', () => {
  const ds = mkDs({
    projects: [proj('DEMO-A', 'PE'), proj('DEMO-B', 'PE'), proj('DEMO-D', 'BR')],
    monthly: [
      fact('DEMO-A', 'PE', '2026-10', { hh: 200000, accLti: 1, ...level, pg56: 1 }),
      fact('DEMO-B', 'PE', '2026-10', { hh: 300000, accLti: null, ...level, pg56: 0 }),          // sin cierre: sale de ambos lados
      fact('DEMO-D', 'BR', '2026-10', { hh: 100000, accLti: 2, accNoLostTime: 1, hpriLoss: 1, hpriNoLoss: 0 }),   // sin campo de fatalidad ni niveles
    ],
  });
  it('un proyecto-mes sin numerador no aporta HH a la tasa y queda declarado', () => {
    const k = val(ds, flt(), 'R11');
    expect(k.numerator).toBe(3); expect(k.denominator).toBe(300000); expect(k.value).toBeCloseTo(10, 9);
    expect(k.coverage.some((c) => c.country === 'PE' && c.kind === 'partial' && c.reason.key === 'eng.cov.notClosed')).toBe(true);
    expect(val(ds, flt(), 'R01').value).toBe(600000);                    // los conteos suman lo informado
    expect(val(ds, flt(), 'R06').value).toBe(3);
    const banners = E.sheet(ds, flt(), PREFS).meta.banners.map((b) => b.text.key);
    expect(banners).toContain('eng.banner.notClosed');
  });
  it('un campo inexistente excluye al país en vez de contarlo como cero', () => {
    const r05 = val(ds, flt(), 'R05');
    expect(r05.value).toBe(0); expect(r05.byCountry.BR?.state).toBe('nd'); expect(r05.byCountry.BR?.value).toBeNull();
    expect(r05.coverage.some((c) => c.country === 'BR' && c.kind === 'excluded')).toBe(true);
    const r12 = val(ds, flt(), 'R12');
    expect(r12.denominator).toBe(200000); expect(r12.byCountry.BR?.state).toBe('nd');
    const br = val(ds, flt(), 'BR01');
    expect(br.numerator).toBe(3); expect(br.denominator).toBe(100000); expect(br.value).toBeCloseTo(30, 9);
    expect(val(ds, flt('2026-10', { countries: ['PE'] }), 'BR01').state).toBe('na');
    const r15 = val(ds, flt(), 'R15');
    expect(r15.numerator).toBe(2); expect(r15.flags).toContain('mixed_definitions');
    expect(val(ds, flt(), 'R08').state).toBe('nd'); expect(val(ds, flt(), 'R13').state).toBe('nd');
    expect(val(ds, flt(), 'P04').state).toBe('pending'); expect(val(ds, flt(), 'O12').reason?.key).toBe('eng.reason.recordsPending');
  });
  it('sin conjunto todo queda pendiente y no hay cifras', () => {
    const all = E.kpiValues(null, flt());
    expect(all).toHaveLength(KPI_IDS.length); expect(all.every((k) => k.state === 'pending' && k.value === null)).toBe(true);
    const sh = E.sheet(null, flt(), PREFS);
    expect(sh.cards).toHaveLength(8); expect(sh.map.countries).toHaveLength(3); expect(sh.meta.datasetKind).toBe('none'); expect(sh.signals.predictive.outputs).toBeNull();
    expect(E.kpiDetail(null, flt(), 'R11').value.state).toBe('pending');
    expect(E.filterOptions(null).availableDims.bodyPart).toBe(false);
    expect(E.defaultCards(null)).toEqual(DEFAULT_CARDS_REPORTED); expect(E.defaultCards(demo)).toEqual(DEFAULT_CARDS_FULL); expect(E.defaultCards(ds)).toEqual(DEFAULT_CARDS_REPORTED);
  });
});

describe('períodos, comparación y estados', () => {
  it('resuelve mes, acumulado, 12 meses y personalizado', () => {
    expect(resolveRange(flt('2026-10'))).toEqual({ from: '2026-10', to: '2026-10' });
    expect(resolveRange(flt('2026-10', { periodMode: 'ytd' }))).toEqual({ from: '2026-01', to: '2026-10' });
    expect(resolveRange(flt('2026-10', { periodMode: 'r12' }))).toEqual({ from: '2025-11', to: '2026-10' });
    expect(resolveRange(flt('2026-10', { periodMode: 'custom', from: '2026-03', to: '2026-05' }))).toEqual({ from: '2026-03', to: '2026-05' });
    const r = { from: '2026-01', to: '2026-03' };
    expect(compareRange('yoy', r)).toEqual({ from: '2025-01', to: '2025-03' });
    expect(compareRange('prev', r)).toEqual({ from: '2025-10', to: '2025-12' });
    expect(compareRange('r12', r)).toEqual({ from: '2025-04', to: '2026-03' });
    expect(compareRange('none', r)).toBeNull();
  });
  const ds = mkDs({
    projects: [proj('DEMO-A', 'PE'), proj('DEMO-B', 'PE')],
    monthly: [
      fact('DEMO-A', 'PE', '2026-09', { hh: 100000, accLti: 0, ...level }), fact('DEMO-A', 'PE', '2026-10', { hh: 100000, accLti: 2, ...level }),
      fact('DEMO-A', 'PE', '2025-10', { hh: 100000, accLti: 1, ...level }), fact('DEMO-B', 'PE', '2025-10', { hh: 100000, accLti: 1, ...level }),
    ],
  });
  it('variación relativa solo con base distinta de cero y aviso de cobertura', () => {
    const prev = val(ds, flt('2026-10', { compare: 'prev' }), 'R11').compare;
    expect(prev?.value).toBe(0); expect(prev?.abs).toBeCloseTo(20, 9); expect(prev?.pct).toBeNull(); expect(prev?.note?.key).toBe('eng.note.baseZero'); expect(prev?.coverageEquivalent).toBe(true);
    const yoy = val(ds, flt('2026-10', { compare: 'yoy' }), 'R11').compare;
    expect(yoy?.value).toBeCloseTo(10, 9); expect(yoy?.pct).toBeCloseTo(100, 9); expect(yoy?.pp).toBeNull();
    expect(yoy?.coverageEquivalent).toBe(false); expect(yoy?.note?.key).toBe('eng.note.coverageDiffers');
    const pp = val(demo, flt('2026-10', { compare: 'prev' }), 'O12').compare;
    expect(pp?.pct).toBeNull(); expect(pp?.pp).toBe(pp?.abs);             // porcentajes: puntos porcentuales
    expect(val(demo, flt('2026-10', { compare: 'r12' }), 'R11').compare?.from).toBe('2025-11');
    expect(val(demo, flt(), 'R11').spark).toHaveLength(13);
  });
  it('bandas de estado y metas', () => {
    expect(statusFor(1, 1, 'down', 0.2)).toBe('good'); expect(statusFor(1.2, 1, 'down', 0.2)).toBe('warn'); expect(statusFor(1.21, 1, 'down', 0.2)).toBe('crit');
    expect(statusFor(90, 90, 'up', 0.2)).toBe('good'); expect(statusFor(72, 90, 'up', 0.2)).toBe('warn'); expect(statusFor(71, 90, 'up', 0.2)).toBe('crit');
    expect(statusFor(5, null, 'down', 0.2)).toBe('neutral'); expect(statusFor(null, 1, 'down', 0.2)).toBe('nodata');
    const tg = (projectId: string | null, effective: number) => ({ indicator: 'TRIFR' as const, scope: projectId ? 'project' as const : 'corporate' as const, kind: projectId ? 'contractual' as const : 'corporate' as const, country: null, projectId, month: '2026-01', stored: effective, effective, flagKey: null, ref: null, version: 'DEMO-v1' });
    const withT = mkDs({ projects: [proj('DEMO-A', 'PE'), proj('DEMO-C', 'CO')], targets: [tg(null, 8), tg('DEMO-A', 30)],
      monthly: [fact('DEMO-A', 'PE', '2026-10', { hh: 100000, accLti: 1, ...level }), fact('DEMO-C', 'CO', '2026-10', { hh: 100000, accLti: 0, ...level })] });
    const corp = val(withT, flt(), 'R12');
    expect(corp.value).toBeCloseTo(5, 9); expect(corp.target?.value).toBe(8); expect(corp.status).toBe('good'); expect(corp.flags).toContain('target_scope_unconfirmed');
    const one = val(withT, flt('2026-10', { projectIds: ['DEMO-A'] }), 'R12');
    expect(one.target?.value).toBe(30); expect(one.target?.kind).toBe('contractual'); expect(one.flags).not.toContain('small_exposure');
    const small = mkDs({ projects: [proj('DEMO-A', 'PE')], monthly: [fact('DEMO-A', 'PE', '2026-10', { hh: 99999, accLti: 0, ...level })] });
    expect(val(small, flt(), 'R11').flags).toContain('small_exposure');
    expect(val(withT, flt(), 'R05').status).toBe('good');
    const fatal = mkDs({ projects: [proj('DEMO-A', 'PE')], monthly: [fact('DEMO-A', 'PE', '2026-10', { hh: 100000, accFatal: 1, accLti: 0, accNv3: 0, accNv2: 0 })] });
    expect(val(fatal, flt(), 'R05').status).toBe('crit');
    expect(val(fatal, flt(), 'R11').value).toBe(0);                       // la fatalidad no entra en el numerador del LTIFR
    expect(val(fatal, flt(), 'C01').value).toBeCloseTo(10, 9);
  });
  it('intervalo exacto de Poisson', () => {
    const [l0, u0] = poissonCI(0); expect(l0).toBe(0); expect(u0).toBeCloseTo(3.6889, 3);
    const [l10, u10] = poissonCI(10); expect(l10).toBeCloseTo(4.7954, 3); expect(u10).toBeCloseTo(18.3904, 3);
    const k = val(demo, flt('2026-10', { periodMode: 'r12' }), 'R12');
    expect(k.interval![0]).toBeLessThan(k.value!); expect(k.interval![1]).toBeGreaterThan(k.value!);
  });
  it('cifra de origen frente a recalculada', () => {
    const rep = (value: number) => ({ scope: 'project' as const, country: 'PE' as const, projectId: 'DEMO-A', month: '2026-10', indicator: 'IF' as const, periodType: 'month' as const, value, raw: value, quality: 'ok' as const, ref: { file: 'DEMO.xlsx', sheet: 'DEMO', cell: 'B2' } });
    const mk = (stored: number) => mkDs({ projects: [proj('DEMO-A', 'PE')], reported: [rep(stored)], monthly: [fact('DEMO-A', 'PE', '2026-10', { hh: 200000, accFatal: 0, accLti: 1, accNv3: 0, accNv2: 0, lostDays: 4 })] });
    const f = flt('2026-10', { projectIds: ['DEMO-A'] });
    const same = E.kpiDetail(mk(5), f, 'C01');
    expect(same.reported?.value).toBe(5); expect(same.reported?.delta).toBeCloseTo(0, 9); expect(same.value.flags).not.toContain('recalculated_differs'); expect(same.reported?.ref?.cell).toBe('B2');
    const diff = E.kpiDetail(mk(4.2), f, 'C01');
    expect(diff.reported?.delta).toBeCloseTo(0.8, 9); expect(diff.value.flags).toContain('recalculated_differs');
    expect(diff.series).toHaveLength(24); expect(diff.byProject).toHaveLength(1);
  });
});

describe('señales, puntaje de atención y adaptadores nacionales', () => {
  const sh = E.sheet(demo, flt(), PREFS);
  it('cada señal trae evidencia, alcance, prioridad, rol sugerido, plazo y recomendación', () => {
    expect(sh.signals.signals.length).toBeGreaterThan(3);
    for (const s of sh.signals.signals) {
      expect(s.evidence.length).toBeGreaterThan(0); expect(s.ownerRole.key).toMatch(/^eng\.role\./); expect([7, 15, 30, 60]).toContain(s.dueInDays);
      expect(s.recommendation.key).toMatch(/\.rec$/); expect(s.isDemo).toBe(true);
      for (const l of LANGS) expect(`${translate(l, s.title.key)} ${translate(l, s.whatChanged.key, s.whatChanged.params)}`.toLowerCase()).not.toMatch(/probabili/);
    }
    const rules = new Set(sh.signals.signals.map((s) => s.ruleId));
    for (const r of ['criticalFailure', 'actionsOverdue', 'hipo3', 'hhRamp', 'ssomaDrop']) expect(rules.has(r)).toBe(true);
    expect(sh.signals.counts.critical + sh.signals.counts.high + sh.signals.counts.medium + sh.signals.counts.low).toBe(sh.signals.signals.length);
    expect(val(demo, flt(), 'SIG').value).toBe(sh.signals.signals.length);
  });
  it('sin registros de acciones, los próximos pasos salen de vacíos de datos y módulos pendientes', () => {
    const ds = mkDs({ projects: [proj('DEMO-A', 'PE')], monthly: [fact('DEMO-A', 'PE', '2026-10', { hh: 100000, accLti: null, ...level })] });
    const steps = E.sheet(ds, flt(), PREFS).actions.nextSteps;
    expect(steps.some((s) => s.source === 'data_quality')).toBe(true); expect(steps.some((s) => s.source === 'module')).toBe(true);
    expect(steps.every((s) => s.ownerRole.key.startsWith('eng.role.'))).toBe(true);
    expect(pendingModule('plan').reasonKey).toBe('eng.module.pending.plan');
  });
  it('puntaje de atención entre 0 y 100, con pesos publicados', () => {
    expect(Object.values(ATTENTION_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
    expect(sh.projects).toHaveLength(9);
    for (const p of sh.projects) { expect(p.attention).not.toBeNull(); expect(p.attention!).toBeGreaterThanOrEqual(0); expect(p.attention!).toBeLessThanOrEqual(100); }
    const one = E.sheet(demo, flt('2026-10', { projectIds: ['DEMO-P2'] }), PREFS).projects[0];
    expect(one.attention).toBe(sh.projects.find((p) => p.projectId === 'DEMO-P2')?.attention);   // no cambia al filtrar
  });
  it('Colombia usa trabajadores como denominador y no se mezcla con las tasas por HH', () => {
    const ds = mkDs({ projects: [proj('DEMO-C', 'CO')], monthly: [fact('DEMO-C', 'CO', '2026-09', { hh: 90000, workers: 500, accFatal: 0, accLti: 1, accNv3: 0, accNv2: 0, accNv1: 1, lostDays: 6 }),
      fact('DEMO-C', 'CO', '2026-10', { hh: 90000, workers: 400, accFatal: 0, accLti: 1, accNv3: 0, accNv2: 1, accNv1: 0, lostDays: 8 })] });
    const f = flt('2026-10', { periodMode: 'ytd' });
    const co1 = val(ds, f, 'CO01');
    expect(co1.numerator).toBe(2); expect(co1.denominator).toBe(400); expect(co1.value).toBeCloseTo(0.5, 9); expect(co1.unit).toBe('per100workers');
    expect(val(ds, f, 'CO02').value).toBeCloseTo(2, 9);
    expect(val(ds, f, 'CO03').value).toBe(0); expect(val(ds, f, 'CO03').denominator).toBe(4);
    expect(val(ds, f, 'CO04').state).toBe('pending'); expect(val(ds, f, 'PE01').state).toBe('na');
    const lm = E.localMethodology(ds, f);
    expect(lm.countries.map((c) => c.code)).toEqual(['PE', 'CO', 'BR']); expect(lm.countries[1].kpis).toHaveLength(6); expect(lm.rules.length).toBeGreaterThan(0);
  });
});

describe('conjunto de demostración, lámina y desempeño', () => {
  it('es reproducible, sintético y completo', () => {
    expect(E.demoDataset(7)).toEqual(demo); expect(E.demoDataset()).toEqual(demo);
    expect(E.demoDataset(8).events.map((e) => e.occurredAt)).not.toEqual(demo.events.map((e) => e.occurredAt));
    expect(demo.projects).toHaveLength(9); expect(demo.projects.every((p) => p.name.startsWith('DEMO') && p.isDemo && !p.coordsVerified && p.coordsSource === 'DEMO' && p.coords !== null)).toBe(true);
    for (const c of ['PE', 'CO', 'BR']) expect(demo.projects.filter((p) => p.country === c)).toHaveLength(3);
    expect(new Set(demo.monthly.map((m) => m.month)).size).toBe(36); expect(demo.cutoffMonth).toBe('2026-10'); expect(demo.label).toBe('Datos de demostración');
    expect(demo.events.length).toBeGreaterThan(230); expect(demo.events.length).toBeLessThan(270);
    for (const t of ['near_miss', 'hazard_report', 'accident_injury']) expect(demo.events.some((e) => e.type === t)).toBe(true);
    expect(demo.events.filter((e) => e.highPotential).length).toBeGreaterThan(2);
    expect(new Set(demo.programStats.map((p) => p.program)).size).toBe(26); expect(new Set(demo.hygiene.map((h) => h.agent)).size).toBe(5);
    expect(Object.values(demo.modules).every((m) => m.state === 'available')).toBe(true); expect(demo.targets.every((t) => t.scope === 'corporate')).toBe(true);
    expect(demo.actions.every((a) => a.owner === null) && demo.controls.every((c) => c.owner === null)).toBe(true);    // sin nombres de personas
  });
  it('sheet() llena toda la lámina en menos de 300 ms', () => {
    E.sheet(E.demoDataset(), flt('2026-09'), PREFS);                     // calentamiento del intérprete
    const times = [0, 1, 2].map((i) => { const fresh = E.demoDataset(); const t0 = performance.now(); E.sheet(fresh, flt('2026-10', { periodMode: i === 0 ? 'month' : i === 1 ? 'ytd' : 'r12', compare: 'yoy' }), PREFS); return performance.now() - t0; });
    expect(Math.min(...times)).toBeLessThan(300);
    const sh = E.sheet(demo, flt('2026-10', { periodMode: 'r12', compare: 'yoy' }), PREFS);
    expect(sh.cards.map((c) => c.id)).toEqual(DEFAULT_CARDS_FULL); expect([sh.context.hh.id, sh.context.workers.id]).toEqual(['R01', 'R02']);
    expect(sh.map.countries).toHaveLength(3); expect(sh.map.markers).toHaveLength(9); expect(sh.map.unlocated).toHaveLength(0); expect(sh.map.statusDefinition.key).toBe('eng.map.statusDef.events');
    expect(sh.trend.months).toHaveLength(24); expect(sh.trend.charts.map((c) => c.key)).toEqual(['counts', 'rates', 'exposure']);
    expect(sh.trend.charts[0].series.slice(0, 5).map((s) => s.colorRole)).toEqual(['seq-1', 'seq-2', 'seq-3', 'seq-4', 'seq-5']);
    expect(sh.trend.charts[2].series).toHaveLength(1);                  // un solo eje: HH; la dotación va en notas
    expect(sh.trend.charts[1].series.map((s) => s.kind)).toEqual(['line', 'line', 'target']);
    expect(sh.health.pyramid.levels).toHaveLength(5); expect(sh.quality.coverage).toHaveLength(15); expect(sh.quality.coverage[0].months).toHaveLength(12);
    expect(sh.plan.months).toHaveLength(12); expect(sh.plan.cells.some((c) => c.state === 'future')).toBe(true); expect(sh.actions.aging).toHaveLength(4);
    expect(sh.meta.live).toBe(false); expect(sh.meta.isDemo).toBe(true); expect(sh.meta.comparePeriod).toEqual({ from: '2024-11', to: '2025-10' });
    const custom = E.sheet(demo, flt(), { cards: ['R01', 'R02', 'R03', 'R04', 'R05', 'R06', 'R07', 'R10'], mapLayer: 'controls', mapIndicator: null });
    expect(custom.cards.map((c) => c.id)).toEqual(['R01', 'R02', 'R03', 'R04', 'R05', 'R06', 'R07', 'R10']); expect(custom.map.indicatorId).toBe('P04');
    const real = mkDs({ projects: [proj('DEMO-A', 'PE')], monthly: [fact('DEMO-A', 'PE', '2026-10', { hh: 100000, accLti: 0, ...level })] });
    const rs = E.sheet(real, flt(), { ...PREFS, mapLayer: 'controls' });
    expect(rs.map.unlocated).toHaveLength(1); expect(rs.map.markers).toHaveLength(0); expect(rs.map.countries.find((c) => c.code === 'PE')?.state).toBe('pending');
    expect(rs.map.countries.find((c) => c.code === 'BR')?.hasData).toBe(false); expect(rs.risk.availability.state).toBe('pending');
  });
  it('tablas de exportación y tabla larga de estadísticas', () => {
    const t = E.exportTables(demo, flt(), 'es');
    expect(t.map((x) => x.key)).toEqual(['kpis', 'monthly', 'projects', 'signals', 'reconciliation']);
    expect(t[0].rows).toHaveLength(KPI_IDS.length); expect(t.every((x) => x.meta.length >= 8 && x.rows.every((r) => r.length === x.columns.length))).toBe(true);
    const rows = E.statRows(demo);
    expect(rows.length).toBe(demo.monthly.length * 4); expect(rows[0].periodType).toBe('month'); expect(rows.every((r) => r.project.startsWith('DEMO'))).toBe(true);
    const ps = E.projectSheet(demo, flt(), 'DEMO-P2');
    expect(ps.project.id).toBe('DEMO-P2'); expect(ps.kpis.length).toBeGreaterThan(8); expect(ps.signals.every((s) => s.scope.projectId === null || s.scope.projectId === 'DEMO-P2')).toBe(true);
  });
});

describe('i18n del motor', () => {
  const refs: TextRef[] = [];
  const walk = (x: unknown): void => {
    if (Array.isArray(x)) { x.forEach(walk); return; }
    if (x && typeof x === 'object') { const o = x as Record<string, unknown>; if (typeof o.key === 'string' && /^(eng|country|unit)\./.test(o.key)) refs.push(o as unknown as TextRef); Object.values(o).forEach(walk); }
  };
  const reported = mkDs({ projects: [proj('DEMO-A', 'PE'), proj('DEMO-D', 'BR')], monthly: [fact('DEMO-A', 'PE', '2026-10', { hh: 100000, accLti: null, ...level }), fact('DEMO-D', 'BR', '2026-09', { hh: 50000, accLti: 1, accNoLostTime: 0 })] });
  for (const ds of [demo, reported, null]) {
    const f = flt('2026-10', { periodMode: 'ytd', compare: 'yoy', bodyPart: ds === demo ? 'hand_l' : null });
    walk(E.sheet(ds, f, PREFS)); walk(E.kpiValues(ds, f)); walk(E.localMethodology(ds, f));
    for (const id of ['R11', 'C01', 'P04', 'O09', 'D01', 'CO01', 'SIG']) walk(E.kpiDetail(ds, f, id));
    if (ds) walk(E.projectSheet(ds, f, ds.projects[0].id));
  }
  it('toda clave emitida existe en ES, EN y PT y recibe sus parámetros', () => {
    expect(refs.length).toBeGreaterThan(300);
    for (const r of refs) for (const l of LANGS) {
      expect(hasKey(l, r.key), `${l}:${r.key}`).toBe(true);
      expect(translate(l, r.key, r.params), `${l}:${r.key}`).not.toMatch(/\{\w+\}/);
    }
    expect(textKeys(E.sheet(demo, flt(), PREFS)).size).toBeGreaterThan(40);
  });
  it('toda clave literal del código del motor está registrada', () => {
    const dir = path.resolve(process.cwd(), 'src/engine'); const files: string[] = [];
    const scan = (d: string): void => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) { if (n !== 'i18n') scan(p); } else if (n.endsWith('.ts')) files.push(p); } };
    scan(dir);
    const keys = new Set<string>(); for (const p of files) for (const m of fs.readFileSync(p, 'utf8').matchAll(/'(eng\.[A-Za-z0-9_.]+)'/g)) keys.add(m[1]);
    expect(keys.size).toBeGreaterThan(150);
    for (const k of keys) for (const l of LANGS) expect(hasKey(l, k), `${l}:${k}`).toBe(true);
    const families = [...['hh', 'workers', 'accFatal', 'accLti', 'accNv3', 'accNv2', 'accNv1', 'accNoLostTime', 'pg56', 'nearMiss'].map((k) => `eng.measure.${k}`),
      ...['ok', 'zero', 'nd', 'na', 'pending', 'insufficient', 'disabled'].map((k) => `eng.state.${k}`), ...['good', 'warn', 'crit', 'neutral', 'nodata', 'noexposure', 'na'].map((k) => `eng.status.${k}`),
      ...['small_exposure', 'mixed_definitions', 'recalculated_differs', 'reported_count', 'demo', 'simulation', 'target_scope_unconfirmed', 'active_critical_failure'].map((k) => `eng.flag.${k}`),
      ...['ltifr12', 'trifr12', 'streak3', 'hipo3', 'hhRamp', 'ssomaDrop', 'notClosed', 'noHeadcount', 'reconMaterial', 'sourceLag', 'criticalFailure', 'verifCoverage', 'actionsOverdue', 'planToDate', 'surveillance'].flatMap((r) => ['title', 'what', 'rec'].map((x) => `eng.sig.${r}.${x}`)),
      ...[...new Set(demo.programStats.map((p) => p.program))].map((k) => `eng.program.${k}`), ...[...new Set(demo.controls.map((c) => c.risk))].map((k) => `eng.risk.${k}`),
      ...[...new Set(demo.planActivities.map((a) => a.program))].map((k) => `eng.plan.${k}`), ...[...new Set(demo.cases.flatMap((c) => c.bodyParts))].map((k) => `eng.body.${k}`),
      ...[...new Set(demo.events.map((e) => e.mechanism).filter((m): m is string => !!m))].map((k) => `eng.mech.${k}`)];
    for (const k of families) for (const l of LANGS) expect(hasKey(l, k), `${l}:${k}`).toBe(true);
    for (const l of LANGS) expect(translate(l, 'eng.sig.hipo3.title')).not.toBe('eng.sig.hipo3.title');
  });
});
