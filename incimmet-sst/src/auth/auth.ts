/**
 * Acceso a la lámina. Las credenciales se inyectan al compilar desde private/auth.config.json (git-ignorado):
 * solo viajan huellas SHA-256 de los correos y derivaciones PBKDF2 de la contraseña, nunca el texto en claro.
 * Es una puerta del lado del cliente: la protección real es el control de acceso del alojamiento (página privada).
 */
import { useSyncExternalStore } from 'react';

interface AuthUser { id: string; hash: string }
interface AuthConfig { v: 1; iterations: number; salt: string; users: AuthUser[] }
declare const __INCIMMET_AUTH__: AuthConfig | null;
const CFG: AuthConfig | null = typeof __INCIMMET_AUTH__ === 'undefined' ? null : __INCIMMET_AUTH__;

const KEY = 'incimmet.auth.session', LOCK = 'incimmet.auth.lock';
const HOURS_SESSION = 12, DAYS_REMEMBER = 7, MAX_TRIES = 5, LOCK_BASE_S = 60;

export interface Session { email: string; exp: number }
export interface AuthState { configured: boolean; bypass: boolean; session: Session | null }
export type LoginResult = { ok: true } | { ok: false; reason: 'invalid' | 'locked' | 'unconfigured'; retryInS?: number; left?: number };

const safe = <T,>(fn: () => T, fb: T): T => { try { return fn(); } catch { return fb; } };
const bypass = import.meta.env.DEV && new URLSearchParams(location.search).get('auth') === 'off';

function readSession(): Session | null {
  for (const st of [sessionStorage, localStorage]) {
    const s = safe(() => JSON.parse(st.getItem(KEY) || 'null') as Session | null, null);
    if (s && typeof s.email === 'string' && s.exp > Date.now()) return s;
    if (s) safe(() => st.removeItem(KEY), undefined);
  }
  return null;
}
let state: AuthState = { configured: !!CFG && CFG.users.length > 0, bypass, session: readSession() };
const subs = new Set<() => void>();
const set = (p: Partial<AuthState>) => { state = { ...state, ...p }; subs.forEach((f) => f()); };
export const useAuth = (): AuthState => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => state, () => state);
export const isAuthed = (s: AuthState) => s.bypass || !!s.session;

interface Lock { fails: number; until: number; level: number }
const readLock = (): Lock => safe(() => ({ fails: 0, until: 0, level: 0, ...JSON.parse(localStorage.getItem(LOCK) || '{}') }), { fails: 0, until: 0, level: 0 });
const writeLock = (l: Lock) => safe(() => localStorage.setItem(LOCK, JSON.stringify(l)), undefined);
export function lockRemainingS(): number { return Math.max(0, Math.ceil((readLock().until - Date.now()) / 1000)); }

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const b64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)));
async function derive(password: string, salt: string, email: string, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(`${salt}:${email}`), iterations }, key, 256));
}
function same(a: string, b: string): boolean { let d = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return d === 0; }

export async function login(emailRaw: string, password: string, remember: boolean): Promise<LoginResult> {
  if (!CFG || !CFG.users.length) return { ok: false, reason: 'unconfigured' };
  const wait = lockRemainingS();
  if (wait > 0) return { ok: false, reason: 'locked', retryInS: wait };
  const email = emailRaw.trim().toLowerCase();
  const id = hex(await crypto.subtle.digest('SHA-256', enc.encode(`${CFG.salt}:${email}`)));
  const user = CFG.users.find((u) => u.id === id);
  // Se deriva siempre (también con correo desconocido) para no revelar por tiempo qué correos existen.
  const got = await derive(password, CFG.salt, email, CFG.iterations);
  if (user && same(got, user.hash)) {
    writeLock({ fails: 0, until: 0, level: 0 });
    const s: Session = { email, exp: Date.now() + (remember ? DAYS_REMEMBER * 864e5 : HOURS_SESSION * 36e5) };
    safe(() => (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(s)), undefined);
    set({ session: s });
    return { ok: true };
  }
  const l = readLock(); l.fails += 1;
  if (l.fails >= MAX_TRIES) { l.level += 1; l.until = Date.now() + LOCK_BASE_S * 2 ** (l.level - 1) * 1000; l.fails = 0; writeLock(l); return { ok: false, reason: 'locked', retryInS: lockRemainingS() }; }
  writeLock(l);
  return { ok: false, reason: 'invalid', left: MAX_TRIES - l.fails };
}
export function logout(): void {
  safe(() => sessionStorage.removeItem(KEY), undefined); safe(() => localStorage.removeItem(KEY), undefined);
  set({ session: null });
}
// La sesión caduca sola aunque la pestaña siga abierta.
setInterval(() => { if (state.session && state.session.exp <= Date.now()) logout(); }, 60_000);
