/** Paneles laterales (no cambian de ruta): ficha de KPI, catálogo, metodología local, ficha de proyecto, señal, celda de riesgo, conciliación, importación y personalización. */
import { Fragment, useMemo, useRef, useState, type ReactNode } from 'react';
import { Copy, Download, FileSpreadsheet, Funnel, Trash2, Upload } from 'lucide-react';
import type { CellRef, CountryCode } from '../domain/types';
import { COUNTRIES } from '../domain/types';
import { KPI_IDS, type DetailRow, type IngestResult, type InputFile, type KpiDef, type KpiValue } from '../domain/model';
import { hasKey, type TFn } from '../i18n/core';
import { getIngestApi } from '../engineProvider';
import { exportCsv } from '../export';
import { actions, useI18n, type SheetCtx } from '../state/store';
import { TrendMultiples } from './charts';
import { compareText, hasValue, targetText } from './KpiBand';
import { Prio } from './panels';
import { DataTable, Drawer, Seg, StatusChip, Tabs, fmtKv, kpiText, tx, valueParts, type TableSpec } from './primitives';

const refTxt = (r: CellRef | null | undefined): string => (r ? `${r.file} › ${r.sheet}!${r.cell}` : '—');
const flagText = (t: TFn, f: string): string => (hasKey('es', `ui.flag.${f}`) ? t(`ui.flag.${f}`) : f);
function Sect({ title, children }: { title: string; children: ReactNode }) { return <section className="sect"><h3>{title}</h3>{children}</section>; }
function DL({ rows }: { rows: Array<[string, ReactNode]> }) {
  return <dl className="dl">{rows.map((r) => (r[1] != null && r[1] !== '' && r[1] !== false ? <Fragment key={r[0]}><dt>{r[0]}</dt><dd>{r[1]}</dd></Fragment> : null))}</dl>;
}

