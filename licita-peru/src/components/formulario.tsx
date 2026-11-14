"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Aviso, claseBoton } from "./ui";

export type EstadoAccion = { error?: string; ok?: string; campos?: Record<string, string> } | null;
export type Accion = (previo: EstadoAccion, datos: FormData) => Promise<EstadoAccion>;

/** Formulario unido a una acción de servidor: muestra el error o la confirmación que devuelva. */
export function Formulario({ accion, children, className, alExito, limpiar }: { accion: Accion; children: ReactNode; className?: string; alExito?: () => void; limpiar?: boolean }) {
  const [estado, enviar] = useActionState(accion, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado?.ok) {
      if (limpiar) ref.current?.reset();
      alExito?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);
  return (
    <form ref={ref} action={enviar} className={className}>
      {children}
      {estado?.error ? (
        <Aviso tono="mal" className="mt-3" >
          <span role="alert" className="whitespace-pre-line">{estado.error}</span>
        </Aviso>
      ) : null}
      {estado?.ok ? (
        <Aviso tono="ok" className="mt-3">
          <span role="status">{estado.ok}</span>
        </Aviso>
      ) : null}
    </form>
  );
}

export function Enviar({ children, variante = "primario", tam = "m", className, pendiente = "Guardando…" }: { children: ReactNode; variante?: Parameters<typeof claseBoton>[0]; tam?: Parameters<typeof claseBoton>[1]; className?: string; pendiente?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={claseBoton(variante, tam, className)}>
      {pending ? pendiente : children}
    </button>
  );
}
