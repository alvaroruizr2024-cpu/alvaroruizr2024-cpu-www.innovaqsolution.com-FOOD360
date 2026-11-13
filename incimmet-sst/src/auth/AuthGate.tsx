import { Suspense, lazy, type ReactNode } from 'react';
import { isAuthed, useAuth } from './auth';
const Login = lazy(() => import('./Login'));
/** Nada de la lámina se monta sin sesión válida. */
export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  if (isAuthed(auth)) return <>{children}</>;
  return <Suspense fallback={<div className="boot" role="status">…</div>}><Login /></Suspense>;
}