function KpiSheet({ ctx, id }: { ctx: SheetCtx; id: string }) {
  const { t, fmt, lang } = useI18n();
  const { engine, ds, app } = ctx;
  const d = useMemo(() => engine.kpiDetail(ds, app.filters, id), [engine, ds, app.filters, id]);
  const k = d.value, has = hasValue(k), p = valueParts(fmt, k.value, k.unit, k.decimals);
  const n = (v: number | null | undefined, dec = k.decimals) => (v == null ? null : fmt.num(v, Number.isInteger(v) && Math.abs(v) >= 1000 ? 0 : dec));
  const rowsSpec = (rows: DetailRow[]): TableSpec => ({ cols: [t('ui.col.item'), t('ui.col.value'), t('ui.col.ref')], rows: rows.map((r) => [tx(t, r.label), r.value == null ? null : fmtKv(fmt, r.value, r.unit ?? 'none', Number.isInteger(r.value) ? 0 : 2), refTxt(r.ref)]) });
  const fields = ['purpose', 'formula', 'numerator', 'denominator', 'exclusions', 'source', 'periodicity', 'owner', 'target', 'missing'] as const;
  const byC = COUNTRIES.filter((c) => k.byCountry[c]);
  return (
    <Drawer t={t} title={`${id} · ${kpiText(lang, t, id, 'name')}`} sub={fmt.monthRange(app.filters.from, app.filters.to)} onClose={actions.close}>
      <div className="ks-top">
        <b className="val">{has ? p.text : t(`ui.state.${k.state}.short`)}</b>{has ? <span className="unit">{p.unit}</span> : null}
        <StatusChip level={k.status} t={t} note={tx(t, k.statusNote)} />
        {k.flags.includes('demo') ? <span className="chip chip-neutral">{t('ui.demo.badge')}</span> : null}
      </div>
      {!has || k.state === 'zero' ? <p className="note">{t(`ui.state.${k.state}`)}{k.reason ? ` — ${tx(t, k.reason)}` : ''}</p> : null}
      {k.statusNote ? <p className="note">{tx(t, k.statusNote)}</p> : null}
      <DL rows={[
        ...fields.map((f): [string, ReactNode] => [t(`ui.ks.${f}`), kpiText(lang, t, id, f)]),
        [t('ui.ks.calc'), k.numerator != null ? `${n(k.numerator, 2)}${k.denominator != null ? ` / ${n(k.denominator, 0)}` : ''}${k.constant ? ` × ${fmt.int(k.constant)}` : ''}` : null],
        [t('ui.ks.targetValue'), k.target ? `${targetText(k, t, fmt)} · ${t(`ui.ks.kind.${k.target.kind}`)} · ${k.target.version}` : null],
        [t('ui.ks.interval'), k.interval ? `${n(k.interval[0])} – ${n(k.interval[1])}` : null],
        [t('ui.ks.compare'), k.compare ? `${compareText(k, t, fmt)} (${fmt.monthRange(k.compare.from, k.compare.to)})` : null],
        [t('ui.ks.eligible'), d.eligibleRecords == null ? null : fmt.int(d.eligibleRecords)],
        [t('ui.ks.updated'), fmt.dateTime(d.lastUpdated)],
        [t('ui.ks.version'), `${d.def.version} · ${fmt.date(d.def.effectiveDate)}`],
      ]} />
      {k.secondary.length ? <Sect title={t('ui.ks.secondary')}><DL rows={k.secondary.map((s): [string, ReactNode] => [tx(t, s.label), s.value == null ? t('ui.state.nd.short') : fmtKv(fmt, s.value, s.unit, s.decimals)])} /></Sect> : null}
      {k.flags.length || k.coverage.length ? (
        <Sect title={t('ui.ks.flags')}><ul className="plain">{k.flags.map((f) => <li key={f}>{flagText(t, f)}</li>)}{k.coverage.map((c, i) => <li key={i}>{c.country ?? ''} {t(`ui.ks.cov.${c.kind}`)}: {tx(t, c.reason)}</li>)}</ul></Sect>
      ) : null}
      {d.reported ? (
        <Sect title={t('ui.ks.reported')}>
          <DL rows={[[t('ui.ks.reportedValue'), n(d.reported.value)], [t('ui.ks.recalculated'), n(k.value)], [t('ui.ks.delta'), d.reported.delta == null ? null : fmt.signed(d.reported.delta, k.decimals)],
            [t('ui.col.ref'), <span className="mono">{refTxt(d.reported.ref)}</span>], [t('ui.ks.note'), tx(t, d.reported.note)]]} />
        </Sect>
      ) : null}
      {d.numeratorRows.length ? <Sect title={t('ui.ks.numeratorRows')}><DataTable className="tbl-refs" spec={rowsSpec(d.numeratorRows)} /></Sect> : null}
      {d.denominatorRows.length ? <Sect title={t('ui.ks.denominatorRows')}><DataTable className="tbl-refs" spec={rowsSpec(d.denominatorRows)} /></Sect> : null}
      {d.exclusions.length ? <Sect title={t('ui.ks.exclusionRows')}><DataTable spec={{ cols: [t('ui.col.item'), t('ui.col.count')], rows: d.exclusions.map((e) => [tx(t, e.reason), e.count]) }} /></Sect> : null}
      {byC.length ? (
        <Sect title={t('ui.ks.byCountry')}><DataTable spec={{ cols: [t('ui.col.country'), t('ui.col.value'), t('ui.col.numerator'), t('ui.col.denominator'), t('ui.col.state')],
          rows: byC.map((c) => { const b = k.byCountry[c]; return [t(`country.${c}`), b?.value == null ? t(`ui.state.${b?.state ?? 'nd'}.short`) : n(b.value), n(b?.numerator, 0), n(b?.denominator, 0), t(`ui.status.${b?.status ?? 'nodata'}`)]; }) }} /></Sect>
      ) : null}
      {d.series.length ? <Sect title={t('ui.ks.series')}><DataTable spec={{ cols: [t('ui.col.month'), t('ui.col.value'), t('ui.col.numerator'), t('ui.col.denominator')], rows: d.series.map((s) => [fmt.month(s.month), n(s.value), n(s.numerator, 0), n(s.denominator, 0)]) }} /></Sect> : null}
      {d.byProject.length ? (
        <Sect title={t('ui.ks.byProject')}><DataTable spec={{ cols: [t('ui.col.project'), t('ui.col.country'), t('ui.col.value'), t('ui.col.numerator'), t('ui.col.denominator')],
          rows: d.byProject.map((r) => [r.name, r.country, r.value == null ? t(`ui.state.${r.state}.short`) : n(r.value), n(r.numerator, 0), n(r.denominator, 0)]) }} /></Sect>
      ) : null}
      {d.notes.length ? <Sect title={t('ui.ks.notes')}><ul className="plain">{d.notes.map((x, i) => <li key={i}>{tx(t, x)}</li>)}</ul></Sect> : null}
    </Drawer>
  );
}

