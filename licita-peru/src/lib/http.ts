// Utilidades para las rutas API.
import { NextResponse } from "next/server";
import { obtenerSesion } from "./auth";
import { puede, type Sesion } from "./cuentas";
import { NoEncontrado } from "./datos";
import { ErrorLimite } from "./planes";

export class ErrorHttp extends Error {
  constructor(
    public estado: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

export async function sesionApi(accion?: "editar" | "aprobar" | "administrar"): Promise<Sesion> {
  const s = await obtenerSesion();
  if (!s) throw new ErrorHttp(401, "Sesión no válida. Vuelva a ingresar.");
  if (s.org.estado !== "activa") throw new ErrorHttp(403, "La organización está suspendida.");
  if (accion && !puede(s.rol, accion)) throw new ErrorHttp(403, "Su rol no permite esta acción.");
  return s;
}

/** Las peticiones que modifican datos deben venir de la propia aplicación. */
export function mismoOrigen(req: Request) {
  const origen = req.headers.get("origin");
  if (!origen) return; // navegadores lo envían siempre en POST; clientes sin navegador no llevan cookie de sesión de terceros
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (new URL(origen).host !== host) throw new ErrorHttp(403, "Origen no permitido.");
}

export function errorJson(e: unknown) {
  if (e instanceof ErrorHttp) return NextResponse.json({ error: e.message }, { status: e.estado });
  if (e instanceof NoEncontrado) return NextResponse.json({ error: e.message }, { status: 404 });
  if (e instanceof ErrorLimite) return NextResponse.json({ error: e.message }, { status: 402 });
  console.error("[api]", e);
  return NextResponse.json({ error: "Error interno. Intente de nuevo." }, { status: 500 });
}

/** Cabecera Content-Disposition segura para nombres con tildes y espacios. */
export function disposicion(nombre: string, enLinea = false) {
  const ascii = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${enLinea ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nombre)}`;
}
