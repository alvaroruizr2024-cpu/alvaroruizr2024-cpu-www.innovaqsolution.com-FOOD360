import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { geoGraticule10, geoMercator, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { ArrowRight, Eye, EyeOff, HeartPulse, LoaderCircle, Lock, Mail, Moon, Radar, ShieldCheck, Sun, TriangleAlert } from 'lucide-react';
import { LANGS } from '../domain/types';
import { actions, useApp, useI18n } from '../state/store';
import { lockRemainingS, login, useAuth } from './auth';
import '../styles/login.css';

type Geo = FeatureCollection<Geometry, { code?: string; name?: string }>;
const load = (f: string) => fetch(`${import.meta.env.BASE_URL}geo/${f}`).then((r) => (r.ok ? (r.json() as Promise<Geo>) : null)).catch(() => null);

/** Las tres operaciones dibujadas con los límites reales (Natural Earth): un único trazo de entrada, sin movimiento permanente. */
function RegionArt({ label }: { label: string }) {
  const [geo, setGeo] = useState<{ focus: Geo; ctx: Geo | null } | null>(null);
  useEffect(() => { let on = true; Promise.all([load('focus-50m.json'), load('context-110m.json')]).then(([focus, ctx]) => { if (on && focus) setGeo({ focus, ctx }); }); return () => { on = false; }; }, []);
  const W = 640, H = 620;
  const view = useMemo(() => {
    if (!geo) return null;
    const proj = geoMercator().fitExtent([[40, 30], [W - 40, H - 30]], geo.focus);
    const path = geoPath(proj);
    return {
      grat: path(geoGraticule10()) ?? '',
      ctx: (geo.ctx?.features ?? []).map((f) => path(f) ?? ''),
      focus: geo.focus.features.map((f: Feature<Geometry, { code?: string; name?: string }>) => ({ code: f.properties.code ?? '', d: path(f) ?? '', c: path.centroid(f) })),
    };
  }, [geo]);
  return (
    <svg className="lg-art" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="lg-glow" cx="50%" cy="45%" r="60%"><stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#lg-glow)" />
      {view ? (
        <>
          <path className="lg-grat" d={view.grat} />
          {view.ctx.map((d, i) => <path key={i} className="lg-ctx" d={d} />)}
          {view.focus.map((f, i) => (
            <g key={f.code} className="lg-c" style={{ animationDelay: `${i * 180}ms` }}>
              <path className="lg-halo" d={f.d} />
              <path className="lg-fill" d={f.d} />
              <path className="lg-line" d={f.d} pathLength={1} />
              <g className="lg-pin" transform={`translate(${f.c[0]},${f.c[1]})`}><circle r="5" /><text x="10" y="4">{f.code}</text></g>
            </g>
          ))}
        </>
      ) : null}
    </svg>
  );
}

export default function Login() {
  const { t } = useI18n();
  const app = useApp();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [caps, setCaps] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lockS, setLockS] = useState(lockRemainingS());
  const emailRef = useRef<HTMLInputElement>(null);
  const ids = { e: useId(), p: useId(), err: useId(), caps: useId() };
  useEffect(() => { document.title = `INCIMMET | ${t('auth.heading')}`; emailRef.current?.focus(); }, [t]);
  useEffect(() => {
    if (lockS <= 0) return;
    const id = window.setInterval(() => { const s = lockRemainingS(); setLockS(s); if (s <= 0) setErr(null); else setErr(t('auth.locked', { s })); }, 1000);
    return () => window.clearInterval(id);
  }, [lockS, t]);
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState?.('CapsLock') ?? false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!email.trim() || !pw) { setErr(t('auth.required')); return; }
    setBusy(true); setErr(null);
    const r = await login(email, pw, remember);
    setBusy(false);
    if (r.ok) return;
    setPw('');
    if (r.reason === 'locked') { setLockS(r.retryInS ?? 60); setErr(t('auth.locked', { s: r.retryInS ?? 60 })); }
    else if (r.reason === 'unconfigured') setErr(t('auth.unconfigured'));
    else setErr(t('auth.invalid', { n: r.left ?? 0 }));
  };
  const locked = lockS > 0, off = !auth.configured;
  const pillars = [{ i: <Radar size={18} aria-hidden="true" />, k: 1 }, { i: <ShieldCheck size={18} aria-hidden="true" />, k: 2 }, { i: <HeartPulse size={18} aria-hidden="true" />, k: 3 }];
  return (
    <div className="lg" data-theme-surface={app.theme}>
      <section className="lg-hero" aria-labelledby="lg-title">
        <div className="lg-brand"><span className="wordmark">INCIMMET</span><span className="lg-region">{t('auth.region')}</span></div>
        <h1 id="lg-title" className="lg-title">{t('ui.title')}</h1>
        <p className="lg-tag">{t('ui.tagline')}</p>
        <div className="lg-art-wrap"><RegionArt label={t('auth.mapAlt')} /></div>
        <ul className="lg-pillars">
          {pillars.map((p) => <li key={p.k}>{p.i}<div><strong>{t(`auth.pillar${p.k}`)}</strong><span>{t(`auth.pillar${p.k}d`)}</span></div></li>)}
        </ul>
      </section>
      <section className="lg-side">
        <div className="lg-tools">
          <div className="seg" role="group" aria-label={t('ui.lang.label')}>
            {LANGS.map((l) => <button key={l} type="button" className={app.lang === l ? 'on' : undefined} aria-pressed={app.lang === l} onClick={() => actions.setLang(l)}>{l.toUpperCase()}</button>)}
          </div>
          <button type="button" className="icon-btn" aria-label={t(app.theme === 'dark' ? 'ui.theme.light' : 'ui.theme.dark')} title={t(app.theme === 'dark' ? 'ui.theme.light' : 'ui.theme.dark')} onClick={() => actions.setThemePref(app.theme === 'dark' ? 'light' : 'dark')}>
            {app.theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
          </button>
        </div>
        <form className="lg-card" onSubmit={submit} noValidate aria-describedby={err ? ids.err : undefined}>
          <p className="lg-kicker"><Lock size={14} aria-hidden="true" />{t('auth.kicker')}</p>
          <h2>{t('auth.heading')}</h2>
          <p className="lg-sub">{t('auth.sub')}</p>
          <label className="lg-f" htmlFor={ids.e}>{t('auth.email')}</label>
          <div className="lg-in"><Mail size={16} aria-hidden="true" />
            <input ref={emailRef} id={ids.e} type="email" inputMode="email" autoComplete="username" spellCheck={false} value={email} disabled={busy || off} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@incimmet.com" required aria-invalid={!!err && !locked} />
          </div>
          <label className="lg-f" htmlFor={ids.p}>{t('auth.password')}</label>
          <div className="lg-in"><Lock size={16} aria-hidden="true" />
            <input id={ids.p} type={show ? 'text' : 'password'} autoComplete="current-password" value={pw} disabled={busy || off} onChange={(e) => setPw(e.target.value)} onKeyUp={onKey} onKeyDown={onKey} required aria-invalid={!!err && !locked} aria-describedby={caps ? ids.caps : undefined} />
            <button type="button" className="lg-eye" aria-label={t(show ? 'auth.hide' : 'auth.show')} title={t(show ? 'auth.hide' : 'auth.show')} aria-pressed={show} onClick={() => setShow(!show)}>{show ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}</button>
          </div>
          {caps ? <p id={ids.caps} className="lg-caps"><TriangleAlert size={13} aria-hidden="true" />{t('auth.caps')}</p> : null}
          <label className="lg-check"><input type="checkbox" checked={remember} disabled={off} onChange={(e) => setRemember(e.target.checked)} /><span>{t('auth.remember')}</span></label>
          <div className="lg-msg" role="alert" id={ids.err}>{off ? <p className="lg-err"><TriangleAlert size={15} aria-hidden="true" />{t('auth.unconfigured')}</p> : err ? <p className="lg-err"><TriangleAlert size={15} aria-hidden="true" />{err}</p> : null}</div>
          <button type="submit" className="lg-go" disabled={busy || locked || off}>
            {busy ? <><LoaderCircle size={17} className="lg-spin" aria-hidden="true" /><span>{t('auth.checking')}</span></> : <><span>{t('auth.submit')}</span><ArrowRight size={17} aria-hidden="true" /></>}
          </button>
          <p className="lg-note">{t('auth.notice')}</p>
        </form>
      </section>
    </div>
  );
}