const GROUPS = ['all', 'R', 'P', 'O', 'H', 'PA', 'D', 'Q', 'C'] as const;
function Catalogue({ ctx }: { ctx: SheetCtx }) {
  const { t, fmt, lang } = useI18n();
  const { engine, ds, app } = ctx;
  const defs = useMemo(() => engine.catalog(), [engine]);
  const vals = useMemo(() => new Map(engine.kpiValues(ds, app.filters).map((k) => [k.id, k] as const)), [engine, ds, app.filters]);
  const [q, setQ] = useState('');
  const [g, setG] = useState<(typeof GROUPS)[number]>('all');
  const s = q.trim().toLowerCase();
  const inG = (d: KpiDef) => g === 'all' || (g === 'PA' ? d.group === 'PE' || d.group === 'CO' || d.group === 'BR' : g === 'C' ? d.group === 'C' || d.group === 'SIG' : d.group === g);
  const list = defs.filter((d) => inG(d) && (!s || d.id.toLowerCase().includes(s) || kpiText(lang, t, d.id, 'name').toLowerCase().includes(s)));
  return (
    <Drawer t={t} title={t('ui.menu.catalog')} sub={t('ui.catalog.sub', { n: defs.length })} onClose={actions.close}>
      <label className="fld fld-col"><span className="fld-l">{t('ui.catalog.search')}</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('ui.catalog.placeholder')} /></label>
      <Seg<(typeof GROUPS)[number]> label={t('ui.catalog.groups')} value={g} onChange={setG} items={GROUPS.map((x) => ({ key: x, label: t(`ui.group.${x}`) }))} />
      <p className="muted" role="status">{t('ui.catalog.count', { n: list.length })}</p>
      <ul className="cat">
        {list.map((d) => {
          const k = vals.get(d.id);
          return (
            <li key={d.id}>
              <button type="button" className="cat-r" onClick={() => actions.open({ kind: 'kpi', id: d.id })}>
                <span className="mono code">{d.id}</span><span className="cat-n">{kpiText(lang, t, d.id, 'name')}</span>
                <span className={`chip chip-s-${k?.state ?? 'nd'}`}>{t(`ui.state.${k?.state ?? 'nd'}.short`)}</span>
                <b className="num">{k && hasValue(k) ? fmtKv(fmt, k.value, k.unit, k.decimals) : '—'}</b>
              </button>
            </li>
          );
        })}
      </ul>
    </Drawer>
  );
}

function Methodology({ ctx }: { ctx: SheetCtx }) {
  const { t, fmt, lang } = useI18n();
  const { engine, ds, app } = ctx;
  const m = useMemo(() => engine.localMethodology(ds, app.filters), [engine, ds, app.filters]);
  const [c, setC] = useState<CountryCode>('PE');
  const cur = m.countries.find((x) => x.code === c);
  const spec = (ks: KpiValue[]): TableSpec => ({ cols: [t('ui.col.code'), t('ui.col.indicator'), t('ui.col.value'), t('ui.col.unit'), t('ui.col.state')],
    rows: ks.map((k) => [k.id, kpiText(lang, t, k.id, 'name'), hasValue(k) ? fmt.num(k.value, k.decimals) : null, fmt.unit(k.unit), t(`ui.state.${k.state}.short`)]) });
  return (
    <Drawer t={t} title={t('ui.menu.method')} sub={t('ui.method.sub')} onClose={actions.close}>
      <Tabs<CountryCode> label={t('ui.filter.countries')} value={c} onChange={setC} tabs={COUNTRIES.map((x) => ({ key: x, label: t(`country.${x}`) }))} />
      {cur ? (
        <>
          <DL rows={[[t('ui.method.profile'), tx(t, cur.profile)], [t('ui.method.validity'), tx(t, cur.validity)], [t('ui.method.population'), tx(t, cur.population)]]} />
          <Sect title={t('ui.method.national')}><DataTable spec={spec(cur.kpis)} /></Sect>
          <Sect title={t('ui.method.reported')}><DataTable spec={spec(cur.reportedScheme)} /></Sect>
          {cur.notes.length ? <ul className="plain">{cur.notes.map((x, i) => <li key={i}>{tx(t, x)}</li>)}</ul> : null}
        </>
      ) : <p className="muted">{t('ui.state.nd')}</p>}
      <Sect title={t('ui.method.rules')}><ul className="plain">{m.rules.map((x, i) => <li key={i}>{tx(t, x)}</li>)}</ul></Sect>
    </Drawer>
  );
}

