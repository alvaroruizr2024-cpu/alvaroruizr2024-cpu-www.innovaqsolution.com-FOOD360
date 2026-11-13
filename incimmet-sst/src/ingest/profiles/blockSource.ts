/** Conversión de bloques (consolidado + proyectos) a hechos mensuales, cifras reportadas, metas y hallazgos estructurales. */
import type { CellRef, CountryCode, FactProv, MeasureKey, Month, MonthlyFact, Project, QualityFlag, ReconItem, ReportedStat, Target } from '../../domain/types';
import type { IngestPreviewBlock } from '../../domain/model';
import { addr, cellAt, extractRefs } from '../xlsx/read';
import { blockOfRow, type Block, type BlockRow, type BlockSheet } from './blocks';
import { kpisFor, mkItem, monthAdd, monthRuns, readNum, slug, type ConsolCell } from './shared';

export interface BlockSourceOpts {
  file: string; bs: BlockSheet; country: CountryCode; sourceKey: string;
  consolidated: Block | null; projectBlocks: Block[]; isHistorical: (b: Block) => boolean;
}
export interface BlockSourceOut {
  projects: Project[]; monthly: MonthlyFact[]; reported: ReportedStat[]; targets: Target[]; items: ReconItem[]; consol: ConsolCell[];
  previews: IngestPreviewBlock[]; lastDataMonth: Month | null; duplicatesFlagged: number;
}

/**
 * Restos de plantilla: tramos de ≥ 3 meses consecutivos con HH idénticas y no nulas entre dos bloques (el origen es el bloque cuya serie
 * continúa después del tramo), o valores aislados idénticos a los de otro bloque fuera de la ventana activa contigua del bloque.
 */
export function detectTemplateDuplicates(hh: Array<Map<Month, number>>): Array<Set<Month>> {
  const n = hh.length;
  const flagged = hh.map(() => new Set<Month>());
  const pos = (mp: Map<Month, number>, k: Month): boolean => { const v = mp.get(k); return v !== undefined && v > 0; };
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
    const eq: Month[] = [];
    for (const [k, v] of hh[a]) if (v > 0 && hh[b].get(k) === v) eq.push(k);
    for (const run of monthRuns(eq)) {
      if (run.length < 3) continue;
      const next = monthAdd(run[run.length - 1], 1);
      const prev = monthAdd(run[0], -1);
      let ca = pos(hh[a], next);
      let cb = pos(hh[b], next);
      if (ca === cb) { ca = pos(hh[a], prev); cb = pos(hh[b], prev); }
      if (ca && cb) continue;                       // ambos continúan: no se puede decidir el origen
      const copy = ca ? b : cb ? a : b;             // si ninguno continúa, la copia es el bloque posterior
      for (const k of run) flagged[copy].add(k);
    }
  }
  for (let a = 0; a < n; a++) {
    const months: Month[] = [];
    for (const [k, v] of hh[a]) if (v > 0 && !flagged[a].has(k)) months.push(k);
    const runs = monthRuns(months);
    if (runs.length < 2) continue;
    let win = runs[0];
    for (const r of runs) if (r.length >= win.length) win = r;
    for (const r of runs) {
      if (r === win || r.length >= 3) continue;
      for (const k of r) for (let b = 0; b < n; b++) if (b !== a && hh[b].get(k) === hh[a].get(k)) { flagged[a].add(k); break; }
    }
  }
  return flagged;
}

const NV_ROWS: MeasureKey[] = ['accFatal', 'accLti', 'accNv3', 'accNv2', 'accNv1'];

