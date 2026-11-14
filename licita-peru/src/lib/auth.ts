// Pegamento entre las cuentas y Next (cookies, redirecciones).
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { asegurarDb } from "@/db/client";
import { cerrarSesion, crearSesion, puede, sesionDesdeToken, type Sesion } from "./cuentas";

const COOKIE = "lp_sesion";

export async function fijarCookieSesion(userId: string, orgId?: string | null) {
  const { token, expiresAt } = await crearSesion(userId, orgId);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function tokenActual(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE)?.value;
}

export async function salir() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await cerrarSesion(token);
  jar.delete(COOKIE);
}

/** Sesión del request actual (memorizada por render). */
export const obtenerSesion = cache(async (): Promise<Sesion | null> => {
  await asegurarDb();
  return sesionDesdeToken(await tokenActual());
});

export async function requerirSesion(): Promise<Sesion> {
  const s = await obtenerSesion();
  if (!s) redirect("/login");
  if (s.org.estado !== "activa" && !s.user.esAdminPlataforma) redirect("/suspendida");
  return s;
}

export class ErrorPermiso extends Error {}

export async function requerirPermiso(accion: "editar" | "aprobar" | "administrar"): Promise<Sesion> {
  const s = await requerirSesion();
  if (!puede(s.rol, accion)) throw new ErrorPermiso("Tu rol no permite esta acción.");
  return s;
}