function ProjectDrawer({ ctx, id }: { ctx: SheetCtx; id: string }) {
  const { t, fmt, lang } = useI18n();
  const { engine, ds, app } = ctx;
  const s = useMemo(() => (ds ? engine.projectSheet(ds, app.filters, id) : null), [engine, ds, app.filters, id]);
  if (!s) return null;
  const p = s.project;
  return (
    <Drawer t={t} wide title={p.name} sub={`${t(`country.${p.country}`)} · ${fmt.monthRange(app.filters.from, app.filters.to)}`} onClose={actions.close}>
      <div className="row">
        {p.isDemo ? <span className="chip chip-neutral">{t('ui.demo.badge')}</span> : null}
        <button type="button" className="btn btn-s" onClick={() => { actions.setFilters({ projectIds: [p.id] }); actions.close(); }}><Funnel size={13} aria-hidden="true" /><span>{t('ui.project.filter')}</span></button>
      </div>
      <DL rows={[[t('ui.project.status'), t(`ui.project.status.${p.status}`)], [t('ui.project.entity'), p.entity], [t('ui.project.client'), p.client], [t('ui.filter.activity'), p.activity],
        [t('ui.project.coords'), p.coords ? `${fmt.num(p.coords.lat, 2)}, ${fmt.num(p.coords.lon, 2)} · ${t(p.coordsVerified ? 'ui.project.coordsOk' : 'ui.project.coordsNo')}${p.coordsSource ? ` (${p.coordsSource})` : ''}` : t('ui.project.noCoords')],
        [t('ui.project.months'), p.firstMonth && p.lastMonth ? fmt.monthRange(p.firstMonth, p.lastMonth) : null]]} />
      <Sect title={t('ui.project.kpis')}>
        <DataTable spec={{ cols: [t('ui.col.code'), t('ui.col.indicator'), t('ui.col.value'), t('ui.col.state')], rows: s.kpis.map((k) => [k.id, kpiText(lang, t, k.id, 'name'), hasValue(k) ? fmtKv(fmt, k.value, k.unit, k.decimals) : null, t(`ui.status.${k.status}`)]) }} />
      </Sect>
      <Sect title={t('ui.trend.title')}><div className="drawer-chart"><TrendMultiples model={s.trend} t={t} fmt={fmt} onRange={actions.setRange} /></div></Sect>
      <Sect title={t('ui.signals.title')}>
        {s.signals.length ? <ul className="plain">{s.signals.map((x) => <li key={x.id}><Prio p={x.priority} /> {tx(t, x.title)}</li>)}</ul> : <p className="muted">{t('ui.signals.none')}</p>}
      </Sect>
      {s.recon.length ? <Sect title={t('ui.menu.recon')}><ul className="plain">{s.recon.map((r) => <li key={r.id}>{t(`ui.recon.sev.${r.severity}`)}: {t(r.issueKey, r.params)}</li>)}</ul></Sect> : null}
      {s.notes.length ? <ul className="plain muted">{s.notes.map((x, i) => <li key={i}>{tx(t, x)}</li>)}</ul> : null}
    </Drawer>
  );
}

function SignalDrawer({ ctx, id }: { ctx: SheetCtx; id: string }) {
  const { t, fmt } = useI18n();
  const [copied, setCopied] = useState(false);
  const sm = ctx.model?.signals;
  if (!sm) return null;
  if (id === '__gate') {
    const g = sm.predictive, v = g.validation, o = g.outputs;
    return (
      <Drawer t={t} title={t('ui.gate.title')} sub={t(g.enabled ? (g.isSimulation ? 'ui.gate.sim' : 'ui.gate.on') : 'ui.gate.off')} onClose={actions.close}>
        <Sect title={t('ui.gate.reasons')}><ul className="plain">{g.reasons.map((x, i) => <li key={i}>{tx(t, x)}</li>)}</ul></Sect>
        {v ? (
          <Sect title={t('ui.gate.validation')}>
            <DL rows={[[t('ui.gate.model'), `${v.model} · ${v.version}`], [t('ui.gate.window'), fmt.monthRange(v.window.from, v.window.to)], [t('ui.gate.sample'), t('ui.gate.sampleText', { months: v.sample.months, events: v.sample.events })],
              [t('ui.gate.baseline'), `${v.baselineName}: ${fmt.num(v.baselineScore, 2)}`], [t('ui.gate.candidate'), fmt.num(v.candidateScore, 2)], [t('ui.gate.coverage'), v.intervalCoverage == null ? null : fmt.pct(v.intervalCoverage * 100, 0)],
              [t('ui.gate.calibration'), tx(t, v.calibration)], [t('ui.gate.validated'), fmt.date(v.lastValidatedAt)]]} />
          </Sect>
        ) : null}
        {o ? (
          <Sect title={t(g.isSimulation ? 'ui.gate.outputsSim' : 'ui.gate.outputs')}>
            <DataTable spec={{ cols: [t('ui.gate.horizon'), 'D01', t('ui.ks.interval'), 'D02'], rows: o.expected.map((e, i) => [t('ui.signals.due', { n: e.horizonDays }), fmt.num(e.expected, 1), `${fmt.num(e.lo, 1)} – ${fmt.num(e.hi, 1)}`, fmt.num(o.probability[i]?.p ?? null, 2)]) }} />
            {o.futureRate ? <p className="note">D03: {fmt.num(o.futureRate.value, 2)} {fmt.unit('per1e6hh')} · {tx(t, o.futureRate.assumption)} ({fmt.compact(o.futureRate.hhAssumed, 1)} {fmt.unit('hh')})</p> : null}
          </Sect>
        ) : <p className="note">{t('ui.gate.noOutputs')}</p>}
      </Drawer>
    );
  }
  const s = sm.signals.find((x) => x.id === id);
  if (!s) return null;
  const rec = tx(t, s.recommendation);
  const copy = () => { void navigator.clipboard?.writeText(`${tx(t, s.title)} — ${rec}`).then(() => setCopied(true)).catch(() => setCopied(false)); };
  return (
    <Drawer t={t} title={tx(t, s.title)} sub={[s.scope.projectName, s.scope.country ? t(`country.${s.scope.country}`) : null].filter(Boolean).join(' · ')} onClose={actions.close}>
      <div className="row"><Prio p={s.priority} />{s.isDemo ? <span className="chip chip-neutral">{t('ui.demo.badge')}</span> : null}<span className="mono muted">{s.ruleId}</span></div>
      <DL rows={[[t('ui.signal.what'), tx(t, s.whatChanged)], [t('ui.signal.kind'), t(`ui.signal.kind.${s.kind}`)], [t('ui.signals.owner'), tx(t, s.ownerRole)],
        [t('ui.signal.due'), s.dueInDays == null ? t('ui.signals.noDue') : t('ui.signals.due', { n: s.dueInDays })], [t('ui.signals.rec'), rec]]} />
      <Sect title={t('ui.signal.evidence')}><ul className="plain">{s.evidence.map((e, i) => <li key={i}>{tx(t, e.text)}{e.ref ? <> <span className="mono muted">{refTxt(e.ref)}</span></> : null}</li>)}</ul></Sect>
      <div className="row">
        <button type="button" className="btn btn-s" onClick={copy}><Copy size={13} aria-hidden="true" /><span>{t(copied ? 'ui.signal.copied' : 'ui.signal.copy')}</span></button>
        {s.scope.projectId ? <button type="button" className="btn btn-s" onClick={() => actions.open({ kind: 'project', id: s.scope.projectId as string })}>{t('ui.project.open')}</button> : null}
      </div>
      <p className="hint">{t('ui.signal.disclaimer')}</p>
    </Drawer>
  );
}

