"use server";

import { redirect } from "next/navigation";
import { asegurarDb } from "@/db/client";
import { fijarCookieSesion, salir, tokenActual, obtenerSesion } from "@/lib/auth";
import { aceptarInvitacion, cambiarOrganizacion, ErrorCuenta, registrar, validarCredenciales } from "@/lib/cuentas";
import { auditar } from "@/lib/audit";
import { env } from "@/lib/env";
import type { EstadoAccion } from "@/components/formulario";

const txt = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function iniciarSesion(_p: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  await asegurarDb();
  try {
    const user = await validarCredenciales(txt(fd, "email"), String(fd.get("password") ?? ""));
    await fijarCookieSesion(user.id);
  } catch (e) {
    if (e instanceof ErrorCuenta) return { error: e.message };
    throw e;
  }
  redirect("/app");
}

export async function registrarse(_p: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  await asegurarDb();
  if (!env.registroAbierto) return { error: "El registro está cerrado. Solicite una invitación al administrador." };
  if (fd.get("acepta") !== "on") return { error: "Debe aceptar las condiciones de uso para crear la cuenta." };
  try {
    const { user, org } = await registrar({ email: txt(fd, "email"), nombre: txt(fd, "nombre"), password: String(fd.get("password") ?? ""), organizacion: txt(fd, "organizacion") });
    await fijarCookieSesion(user.id, org.id);
    await auditar(org.id, { tipo: "usuario", id: user.id }, "organizacion.crear", { entidad: "organizacion", entidadId: org.id });
  } catch (e) {
    if (e instanceof ErrorCuenta) return { error: e.message };
    throw e;
  }
  redirect("/app");
}

export async function aceptarInvitacionAccion(_p: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  await asegurarDb();
  try {
    const { user, orgId } = await aceptarInvitacion(txt(fd, "token"), { nombre: txt(fd, "nombre"), password: String(fd.get("password") ?? "") });
    await fijarCookieSesion(user.id, orgId);
    await auditar(orgId, { tipo: "usuario", id: user.id }, "equipo.invitacion.aceptar");
  } catch (e) {
    if (e instanceof ErrorCuenta) return { error: e.message };
    throw e;
  }
  redirect("/app");
}

export async function cerrarSesionAccion() {
  await salir();
  redirect("/");
}

export async function cambiarOrganizacionAccion(fd: FormData) {
  const s = await obtenerSesion();
  const token = await tokenActual();
  if (s && token) await cambiarOrganizacion(token, s.user.id, txt(fd, "orgId"));
  redirect("/app");
}
