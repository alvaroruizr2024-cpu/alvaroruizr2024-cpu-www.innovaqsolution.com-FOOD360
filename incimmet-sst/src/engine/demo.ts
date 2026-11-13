import type {
  ActionRecord, Availability, CaseClass, CaseRecord, ControlRecord, CountryCode, Dataset, EventRecord, EventType, HygieneMeasurement, ISODate, ModuleKey, Month, MonthlyFact,
  PlanActivity, Priority, ProgramKey, ProgramStat, Project, Reschedule, Target, VerificationRecord,
} from '../domain/types';
import { addMonths, dayNum, monthsBetween } from './period';
import { mulberry32 } from './stats';

export const DEMO_RISKS = ['vehicle_person', 'rockfall', 'ground_support', 'hazardous_energy', 'work_at_height', 'lifting', 'confined_space', 'explosives', 'fire', 'ventilation_gases', 'hazardous_substances', 'machinery', 'backfill_pressure'];
export const DEMO_MECHANISMS = ['struck_by', 'caught_between', 'fall_same_level', 'fall_from_height', 'overexertion', 'contact_energy', 'vehicle', 'rockfall', 'chemical_exposure', 'cut_puncture'];
export const DEMO_BODY = ['head', 'eyes', 'neck', 'shoulder_l', 'shoulder_r', 'arm_l', 'arm_r', 'hand_l', 'hand_r', 'chest', 'back', 'abdomen', 'hip', 'leg_l', 'leg_r', 'knee_l', 'knee_r', 'foot_l', 'foot_r'];
export const DEMO_PLAN = ['training', 'drills', 'inspections', 'audits', 'leadership', 'critical_controls', 'observations', 'investigations', 'actions', 'campaigns', 'committees', 'health_surveillance'];
const PROGRAMS: ProgramKey[] = ['risk_assessment', 'controls_implemented', 'inspections', 'competencies', 'training', 'training_effectiveness', 'permits', 'maintenance', 'emergency', 'drills', 'audits', 'moc', 'legal',
  'leadership', 'participation', 'report_quality', 'interventions', 'investigations', 'health_surveillance', 'restrictions', 'hygiene_monitoring', 'ergonomics', 'fatigue', 'psychosocial', 'absenteeism', 'occupational_disease'];
const MODULES: ModuleKey[] = ['exposure', 'accidents', 'potential', 'cases', 'controls', 'plan', 'actions', 'health', 'hygiene', 'training', 'programs', 'projectsGeo', 'predictive'];
const SITES: Array<[CountryCode, string, number, number, number, number]> = [   // país, nombre ficticio, lat, lon, dotación base, factor de riesgo
  ['PE', 'DEMO · Unidad Andina A', -11.2, -75.9, 460, 1.0], ['PE', 'DEMO · Unidad Andina B', -14.8, -72.6, 320, 1.5], ['PE', 'DEMO · Unidad Costa C', -7.4, -78.3, 210, 0.7],
  ['CO', 'DEMO · Frente Cordillera D', 6.4, -75.3, 380, 1.1], ['CO', 'DEMO · Frente Cordillera E', 4.9, -74.2, 240, 0.8], ['CO', 'DEMO · Frente Valle F', 7.9, -73.1, 150, 1.3],
  ['BR', 'DEMO · Frente Serra G', -19.6, -43.6, 420, 0.9], ['BR', 'DEMO · Frente Serra H', -6.2, -50.3, 260, 1.2], ['BR', 'DEMO · Frente Planalto I', -14.3, -49.2, 130, 1.0],
];
const TZ: Record<CountryCode, string | null> = { PE: 'America/Lima', CO: 'America/Bogota', BR: null };
const CUTOFF: Month = '2026-10'; const CREATED = '2026-11-13T00:00:00.000Z';
const iso = (m: Month, d: number): ISODate => `${m}-${String(d).padStart(2, '0')}`;
const addDays = (d: ISODate, n: number): ISODate => new Date((dayNum(d) + n) * 86400000).toISOString().slice(0, 10);