export function extractBlockSource(o: BlockSourceOpts): BlockSourceOut {
  const sh = o.bs.sheet;
  const sn = sh.name;
  const { file, country } = o;
  const mkRef = (col: number, row: number): CellRef => ({ file, sheet: sn, cell: addr(col, row), formula: cellAt(sh, col, row)?.f ?? null });
  const measureRow = (b: Block, k: string): BlockRow | undefined => b.rows.find((r) => r.kind === 'measure' && r.ind === k);
  const out: BlockSourceOut = { projects: [], monthly: [], reported: [], targets: [], items: [], consol: [], previews: [], lastDataMonth: null, duplicatesFlagged: 0 };

  // 1) Exposición bruta por bloque y último mes con HH > 0 en algún proyecto (los meses posteriores son solo encabezados).
  const hh: Array<Map<Month, number>> = o.projectBlocks.map((b) => {
    const mp = new Map<Month, number>();
    const row = measureRow(b, 'hh');
    if (row) for (const [c, m] of row.cols) { const x = readNum(cellAt(sh, c, row.row)); if (x.value !== null) mp.set(m, x.value); }
    return mp;
  });
  let last: Month | null = null;
  for (const mp of hh) for (const [m, v] of mp) if (v > 0 && (last === null || m > last)) last = m;
  out.lastDataMonth = last;
  const flagged = detectTemplateDuplicates(hh);
  const ids = new Set<string>();
  const pidByBlock = new Map<number, string>();
  const nameByPid = new Map<string, string>();

  const pushReported = (b: Block, scope: 'country' | 'project', projectId: string | null, keep: (m: Month) => boolean): void => {
    const hard = new Map<BlockRow, Month[]>();
    for (const row of b.rows) {
      if (row.kind === 'target_corporate' || row.kind === 'target_project') continue;
      if (scope === 'project' && row.kind === 'measure') continue;
      for (const [col, m] of row.cols) {
        if ((last !== null && m > last) || !keep(m)) continue;
        const cell = cellAt(sh, col, row.row);
        const x = readNum(cell);
        if (!cell || x.q === 'empty') continue;
        let quality: QualityFlag = x.q;
        if (quality === 'ok' && cell.f === null && row.formulaShare >= 0.8) { quality = 'hardcoded'; const l = hard.get(row) ?? []; l.push(m); hard.set(row, l); }
        out.reported.push({ scope, country, projectId, month: m, indicator: row.ind, periodType: row.period, value: x.value, raw: x.raw, quality, ref: { file, sheet: sn, cell: addr(col, row.row), formula: cell.f } });
      }
    }
    for (const [row, months] of hard) for (const run of monthRuns(months)) {
      out.items.push(mkItem('hardcoded_constant', {
        country, projectId, projectName: projectId ? nameByPid.get(projectId) ?? null : null, months: run, kpis: kpisFor(row.ind, country),
        params: { label: row.label, n: run.length }, refs: run.map((m) => mkRef(row.byMonth.get(m) as number, row.row)),
      }));
    }
  };
  const pushTargets = (b: Block, kind: 'target_corporate' | 'target_project', projectId: string | null): void => {
    for (const row of b.rows) {
      if (row.kind !== kind) continue;
      const vals: Array<{ m: Month; v: number; col: number }> = [];
      for (const [col, m] of row.cols) { const x = readNum(cellAt(sh, col, row.row)); if (x.value !== null) vals.push({ m, v: x.value, col }); }
      const byYear = new Map<string, number[]>();
      for (const x of vals) { const l = byYear.get(x.m.slice(0, 4)) ?? []; l.push(x.v); byYear.set(x.m.slice(0, 4), l); }
      const mode = new Map<string, number | null>();
      for (const [y, l] of byYear) {
        const cnt = new Map<number, number>();
        for (const v of l) cnt.set(v, (cnt.get(v) ?? 0) + 1);
        let best: number | null = null;
        let bn = 0;
        for (const [v, c] of cnt) if (c > bn) { bn = c; best = v; }
        mode.set(y, l.length >= 3 && bn >= 2 && bn > l.length / 2 ? best : null);
      }
      const odd: typeof vals = [];
      for (const x of vals) {
        const md = mode.get(x.m.slice(0, 4)) ?? null;
        const effective = md === null ? x.v : md;
        const flag = effective !== x.v;
        if (flag) odd.push(x);
        out.targets.push({
          indicator: row.ind as Target['indicator'], scope: kind === 'target_corporate' ? 'corporate' : 'project', kind: 'corporate',
          country: kind === 'target_corporate' ? null : country, projectId, month: x.m, stored: x.v, effective,
          flagKey: flag ? 'rec.target.autofill_suspect' : null, ref: mkRef(x.col, row.row), version: x.m.slice(0, 4),
        });
      }
      for (const run of monthRuns(odd.map((x) => x.m))) {
        const x = odd.find((y) => y.m === run[run.length - 1]) as { m: Month; v: number; col: number };
        out.items.push(mkItem('target_autofill', {
          severity: 'minor', country, projectId, projectName: projectId ? nameByPid.get(projectId) ?? null : null, months: run, kpis: kpisFor(row.ind, country),
          params: { label: row.label }, reported: x.v, recalculated: mode.get(x.m.slice(0, 4)) ?? null, refs: run.map((m) => mkRef(row.byMonth.get(m) as number, row.row)),
        }));
      }
    }
  };

  // 2) Proyectos y hechos mensuales.
  o.projectBlocks.forEach((b, bi) => {
    const hist = o.isHistorical(b);
    let id = `${country.toLowerCase()}-${slug(b.name)}${hist ? '-hist' : ''}`;
    for (let k = 2; ids.has(id); k++) id = `${country.toLowerCase()}-${slug(b.name)}${hist ? '-hist' : ''}-${k}`;
    ids.add(id);
    pidByBlock.set(b.index, id);
    nameByPid.set(id, b.name);
    const rows = new Map<MeasureKey, BlockRow>();
    for (const r of b.rows) if (r.kind === 'measure' && !rows.has(r.ind as MeasureKey)) rows.set(r.ind as MeasureKey, r);
    const wRow = rows.get('workers');
    const dup = flagged[bi];
    const placeholders: Month[] = [];
    const clean = new Map<Month, number>();
    for (const [m, v] of hh[bi]) {
      if (dup.has(m) || (last !== null && m > last)) continue;
      const wc = wRow ? wRow.byMonth.get(m) : undefined;
      const w = wc === undefined ? null : readNum(cellAt(sh, wc, wRow!.row)).value;
      if (v > 0 && v <= 1 && (w === null || w === 0)) { placeholders.push(m); continue; }
      clean.set(m, v);
    }
    let first: Month | null = null;
    let lastM: Month | null = null;
    for (const [m, v] of clean) if (v > 0) { if (first === null || m < first) first = m; if (lastM === null || m > lastM) lastM = m; }
    const isPh = new Set(placeholders);
    let facts = 0;
    for (const m of b.months) {
      if (last !== null && m > last) continue;
      const v: MonthlyFact['v'] = {};
      const p: NonNullable<MonthlyFact['p']> = {};
      let any = false;
      const isDup = dup.has(m);
      for (const [k, row] of rows) {
        const col = row.byMonth.get(m);
        if (col === undefined) continue;
        const cell = cellAt(sh, col, row.row);
        const x = readNum(cell);
        let value = x.value;
        let q: QualityFlag = x.q;
        if (q === 'ok' && cell && cell.f === null && row.formulaShare >= 0.8) q = 'hardcoded';
        if (isDup) { value = null; q = 'template_duplicate'; }
        else if (k === 'hh' && isPh.has(m)) { value = null; q = 'placeholder'; }
        v[k] = value;
        const prov: FactProv = { c: `${sn}!${addr(col, row.row)}`, q };
        if (cell && cell.f) prov.f = cell.f;
        if (x.raw !== null) prov.raw = x.raw;
        p[k] = prov;
        if (value !== null && value !== 0) any = true;
      }
      const inWindow = first !== null && lastM !== null && m >= first && m <= lastM;
      if (!(any || inWindow || isDup || isPh.has(m) || typeof v.hh === 'number')) continue;
      out.monthly.push({ projectId: id, country, month: m, basis: 'reported_counts', file, v, p });
      facts++;
    }
    const titleRef = mkRef(o.bs.labelCol, b.titleRow ?? b.headerRow);
    out.projects.push({
      id, name: b.name || id, country, entity: null, client: null, activity: null,
      status: lastM !== null && last !== null && lastM >= last && !hist ? 'active' : 'closed',
      coords: null, coordsVerified: false, coordsSource: null, timezone: null, isDemo: false, firstMonth: first, lastMonth: lastM,
      sourceKey: o.sourceKey, sourceBlock: titleRef,
      ...(hist || b.hidden ? { notes: [{ key: hist ? 'rec.note.historical_block' : 'rec.note.hidden_block' }] } : {}),
    });
    out.previews.push({ file, sheet: sn, title: b.title, country, kind: hist ? 'historical' : 'project', firstMonth: first, lastMonth: lastM, measures: rows.size, note: dup.size ? { key: 'rec.note.template_months', params: { n: dup.size } } : null });
    const hhRow = rows.get('hh');
    for (const run of monthRuns([...dup])) {
      out.duplicatesFlagged += run.length;
      out.items.push(mkItem('template_duplicate', {
        severity: 'minor', country, projectId: id, projectName: b.name, months: run, kpis: ['R01', 'Q03'], params: { n: run.length },
        refs: hhRow ? [mkRef(hhRow.byMonth.get(run[0]) as number, hhRow.row), mkRef(hhRow.byMonth.get(run[run.length - 1]) as number, hhRow.row)] : [],
      }));
    }
    for (const run of monthRuns(placeholders)) {
      out.items.push(mkItem('placeholder', {
        severity: 'minor', country, projectId: id, projectName: b.name, months: run, kpis: ['R01', 'Q02'], params: { n: run.length },
        reported: run.reduce((s, m) => s + (hh[bi].get(m) ?? 0), 0), recalculated: 0, refs: hhRow ? run.map((m) => mkRef(hhRow.byMonth.get(m) as number, hhRow.row)) : [],
      }));
    }
    pushReported(b, 'project', id, (m) => first !== null && m >= first && !dup.has(m)); // incluye los meses posteriores al cierre del proyecto (ventanas móviles)
    pushTargets(b, 'target_project', id);
  });

  // 3) Consolidado de la fuente: cifras reportadas (solo para conciliar), metas y auditoría de referencias de sus fórmulas.
  const cb = o.consolidated;
  if (cb) {
    pushReported(cb, 'country', null, () => true);
    pushTargets(cb, 'target_corporate', null);
    const cm = cb.months.filter((m) => last === null || m <= last);
    out.previews.unshift({ file, sheet: sn, title: cb.title, country, kind: 'consolidated', firstMonth: cm[0] ?? null, lastMonth: cm[cm.length - 1] ?? null, measures: cb.rows.filter((r) => r.kind === 'measure').length, note: null });
    for (const row of cb.rows) {
      if (row.kind !== 'measure') continue;
      for (const [col, m] of row.cols) {
        if (last !== null && m > last) continue;
        const cell = cellAt(sh, col, row.row);
        if (!cell) continue;
        const x = readNum(cell);
        const cc: ConsolCell = {
          country, month: m, measure: row.ind as MeasureKey, label: row.label, ref: { file, sheet: sn, cell: addr(col, row.row), formula: cell.f },
          value: x.value, isFormula: cell.f !== null, hardcoded: cell.f === null && row.formulaShare >= 0.8, sameRow: [], mismatch: [],
        };
        if (cell.f) for (const rf of extractRefs(cell.f.slice(1))) {
          if (rf.qualified) continue;
          for (let r = rf.r1; r <= rf.r2 && r < rf.r1 + 200; r++) {
            const owner = blockOfRow(o.bs.blocks, r);
            if (owner === cb) continue;
            const pid = owner ? pidByBlock.get(owner.index) ?? null : null;
            const tr = o.bs.rowMap.get(r);
            if (pid && tr && tr.kind === 'measure' && tr.ind === row.ind && rf.c1 <= col && rf.c2 >= col) cc.sameRow.push(pid);
            else cc.mismatch.push({ projectId: pid, label: tr ? tr.label : null, cell: addr(rf.c1, r) });
          }
        }
        out.consol.push(cc);
      }
    }
    // «Accidentes a la persona» no siempre es la suma de las filas por nivel: los conteos usan las filas por nivel.
    const rep = new Map<string, number>();
    for (const c of out.consol) if (c.value !== null) rep.set(c.measure + '|' + c.month, c.value);
    const off: Month[] = [];
    for (const m of cm) {
      const person = rep.get('accPerson|' + m);
      if (person === undefined) continue;
      let sum = 0;
      let n = 0;
      for (const k of NV_ROWS) { const v = rep.get(k + '|' + m); if (v !== undefined) { sum += v; n++; } }
      if (n === NV_ROWS.length && sum !== person) off.push(m);
    }
    const pRow = measureRow(cb, 'accPerson');
    for (const run of monthRuns(off)) {
      out.items.push(mkItem('person_row_not_sum', {
        severity: 'minor', country, months: run, kpis: ['R04', 'R07'], params: { label: pRow ? pRow.label : '' },
        reported: run.reduce((s, m) => s + (rep.get('accPerson|' + m) ?? 0), 0),
        recalculated: run.reduce((s, m) => s + NV_ROWS.reduce((t, k) => t + (rep.get(k + '|' + m) ?? 0), 0), 0),
        refs: pRow ? run.map((m) => mkRef(pRow.byMonth.get(m) as number, pRow.row)) : [],
      }));
    }
    // Cambios de composición de las fórmulas del consolidado durante el año de corte.
    if (last !== null) {
      const from = last.slice(0, 4) + '-01';
      const sig = new Map<string, string>();
      const changed = new Set<Month>();
      const rowsChanged = new Set<string>();
      const refs: CellRef[] = [];
      for (const c of [...out.consol].sort((a, b) => (a.measure === b.measure ? (a.month < b.month ? -1 : 1) : a.measure < b.measure ? -1 : 1))) {
        if (!c.isFormula) continue;
        const s = [...c.sameRow].sort().join(',') + '#' + c.mismatch.length;
        const prev = sig.get(c.measure);
        if (prev !== undefined && prev !== s && c.month >= from) { changed.add(c.month); if (!rowsChanged.has(c.measure)) refs.push(c.ref); rowsChanged.add(c.measure); }
        sig.set(c.measure, s);
      }
      if (changed.size) out.items.push(mkItem('composition_change', { country, months: [...changed], kpis: ['R01', 'Q02'], params: { rows: rowsChanged.size, changes: changed.size }, refs }));
    }
  }

  // 4) Hallazgos de la hoja: meses futuros con solo encabezado y celdas con error guardado.
  const future = new Set<Month>();
  for (const b of cb ? [cb, ...o.projectBlocks] : o.projectBlocks) for (const m of b.months) if (last !== null && m > last) future.add(m);
  if (future.size) {
    const hdr = cb ?? o.projectBlocks[0];
    const row = hdr.rows.find((r) => r.kind === 'measure');
    out.items.push(mkItem('future_months', { country, months: [...future], kpis: ['Q02'], params: { n: future.size, last: last ?? '' }, refs: row ? [...future].sort().map((m) => ({ file, sheet: sn, cell: addr(row.byMonth.get(m) ?? 1, hdr.headerRow), formula: null })) : [] }));
  }
  const mine = cb ? [cb, ...o.projectBlocks] : o.projectBlocks;
  const fixes = o.bs.headerFixes.filter((f) => mine.some((b) => f.row >= b.firstRow && f.row <= b.lastRow));
  if (fixes.length) {
    out.items.push(mkItem('header_dates', {
      country, kpis: ['Q01'], params: { rows: fixes.length, blank: fixes.reduce((s, f) => s + f.blank, 0), wrong: fixes.reduce((s, f) => s + f.wrong, 0) },
      refs: fixes.map((f) => ({ file, sheet: sn, cell: addr(f.col, f.row), formula: null })),
    }));
  }
  let errors = 0;
  const errRefs: CellRef[] = [];
  for (const [a, c] of sh.cells) if (c.t === 'e') { errors++; if (errRefs.length < 6) errRefs.push({ file, sheet: sn, cell: a, formula: c.f }); }
  if (errors) out.items.push(mkItem('error_cells', { country, kpis: ['C01', 'C02', 'C03', 'C04'], params: { n: errors, imported: out.reported.filter((r) => r.quality === 'error').length }, refs: errRefs }));
  return out;
}