function RiskDrawer({ ctx, risk, projectId }: { ctx: SheetCtx; risk: string; projectId: string }) {
  const { t, fmt } = useI18n();
  const r = ctx.model?.risk, c = r?.cells.find((x) => x.risk === risk && x.projectId === projectId);
  if (!r || !c) return null;
  const label = r.risks.find((x) => x.key === risk)?.label, pname = r.projects.find((x) => x.id === projectId)?.name ?? projectId;
  return (
    <Drawer t={t} title={tx(t, label) || risk} sub={pname} onClose={actions.close}>
      <div className="row"><StatusChip level={c.status} t={t} /></div>
      <DL rows={[[t('ui.risk.coverage'), `${fmt.pct(c.coveragePct, 1)} (${c.done}/${c.due})`], [t('ui.risk.effectiveness'), `${fmt.pct(c.effectivenessPct, 1)} (${c.conform}/${c.done})`],
        [t('ui.risk.failures'), fmt.int(c.activeFailures)], [t('ui.risk.coverage.def'), t('ui.risk.coverage.text')], [t('ui.risk.effectiveness.def'), t('ui.risk.effectiveness.text')]]} />
      {c.activeFailures ? <p className="note">{t('ui.risk.failureNote')}</p> : null}
      <p className="hint">{t('ui.risk.detailNote')}</p>
      <button type="button" className="btn btn-s" onClick={() => actions.open({ kind: 'project', id: projectId })}>{t('ui.project.open')}</button>
    </Drawer>
  );
}

function Recon({ ctx }: { ctx: SheetCtx }) {
  const { t, fmt, lang } = useI18n();
  const items = ctx.ds?.reconciliation ?? [];
  const [sev, setSev] = useState('');
  const [cc, setCc] = useState('');
  const [q, setQ] = useState('');
  const s = q.trim().toLowerCase();
  const rows = items.filter((r) => (!sev || r.severity === sev) && (!cc || r.country === cc) && (!s || `${r.projectName ?? ''} ${t(r.issueKey, r.params)} ${r.kpisAffected.join(' ')}`.toLowerCase().includes(s)));
  const spec: TableSpec = {
    cols: [t('ui.recon.severity'), t('ui.col.country'), t('ui.col.project'), t('ui.recon.months'), 'KPI', t('ui.recon.issue'), t('ui.recon.source'), t('ui.recon.reason'), t('ui.recon.rule'), t('ui.ks.reportedValue'), t('ui.ks.recalculated'), t('ui.ks.delta'), t('ui.col.ref')],
    rows: rows.map((r) => [t(`ui.recon.sev.${r.severity}`), r.country, r.projectName, r.months ? r.months.map((m) => fmt.month(m)).join(', ') : null, r.kpisAffected.join(' '), t(r.issueKey, r.params), t(r.sourceChosenKey), t(r.reasonKey), t(r.ruleKey),
      r.reportedValue == null ? null : fmt.num(r.reportedValue, 2), r.recalculatedValue == null ? null : fmt.num(r.recalculatedValue, 2), r.delta == null ? null : fmt.signed(r.delta, 2), r.refs.map(refTxt).join(' | ')]),
  };
  return (
    <Drawer t={t} wide title={t('ui.menu.recon')} sub={t('ui.recon.sub', { n: items.length })} onClose={actions.close}>
      <div className="row">
        <label className="fld"><span className="fld-l">{t('ui.recon.severity')}</span><select value={sev} onChange={(e) => setSev(e.target.value)}><option value="">{t('ui.filter.all')}</option>{(['material', 'minor', 'info'] as const).map((x) => <option key={x} value={x}>{t(`ui.recon.sev.${x}`)}</option>)}</select></label>
        <label className="fld"><span className="fld-l">{t('ui.col.country')}</span><select value={cc} onChange={(e) => setCc(e.target.value)}><option value="">{t('ui.filter.all')}</option>{COUNTRIES.map((x) => <option key={x} value={x}>{t(`country.${x}`)}</option>)}</select></label>
        <label className="fld"><span className="fld-l">{t('ui.catalog.search')}</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <button type="button" className="btn btn-s" disabled={!rows.length} onClick={() => exportCsv([{ key: 'recon', title: t('ui.menu.recon'), columns: spec.cols, rows: spec.rows, meta: [] }], `incimmet-sst_${t('ui.recon.file')}`, lang)}><Download size={13} aria-hidden="true" /><span>CSV</span></button>
      </div>
      <p className="muted" role="status">{t('ui.catalog.count', { n: rows.length })}</p>
      {rows.length ? <DataTable className="tbl-refs tbl-wide" spec={spec} /> : <p className="note">{t(items.length ? 'ui.recon.noMatch' : 'ui.recon.empty')}</p>}
    </Drawer>
  );
}