/** Conjunto de demostración reproducible (mulberry32). Todo es sintético: nombres «DEMO», coordenadas ficticias, cifras sin relación con datos reales. */
export function demoDataset(seed = 7): Dataset {
  const rnd = mulberry32(seed);
  const int = (a: number, b: number): number => a + Math.floor(rnd() * (b - a + 1));
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
  const chance = (p: number): boolean => rnd() < p;
  const gauss = (): number => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
  const months = monthsBetween(addMonths(CUTOFF, -35), CUTOFF); const cutDate = iso(CUTOFF, 31);
  const projects: Project[] = SITES.map(([country, name, lat, lon], i) => ({
    id: `DEMO-P${i + 1}`, name, country, entity: `DEMO Entidad ${country}`, client: `DEMO Cliente ${i + 1}`, activity: pick(['development', 'production', 'services']), status: 'active',
    coords: { lat, lon }, coordsVerified: false, coordsSource: 'DEMO', timezone: TZ[country], isDemo: true, firstMonth: months[0], lastMonth: null, sourceKey: 'demo', sourceBlock: null }));
  // exposición mensual
  const monthly: MonthlyFact[] = []; const weights: Array<{ p: number; m: number; w: number }> = [];
  const mf = months.map((_, j) => (1.3 - 0.5 * (j / 35)) * Math.exp(0.3 * gauss()));     // tendencia a la baja + sobredispersión mensual
  SITES.forEach(([country, , , , base, risk], i) => months.forEach((month, j) => {
    let workers = Math.round(base * (1 + 0.004 * j) * (1 + 0.03 * gauss()));
    if (i === 8 && j >= 33) workers = Math.round(workers * (1 + 0.28 * (j - 32)));          // rampa de exposición al final (señal)
    const hh = Math.round(workers * (186 + 8 * gauss()));
    let ssoma = Math.round(Math.min(98, Math.max(60, 86 - 6 * risk + 3 * gauss())));
    if (i === 3 && j === 35) ssoma -= 14;                                                    // caída del puntaje (señal)
    monthly.push({ projectId: `DEMO-P${i + 1}`, country, month, basis: 'records', file: 'DEMO', v: { hh, workers, ssomaScore: ssoma, trainingHours: Math.round(workers * (2 + rnd() * 2)) } });
    weights.push({ p: i, m: j, w: hh * risk * mf[j] });
  }));
  const total = weights.reduce((t, x) => t + x.w, 0);
  const draw = (): { p: number; m: number } => { let u = rnd() * total; for (const x of weights) { u -= x.w; if (u <= 0) return x; } return weights[weights.length - 1]; };
  // eventos y casos
  const events: EventRecord[] = []; const cases: CaseRecord[] = []; let en = 0; let cn = 0;
  const addCase = (e: EventRecord, cls: CaseClass): void => {
    cases.push({ id: `DEMO-C${String(++cn).padStart(4, '0')}`, eventId: e.id, projectId: e.projectId, classification: cls, workRelationship: chance(0.6) ? 'own' : 'contractor',
      lostDays: cls === 'lti' ? int(2, 40) : 0, chargedDays: cls === 'fatal' ? 6000 : 0, bodyParts: chance(0.18) ? [pick(DEMO_BODY), pick(DEMO_BODY)].filter((b, k, a) => a.indexOf(b) === k) : [pick(DEMO_BODY)] });
  };
  const addEvent = (type: EventType, at: { p: number; m: number }, classes: CaseClass[], hipo = false): EventRecord => {
    const occurredAt = iso(months[at.m], int(1, 28)); const injury = type === 'accident_injury'; const report = type === 'near_miss' || type === 'hazard_report';
    const hp = hipo || chance(injury ? 0.04 : 0.03); const due = injury || type === 'accident_property' || hp ? addDays(occurredAt, 15) : null;
    const e: EventRecord = {
      id: `DEMO-E${String(++en).padStart(4, '0')}`, projectId: `DEMO-P${at.p + 1}`, country: SITES[at.p][0], occurredAt, reportedAt: addDays(occurredAt, chance(0.86) ? int(0, 1) : int(2, 5)), closedAt: chance(0.9) ? addDays(occurredAt, int(5, 40)) : null,
      type, mechanism: injury || chance(0.5) ? pick(DEMO_MECHANISMS) : null, risk: chance(0.55) ? pick(DEMO_RISKS) : null, potential: hp ? (chance(0.5) ? 5 : 6) : (int(1, 4) as 1 | 2 | 3 | 4), highPotential: hp,
      withLoss: type === 'accident_injury' || type === 'accident_property', shift: chance(0.6) ? 'day' : 'night', company: pick(['DEMO Propio', 'DEMO Contratista A', 'DEMO Contratista B']), activity: pick(['development', 'production', 'services', 'maintenance']),
      descriptionOriginal: null, firstResponseHours: report ? Math.round(10 * Math.exp(2.4 + 0.9 * gauss())) / 10 : null, reporterId: report ? `DEMO-R${int(1, 140)}` : null, qualityOk: report ? chance(0.82) : null,
      investigationDueAt: due, investigationClosedAt: due ? (chance(0.8) ? addDays(occurredAt, int(4, 15)) : chance(0.6) ? addDays(occurredAt, int(16, 40)) : null) : null };
    events.push(e); for (const c of classes) addCase(e, c);
    return e;
  };
  for (let k = 0; k < 103; k++) { const u = rnd(); addEvent('accident_injury', draw(), [u < 0.18 ? 'lti' : u < 0.34 ? 'restricted' : u < 0.63 ? 'medical' : 'first_aid']); }
  addEvent('accident_injury', { p: 1, m: 16 }, ['fatal']);                                  // un evento fatal histórico
  addEvent('accident_injury', { p: 3, m: 29 }, ['lti', 'medical', 'first_aid']);            // un evento con 3 personas afectadas
  for (let k = 0; k < 20; k++) addEvent('accident_property', draw(), []);
  for (let k = 0; k < 12; k++) addEvent('incident', draw(), []);
  for (let k = 0; k < 62; k++) addEvent('near_miss', draw(), []);
  for (let k = 0; k < 50; k++) addEvent('hazard_report', draw(), []);
  addEvent('near_miss', { p: 4, m: 34 }, [], true); addEvent('incident', { p: 6, m: 35 }, [], true);   // alto potencial reciente (señal)
  // controles críticos y verificaciones (últimos 12 meses + noviembre futuro)
  const controls: ControlRecord[] = []; const verifications: VerificationRecord[] = []; let vn = 0;
  const vMonths = monthsBetween(addMonths(CUTOFF, -11), addMonths(CUTOFF, 1));
  projects.forEach((p, i) => {
    const risks = [...DEMO_RISKS].sort(() => rnd() - 0.5).slice(0, 5);
    risks.forEach((risk, k) => { for (let b = 0; b < (k < 3 ? 2 : 1); b++) controls.push({ id: `DEMO-K${i + 1}-${k + 1}${b ? 'b' : 'a'}`, projectId: p.id, risk, barrier: `DEMO barrera ${k + 1}${b ? 'b' : 'a'}`, standard: `DEMO-STD-${k + 1}`, owner: null, frequencyDays: 30, critical: k < 4 }); });
  });
  for (const c of controls) for (const m of vMonths) {
    const dueAt = iso(m, 15); const future = dueAt > cutDate; const done = !future && chance(0.94); const u = rnd();
    const result: VerificationRecord['result'] = done ? (u < 0.93 ? 'conform' : u < 0.985 ? 'fail' : 'invalid') : null;
    const doneAt = done ? iso(m, int(8, 15)) : null;
    verifications.push({ id: `DEMO-V${String(++vn).padStart(4, '0')}`, controlId: c.id, projectId: c.projectId, dueAt, doneAt, result, hasEvidence: done && chance(0.97), operational: done ? result === 'conform' : null,
      recoveredAt: result === 'fail' && doneAt ? addDays(doneAt, int(2, 9)) : null });
  }
  const failing = verifications.find((v) => v.controlId === 'DEMO-K2-1a' && v.dueAt === iso(CUTOFF, 15));   // una falla crítica activa
  if (failing) Object.assign(failing, { doneAt: iso(CUTOFF, 14), result: 'fail', hasEvidence: true, operational: false, recoveredAt: null });
  // plan anual 2026
  const planActivities: PlanActivity[] = []; let an = 0; const year = monthsBetween('2026-01', '2026-12');
  for (const p of projects) for (const program of DEMO_PLAN) for (const m of year) {
    if (!chance(program === 'training' || program === 'inspections' || program === 'leadership' ? 0.95 : 0.45)) continue;
    const baselineDue = iso(m, int(10, 25)); const reschedules: Reschedule[] = []; let currentDue = baselineDue;
    if (chance(0.12)) { currentDue = addDays(baselineDue, int(20, 45)); reschedules.push({ at: addDays(baselineDue, -int(2, 9)), from: baselineDue, to: currentDue, reason: 'DEMO reprogramación' }); }
    const dueNow = baselineDue <= cutDate; const u = rnd();
    const doneAt = dueNow ? (u < 0.8 ? addDays(baselineDue, -int(0, 8)) : u < 0.91 ? addDays(baselineDue, int(3, 30)) : null) : null;
    const okDone = doneAt !== null && doneAt <= cutDate ? doneAt : null;
    planActivities.push({ id: `DEMO-A${String(++an).padStart(4, '0')}`, projectId: p.id, program, owner: null, weight: int(1, 3), baselineDue, currentDue, reschedules, doneAt: okDone,
      acceptedAt: okDone && chance(0.95) ? (addDays(okDone, 2) <= cutDate ? addDays(okDone, 2) : okDone) : null, hasEvidence: okDone !== null && chance(0.96) });
  }
  // acciones
  const actions: ActionRecord[] = []; const TERM: Record<Priority, number> = { critical: 15, high: 30, medium: 45, low: 60 }; const LATE: Record<Priority, number> = { critical: 0.12, high: 0.2, medium: 0.32, low: 0.45 };
  for (let k = 0; k < 170; k++) {
    const u = rnd(); const priority: Priority = u < 0.12 ? 'critical' : u < 0.42 ? 'high' : u < 0.82 ? 'medium' : 'low';
    const openedAt = iso(months[int(17, 35)], int(1, 28)); const originalDue = addDays(openedAt, TERM[priority]); const reschedules: Reschedule[] = []; let currentDue = originalDue;
    if (chance(0.15)) { currentDue = addDays(originalDue, int(15, 40)); reschedules.push({ at: addDays(originalDue, -int(1, 5)), from: originalDue, to: currentDue, reason: 'DEMO reprogramación' }); }
    const late = chance(LATE[priority]); const never = late && chance(0.45);
    let closedAt: ISODate | null = never ? null : late ? addDays(originalDue, int(3, 50)) : addDays(openedAt, int(2, TERM[priority]));
    if (closedAt && closedAt > cutDate) closedAt = null;
    const req = chance(0.4);
    actions.push({ id: `DEMO-X${String(k + 1).padStart(4, '0')}`, projectId: pick(projects).id, source: pick(['inspection', 'investigation', 'audit', 'observation']), findingKey: chance(0.7) ? `DEMO-F${String(int(1, 14)).padStart(2, '0')}` : null, priority, owner: null,
      openedAt, originalDue, currentDue, reschedules, closedAt, acceptedAt: closedAt && chance(0.9) ? (addDays(closedAt, 3) <= cutDate ? addDays(closedAt, 3) : closedAt) : null, effectivenessRequired: req, effectivenessOk: req && closedAt ? (chance(0.86) ? true : chance(0.7) ? false : null) : null });
  }
  actions.push({ id: 'DEMO-X9001', projectId: 'DEMO-P2', source: 'investigation', findingKey: 'DEMO-F01', priority: 'critical', owner: null, openedAt: '2026-07-06', originalDue: '2026-07-21', currentDue: '2026-09-15',
    reschedules: [{ at: '2026-07-18', from: '2026-07-21', to: '2026-09-15', reason: 'DEMO reprogramación' }], closedAt: null, acceptedAt: null, effectivenessRequired: true, effectivenessOk: null });
  // agregados de programa (24 meses) e higiene
  const programStats: ProgramStat[] = []; const pm = months.slice(12);
  SITES.forEach(([, , , , base], i) => pm.forEach((month) => {
    const w = monthly.find((f) => f.projectId === `DEMO-P${i + 1}` && f.month === month)?.v.workers ?? base;
    for (const program of PROGRAMS) {
      const n = Math.max(4, Math.round((w / 12) * (0.6 + rnd() * 0.8))); const rate = Math.min(1, 0.86 + 0.12 * rnd()); const ok = Math.round(n * rate);
      const row: ProgramStat = { projectId: `DEMO-P${i + 1}`, month, program, due: n, done: ok, onTime: Math.round(ok * (0.9 + 0.1 * rnd())), conform: Math.round(ok * (0.92 + 0.08 * rnd())), evaluated: ok, eligible: n, applicable: n + int(0, 4) };
      if (program === 'training') row.hours = Math.round(w * (2 + rnd() * 2));
      if (program === 'health_surveillance' || program === 'competencies' || program === 'participation') { row.eligible = w; row.done = Math.round(w * (program === 'participation' ? 0.3 + 0.3 * rnd() : 0.9 + 0.09 * rnd())); row.conform = Math.round(w * (0.9 + 0.08 * rnd())); }
      if (program === 'absenteeism') { row.due = w * 26; row.done = Math.round(w * 26 * (0.015 + 0.02 * rnd())); }
      if (program === 'occupational_disease') { row.eligible = w; row.done = chance(0.04) ? 1 : 0; row.evaluated = int(0, 2); }
      programStats.push(row);
    }
  }));
  const hygiene: HygieneMeasurement[] = []; const UNITS = { silica: 'mg/m3', noise: 'dB(A)', vibration: 'm/s2', heat: 'WBGT', gases: 'ppm' } as const;
  for (const p of projects) for (const month of pm.filter((_, k) => k % 3 === 2)) for (const agent of ['silica', 'noise', 'vibration', 'heat', 'gases'] as const) {
    const valid = int(8, 20); const people = int(15, 60);
    hygiene.push({ projectId: p.id, month, agent, method: `DEMO-MET-${agent}`, unit: UNITS[agent], valid, overLimit: Math.min(valid, int(0, agent === 'noise' ? 4 : 2)), peopleEvaluated: people, peopleOverexposed: int(0, Math.round(people * 0.12)) });
  }
  const TV: Record<Target['indicator'], [number, number, number]> = { TRIFR: [4.6, 4.3, 4.0], IF: [1.5, 1.4, 1.3], IS: [60, 55, 50], IA: [0.08, 0.065, 0.05] };
  const targets: Target[] = (Object.keys(TV) as Target['indicator'][]).flatMap((indicator) => months.map((month) => { const v = TV[indicator][Number(month.slice(0, 4)) - 2024] ?? TV[indicator][0];
    return { indicator, scope: 'corporate' as const, kind: 'corporate' as const, country: null, projectId: null, month, stored: v, effective: v, flagKey: null, ref: null, version: 'DEMO-2026' }; }));
  const av: Availability = { state: 'available', reasonKey: 'eng.module.demo' };
  return {
    schema: 1, id: `demo-${seed}`, kind: 'demo', label: 'Datos de demostración', createdAt: CREATED, cutoffMonth: CUTOFF,
    sources: [{ key: 'demo', name: 'DEMO · conjunto sintético', profile: 'template', country: null, sha256: null, sizeBytes: null, loadedAt: CREATED, modifiedAt: null, lastDataMonth: CUTOFF, sheets: [], warnings: [] }],
    projects, monthly, reported: [], targets, events, cases, controls, verifications, planActivities, actions, programStats, hygiene, reconciliation: [],
    modules: Object.fromEntries(MODULES.map((m) => [m, av])) as Record<ModuleKey, Availability>,
    config: { taxonomyVersion: 'DEMO-1', triMeasures: ['accFatal', 'accLti', 'accNv3', 'accNv2'], ltiMeasures: ['accLti'], rateConstant: 1_000_000, warnBand: 0.2, smallExposureHH: 100_000, predictiveApproved: false },
  };
}
