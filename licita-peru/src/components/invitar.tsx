"use client";

import { useActionState } from "react";
import { invitarAccion } from "@/app/app/acciones";
import { ROL_ETIQUETA, ROLES } from "@/lib/roles";
import { Copiar } from "./nav";
import { Enviar } from "./formulario";
import { Aviso, Campo, Entrada, Selector, Tarjeta } from "./ui";

export function Invitar() {
  const [estado, enviar] = useActionState(invitarAccion, null);
  return (
    <Tarjeta className="h-fit p-5">
      <h3 className="text-[15px] font-bold">Invitar a una persona</h3>
      <p className="mt-1 text-[12.5px] text-tinta-3">Se genera un enlace personal que vence en 7 días. Envíelo usted por un canal seguro.</p>
      <form action={enviar} className="mt-4 space-y-3">
        <Campo etiqueta="Correo">
          <Entrada name="email" type="email" required />
        </Campo>
        <Campo etiqueta="Rol">
          <Selector name="rol" defaultValue="editor">
            {ROLES.filter((r) => r !== "propietario").map((r) => (
              <option key={r} value={r}>
                {ROL_ETIQUETA[r]}
              </option>
            ))}
          </Selector>
        </Campo>
        <Enviar className="w-full" pendiente="Creando…">
          Crear invitación
        </Enviar>
      </form>
      {estado?.error ? (
        <Aviso tono="mal" className="mt-3">
          <span role="alert">{estado.error}</span>
        </Aviso>
      ) : null}
      {estado?.ok ? (
        <Aviso tono="ok" className="mt-3">
          <p role="status">{estado.ok}</p>
          {estado.campos?.enlace ? (
            <div className="mt-2">
              <Copiar texto={estado.campos.enlace} etiqueta="Copiar enlace de invitación" />
            </div>
          ) : null}
        </Aviso>
      ) : null}
    </Tarjeta>
  );
}