// ---------- importación local ----------
const TEMPLATES = ['plan_anual', 'controles_criticos', 'verificaciones', 'acciones', 'eventos', 'casos', 'salud_agregada', 'higiene', 'proyectos_geo'];
function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, ''), first = src.split(/\r?\n/, 1)[0] ?? '';
  const sep = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = []; let row: string[] = [], cur = '', quoted = false;
  const endRow = () => { row.push(cur); cur = ''; if (row.some((c) => c !== '')) rows.push(row); row = []; };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) { if (ch === '"') { if (src[i + 1] === '"') { cur += '"'; i++; } else quoted = false; } else cur += ch; }
    else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && src[i + 1] === '\n') i++; endRow(); }
    else cur += ch;
  }
  endRow();
  return rows;
}
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
let tplCache: Record<string, string[]> | null = null;
async function loadTemplates(): Promise<Record<string, string[]>> {
  if (tplCache) return tplCache;
  const out: Record<string, string[]> = {};
  await Promise.all(TEMPLATES.map(async (n) => { try { const r = await fetch(`/templates/${n}.csv`); out[n] = r.ok ? parseCsv(await r.text())[0] ?? [] : []; } catch { out[n] = []; } }));
  tplCache = out;
  return out;
}
interface CsvMap { name: string; rows: string[][]; template: string; target: string[]; map: Record<string, number> }
function makeMap(name: string, rows: string[][], template: string, target: string[]): CsvMap {
  const head = (rows[0] ?? []).map(norm), map: Record<string, number> = {};
  target.forEach((c) => { map[c] = head.indexOf(norm(c)); });
  return { name, rows, template, target, map };
}
const csvCell = (s: string) => (/[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

function ImportDrawer({ ctx }: { ctx: SheetCtx }) {
  const { t, fmt } = useI18n();
  const api = getIngestApi();
  const [res, setRes] = useState<IngestResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [csv, setCsv] = useState<CsvMap | null>(null);
  const [tpl, setTpl] = useState<Record<string, string[]>>({});
  const [confirm, setConfirm] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const run = async (files: InputFile[]) => {
    if (!api || !files.length) return;
    setBusy(true); setErr(null);
    try { setRes(await api.ingestFiles(files, res?.dataset ?? ctx.app.real)); } catch { setErr(t('ui.import.error')); } finally { setBusy(false); }
  };
  const onFiles = async (list: File[]) => {
    const books = list.filter((f) => /\.(xlsx|xlsm|xls)$/i.test(f.name)), c = list.find((f) => /\.csv$/i.test(f.name));
    if (!books.length && !c) { setErr(t('ui.import.unsupported')); return; }
    if (c) {
      const rows = parseCsv(await c.text()), all = await loadTemplates(), head = (rows[0] ?? []).map(norm);
      const best = TEMPLATES.map((n) => [n, (all[n] ?? []).filter((x) => head.includes(norm(x))).length] as const).sort((a, b) => b[1] - a[1])[0][0];
      setTpl(all); setCsv(makeMap(c.name, rows, best, all[best] ?? []));
    }
    if (books.length) await run(await Promise.all(books.map(async (f) => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()), lastModified: f.lastModified }))));
  };
  const applyCsv = async () => {
    if (!csv) return;
    const lines = [csv.target.join(','), ...csv.rows.slice(1).map((r) => csv.target.map((c) => csvCell(csv.map[c] >= 0 ? r[csv.map[c]] ?? '' : '')).join(','))];
    await run([{ name: `${csv.template}.csv`, bytes: new TextEncoder().encode(lines.join('\r\n')), lastModified: Date.now() }]);
    setCsv(null);
  };
  const use = async () => {
    if (!res?.dataset) return;
    await actions.setRealDataset(res.dataset, { at: new Date().toISOString(), files: res.files.map((f) => f.name), cutoff: res.dataset.cutoffMonth, facts: res.stats.factsCreated });
    actions.close();
  };
  return (
    <Drawer t={t} wide title={t('ui.menu.import')} sub={t('ui.import.sub')} onClose={actions.close}>
      <p className="hint">{t('ui.import.local')}</p>
      {!api ? <p className="note">{t('ui.import.noApi')}</p> : null}
      <div className={`drop${over ? ' over' : ''}${api ? '' : ' off'}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (api) void onFiles(Array.from(e.dataTransfer.files)); }}>
        <FileSpreadsheet size={22} aria-hidden="true" />
        <p>{t('ui.import.drop')}</p>
        <input ref={input} type="file" multiple accept=".xlsx,.xlsm,.xls,.csv" className="sr" tabIndex={-1} aria-hidden="true" onChange={(e) => { void onFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
        <button type="button" className="btn btn-accent" disabled={!api || busy} onClick={() => input.current?.click()}><Upload size={14} aria-hidden="true" /><span>{t(busy ? 'ui.import.busy' : 'ui.import.choose')}</span></button>
      </div>
      {err ? <p className="note" role="alert">{err}</p> : null}
      {csv ? (
        <Sect title={t('ui.import.mapTitle', { file: csv.name })}>
          <label className="fld"><span className="fld-l">{t('ui.import.template')}</span>
            <select value={csv.template} onChange={(e) => setCsv(makeMap(csv.name, csv.rows, e.target.value, tpl[e.target.value] ?? []))}>{TEMPLATES.map((n) => <option key={n} value={n}>{n}.csv</option>)}</select></label>
          <table className="tbl"><thead><tr><th scope="col">{t('ui.import.targetCol')}</th><th scope="col">{t('ui.import.sourceCol')}</th></tr></thead>
            <tbody>{csv.target.map((c) => (
              <tr key={c}><th scope="row" className="mono">{c}</th><td>
                <select aria-label={c} value={csv.map[c]} onChange={(e) => setCsv({ ...csv, map: { ...csv.map, [c]: Number(e.target.value) } })}><option value={-1}>{t('ui.import.unmapped')}</option>{(csv.rows[0] ?? []).map((h, i) => <option key={i} value={i}>{h}</option>)}</select>
              </td></tr>))}</tbody></table>
          <div className="row"><button type="button" className="btn btn-s btn-accent" disabled={!api || busy} onClick={() => void applyCsv()}>{t('ui.import.applyMap')}</button><button type="button" className="btn btn-s" onClick={() => setCsv(null)}>{t('ui.cancel')}</button><span className="muted">{t('ui.import.rows', { n: Math.max(0, csv.rows.length - 1) })}</span></div>
        </Sect>
      ) : null}
      {res ? (
        <>
          {res.errors.length ? <ul className="plain note" role="alert">{res.errors.map((e, i) => <li key={i}>{tx(t, e)}</li>)}</ul> : null}
          <Sect title={t('ui.import.files')}>
            <DataTable spec={{ cols: [t('ui.import.file'), t('ui.import.profile'), t('ui.col.country'), t('ui.import.lastMonth'), t('ui.import.sheetsUsed'), t('ui.import.sheetsIgnored')],
              rows: res.files.map((f) => [f.name, t(`ui.import.profile.${f.profile}`), f.country, f.lastDataMonth ? fmt.month(f.lastDataMonth) : null, f.sheets.filter((s) => s.used).map((s) => s.name).join(', ') || null, f.sheets.filter((s) => !s.used).map((s) => s.name).join(', ') || null]) }} />
            {res.files.some((f) => f.warnings.length) ? <ul className="plain">{res.files.flatMap((f) => f.warnings.map((w, i) => <li key={`${f.key}-${i}`}>{f.name}: {tx(t, w)}</li>))}</ul> : null}
          </Sect>
          <Sect title={t('ui.import.blocks', { n: res.blocks.length })}>
            <DataTable spec={{ cols: [t('ui.import.file'), t('ui.import.sheet'), t('ui.import.block'), t('ui.col.country'), t('ui.import.kind'), t('ui.recon.months'), t('ui.import.measures'), t('ui.ks.note')],
              rows: res.blocks.slice(0, 60).map((b) => [b.file, b.sheet, b.title, b.country, t(`ui.import.kind.${b.kind}`), b.firstMonth && b.lastMonth ? fmt.monthRange(b.firstMonth, b.lastMonth) : null, b.measures, tx(t, b.note)]) }} />
          </Sect>
          <Sect title={t('ui.import.issues', { n: res.issues.length })}>
            {res.issues.length ? <DataTable spec={{ cols: [t('ui.recon.severity'), t('ui.col.country'), t('ui.col.project'), t('ui.recon.issue')], rows: res.issues.slice(0, 80).map((r) => [t(`ui.recon.sev.${r.severity}`), r.country, r.projectName, t(r.issueKey, r.params)]) }} /> : <p className="muted">{t('ui.recon.empty')}</p>}
          </Sect>
          <p className="muted">{t('ui.import.stats', { cells: fmt.int(res.stats.cellsRead), facts: fmt.int(res.stats.factsCreated), dup: fmt.int(res.stats.duplicatesFlagged), err: fmt.int(res.stats.errorCells), ms: fmt.int(res.stats.ms) })}</p>
          <div className="row"><button type="button" className="btn btn-accent" disabled={!res.dataset} onClick={() => void use()}>{t('ui.import.use')}</button>{!res.dataset ? <span className="note">{t('ui.import.noDataset')}</span> : null}</div>
        </>
      ) : null}
      <Sect title={t('ui.import.templates')}>
        <p className="hint">{t('ui.import.templatesHint')}</p>
        <ul className="tpl">{TEMPLATES.map((n) => <li key={n}><a className="btn btn-s" href={`/templates/${n}.csv`} download><Download size={13} aria-hidden="true" /><span className="mono">{n}.csv</span></a></li>)}</ul>
      </Sect>
      <Sect title={t('ui.import.history')}>
        {ctx.app.history.length ? <DataTable spec={{ cols: [t('ui.import.when'), t('ui.import.file'), t('ui.export.meta.cutoff'), t('ui.import.facts')], rows: ctx.app.history.map((h) => [fmt.dateTime(h.at), h.files.join(', '), h.cutoff ? fmt.month(h.cutoff) : null, fmt.int(h.facts)]) }} /> : <p className="muted">{t('ui.import.noHistory')}</p>}
        <div className="row">
          <button type="button" className="btn btn-s" onClick={() => { if (confirm) { void actions.clearLocal(); setConfirm(false); setRes(null); } else setConfirm(true); }}><Trash2 size={13} aria-hidden="true" /><span>{t(confirm ? 'ui.import.clearConfirm' : 'ui.import.clear')}</span></button>
          {confirm ? <button type="button" className="btn btn-s" onClick={() => setConfirm(false)}>{t('ui.cancel')}</button> : null}
        </div>
      </Sect>
    </Drawer>
  );
}

function Customise({ ctx }: { ctx: SheetCtx }) {
  const { t, lang } = useI18n();
  const defaults = ctx.engine.defaultCards(ctx.ds);
  const cur = Array.from({ length: 8 }, (_, i) => ctx.model?.cards[i]?.id ?? ctx.app.prefs.cards[i] ?? defaults[i] ?? KPI_IDS[i]);
  return (
    <Drawer t={t} title={t('ui.menu.customise')} sub={t('ui.custom.sub')} onClose={actions.close}>
      <ol className="slots">
        {cur.map((id, i) => (
          <li key={i}>
            <label className="fld fld-col"><span className="fld-l">{t('ui.custom.slot', { n: i + 1 })}</span>
              <select value={id} onChange={(e) => actions.setCards(cur.map((x, j) => (j === i ? e.target.value : x)))}>{KPI_IDS.map((x) => <option key={x} value={x}>{x} · {kpiText(lang, t, x, 'name')}</option>)}</select>
            </label>
          </li>
        ))}
      </ol>
      <div className="row"><button type="button" className="btn btn-s" onClick={actions.resetCards}>{t('ui.custom.reset')}</button><span className="muted">{t(ctx.app.cardsCustom ? 'ui.custom.custom' : 'ui.custom.default')}</span></div>
    </Drawer>
  );
}

export function Drawers({ ctx }: { ctx: SheetCtx }) {
  const d = ctx.app.drawer;
  if (!d) return null;
  switch (d.kind) {
    case 'kpi': return <KpiSheet key={d.id} ctx={ctx} id={d.id} />;
    case 'catalog': return <Catalogue ctx={ctx} />;
    case 'method': return <Methodology ctx={ctx} />;
    case 'project': return <ProjectDrawer key={d.id} ctx={ctx} id={d.id} />;
    case 'signal': return <SignalDrawer key={d.id} ctx={ctx} id={d.id} />;
    case 'risk': return <RiskDrawer ctx={ctx} risk={d.risk} projectId={d.projectId} />;
    case 'recon': return <Recon ctx={ctx} />;
    case 'import': return <ImportDrawer ctx={ctx} />;
    case 'custom': return <Customise ctx={ctx} />;
    default: return null;
  }
}
