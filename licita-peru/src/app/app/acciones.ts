"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db/client";
import { ErrorPermiso, requerirPermiso, requerirSesion } from "@/lib/auth";
import { auditar } from "@/lib/audit";
import { CATEGORIA_IDS, TIPOS_PROCESO, VERSIONES_DOC } from "@/lib/catalogos";
import { crearInvitacion, ErrorCuenta, ROLES, type Rol } from "@/lib/cuentas";
import {
  actualizarDocumento,
  actualizarEmpresa,
  actualizarProceso,
  crearEmpresa,
  crearProceso,
  eliminarDocumento,
  eliminarRegistros,
  entregable,
  guardarRegistros,
  NoEncontrado,
  proceso,
  type Ambito,
} from "@/lib/datos";
import { cambiarEstado } from "@/lib/estados";
import { localAUtc } from "@/lib/fechas";
import { ErrorLimite, verificarLimite } from "@/lib/planes";
import { tablaDef } from "@/lib/registros";
import type { EstadoAccion } from "@/components/formulario";

const txt = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function fallo(e: unknown): EstadoAccion {
  if (e instanceof ErrorPermiso || e instanceof ErrorLimite || e instanceof NoEncontrado || e instanceof ErrorCuenta) return { error: e.message };
  // redirect() y notFound() se propagan como excepciones propias de Next.
  if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) throw e;
  console.error("[acción]", e);
  return { error: e instanceof Error ? e.message : "No se pudo completar la operación." };
}

async function ambitoDe(orgId: string, processId: string): Promise<Ambito & { processId: string }> {
  const { p } = await proceso(orgId, processId);
  return { orgId, companyId: p.companyId, processId: p.id };
}

/* ───────────── Empresas ───────────── */

export async function crearEmpresaAccion(_p: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  let id: string;
  try {
    const s = await requerirPermiso("editar");
    if (!txt(fd, "razonSocial")) return { error: "La razón social es obligatoria." };
    const ruc = txt(fd, "ruc");
    if (ruc && !/^\d{11}$/.test(ruc)) return { error: "El RUC debe tener 11 dígitos (o déjelo vacío por ahora)." };
    await verificarLimite(s.org.id, "empresas");
    const c = await crearEmpresa(s.org.id, { razonSocial: txt(fd, "razonSocial"), ruc, modalidad: txt(fd, "modalidad") || "individual", sector: txt(fd, "sector"), representante: txt(fd, "representante") });
    await auditar(s.org.id, { tipo: "usuario", id: s.user.id }, "empresa.crear", { entidad: "empresa", entidadId: c.id, detalle: { razonSocial: c.razonSocial } });
    id = c.id;
  } catch (e) {
    return fallo(e);
  }
  redirect(`/app/empresas/${id}`);
}

export async function actualizarEmpresaAccion(_p: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  try {
    const s = await requerirPermiso("editar");
    const id = txt(fd, "id");
    if (!txt(fd, "razonSocial")) return { error: "La razón social es obligatoria." };
    const ruc = txt(fd, "ruc");
    if (ruc && !/^\d{11}$/.test(ruc)) return { error: "El RUC debe tener 11 dígitos." };
    await actualizarEmpresa(s.org.id, id, { razonSocial: txt(fd, "razonSocial"), ruc, modalidad: txt(fd, "modalidad") || "individual", sector: txt(fd, "sector"), representante: txt(fd, "representante") });
    await auditar(s.org.id, { tipo: "usuario", id: s.user.id }, "empresa.actualizar", { entidad: "empresa", entidadId: id });
    revalidatePath(`/app/empresas/${id}`);
    return { ok: "Datos guardados." };
  } catch (e) {
    return fallo(e);
  }
}

/* ───────────── Procesos ───────────── */

function datosProceso(fd: FormData) {
  const zona = txt(fd, "zonaHoraria") || "America/Lima";
  try {
    new Intl.DateTimeFormat("es", { timeZone: zona });
  } catch {
    throw new ErrorCuenta(`Zona horaria no válida: ${zona}`);
  }
  const tipo = txt(fd, "tipo") || "por_determinar";
  if (!TIPOS_PROCESO.some((t) => t.id === tipo)) throw new ErrorCuenta("Tipo de proceso no válido.");
  const limite = txt(fd, "fechaLimite");
  return {
    nombre: txt(fd, "nombre"),
    cliente: txt(fd, "cliente"),
    codigo: txt(fd, "codigo"),
    tipo,
    sector: txt(fd, "sector"),
    objeto: txt(fd, "objeto"),
    lugar: txt(fd, "lugar"),
    etapa: txt(fd, "etapa"),
    portal: txt(fd, "portal"),
    zonaHoraria: zona,
    fechaLimite: limite ? localAUtc(limite.replace("T", " "), zona) : null,
  };
}

export async function crearProcesoAccion(_p: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  let id: string;
  try {
    const s = await requerirPermiso("editar");
    const d = datosProceso(fd);
    if (!d.nombre) return { error: "Dé un nombre al proceso (puede cambiarlo luego)." };
    if (!txt(fd, "companyId")) return { error: "Elija la empresa que participa." };
    await verificarLimite(s.org.id, "procesosActivos");
    const p = await crearProceso(s.org.id, txt(fd, "companyId"), d);
    await auditar(s.org.id, { tipo: "usuario", id: s.user.id }, "proceso.crear", { processId: p.id, entidad: "proceso", entidadId: p.id, detalle: { nombre: p.nombre } });
    id = p.id;
  } catch (e) {
    return fallo(e);
  }
  redirect(`/app/procesos/${id}?tab=documentos`);
}

export async function actualizarProcesoAccion(_p: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  try {
    const s = await requerirPermiso("editar");
    const id = txt(fd, "id");
    const d = datosProceso(fd);
    if (!d.nombre) return { error: "El nombre no puede quedar vacío." };
    await actualizarProceso(s.org.id, id, d);
    await auditar(s.org.id, { tipo: "usuario", id: s.user.id }, "proceso.actualizar", { processId: id, entidad: "proceso", entidadId: id });
    revalidatePath(`/app/procesos/${id}`);
    return { ok: "Ficha guardada." };
  } catch (e) {
    return fallo(e);
  }
}

export async function cambiarEstadoAccion(_p: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  try {
    const s = await requerirPermiso("aprobar");
    const a = await ambitoDe(s.org.id, txt(fd, "processId"));
    const firmas = txt(fd, "pendientesDeFirma")
      .split(/[,\s]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    const r = await cambiarEstado(a, txt(fd, "estado"), { tipo: "usuario", id: s.user.id }, { fundamento: txt(fd, "fundamento"), pendientesDeFirma: firmas });
    revalidatePath(`/app/procesos/${a.processId}`);
    if (!r.ok) return { error: `No se puede cambiar el estado:\n• ${r.motivos.join("\n• ")}` };
    return { ok: `Estado actualizado.${r.avisos.length ? ` ${r.avisos.join(" ")}` : ""}` };
  } catch (e) {
    return fallo(e);
  }
}

/* ───────────── Matrices ───────────── */

export async function guardarFilaAccion(_p: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  try {
    const s = await requerirPermiso("editar");
    const tabla = txt(fd, "tabla");
    const def = tablaDef(tabla);
    const processId = txt(fd, "processId") || null;
    const a: Ambito = processId ? await ambitoDe(s.org.id, processId) : { orgId: s.org.id, companyId: txt(fd, "companyId"), processId: null };
    const fila: Record<string, unknown> = {};
    if (txt(fd, "codigo")) fila.codigo = txt(fd, "codigo");
    for (const c of def.campos) {
      if (c.tipo === "bool") fila[c.k] = fd.get(`c_${c.k}`) === "on";
      else if (fd.has(`c_${c.k}`)) fila[c.k] = txt(fd, `c_${c.k}`);
    }
    const ambito = txt(fd, "ambito") === "empresa" ? "empresa" : txt(fd, "ambito") === "proceso" ? "proceso" : undefined;
    const r = await guardarRegistros(a, tabla, [fila], { tipo: "usuario", id: s.user.id }, ambito);
    if (r.errores.length) return { error: r.errores[0].errores.join("\n") };
    revalidatePath(processId ? `/app/procesos/${processId}` : `/app/empresas/${a.companyId}`);
    return { ok: r.creados.length ? `Fila ${r.creados[0]} creada.` : "Cambios guardados." };
  } catch (e) {
    return fallo(e);
  }
}

export async function eliminarFilaAccion(fd: FormData) {
  const s = await requerirPermiso("editar");
  const processId = txt(fd, "processId") || null;
  const a: Ambito = processId ? await ambitoDe(s.org.id, processId) : { orgId: s.org.id, companyId: txt(fd, "companyId"), processId: null };
  await eliminarRegistros(a, txt(fd, "tabla"), [txt(fd, "codigo")], { tipo: "usuario", id: s.user.id });
  revalidatePath(processId ? `/app/procesos/${processId}` : `/app/empresas/${a.companyId}`);
}

export async function responderPreguntaAccion(_p: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  try {
    const s = await requerirPermiso("editar");
    const a = await ambitoDe(s.org.id, txt(fd, "processId"));
    const descartar = fd.get("descartar") === "1";
    const respuesta = txt(fd, "respuesta");
    if (!descartar && !respuesta) return { error: "Escriba la respuesta, o descarte la pregunta si no corresponde." };
    const r = await guardarRegistros(a, "preguntas", [{ codigo: txt(fd, "codigo"), respuesta, estado: descartar ? "descartada" : "respondida" }], { tipo: "usuario", id: s.user.id });
    if (r.errores.length) return { error: r.errores[0].errores.join("\n") };
    revalidatePath(`/app/procesos/${a.processId}`);
    return { ok: descartar ? "Pregunta descartada." : "Respuesta guardada. El agente la verá en su próxima revisión." };
  } catch (e) {
    return fallo(e);
  }
}

/* ───────────── Aprobaciones y entregables ───────────── */

export async function resolverAprobacionAccion(_p: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  try {
    const s = await requerirPermiso("aprobar");
    const decision = txt(fd, "decision");
    if (!["aprobada", "rechazada"].includes(decision)) return { error: "Decisión no válida." };
    const comentario = txt(fd, "comentario");
    if (decision === "rechazada" && !comentario) return { error: "Indique el motivo del rechazo." };
    const [a] = await db
      .update(schema.aprobaciones)
      .set({ estado: decision, comentario, resueltaPor: s.user.id, resueltaAt: new Date() })
      .where(and(eq(schema.aprobaciones.orgId, s.org.id), eq(schema.aprobaciones.id, txt(fd, "id")), eq(schema.aprobaciones.estado, "pendiente")))
      .returning();
    if (!a) return { error: "La solicitud no existe o ya fue resuelta." };
    await auditar(s.org.id, { tipo: "usuario", id: s.user.id }, `aprobacion.${decision}`, { processId: a.processId, entidad: "aprobacion", entidadId: a.id, detalle: { accion: a.accion, version: a.versionRef, destinatario: a.destinatario, comentario } });
    revalidatePath(`/app/procesos/${a.processId}`);
    return { ok: decision === "aprobada" ? "Aprobada. La plataforma no ejecuta la acción: hágala usted y registre la constancia." : "Rechazada." };
  } catch (e) {
    return fallo(e);
  }
}

export async function estadoEntregableAccion(_p: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  try {
    const estado = txt(fd, "estado");
    if (!["borrador", "revisado", "aprobado"].includes(estado)) return { error: "Estado no válido." };
    const s = await requerirPermiso(estado === "aprobado" ? "aprobar" : "editar");
    const e = await entregable(s.org.id, txt(fd, "id"));
    if (estado === "aprobado") {
      const pendientes = (e.contenidoMd.match(/\[PENDIENTE/gi) ?? []).length;
      if (pendientes) return { error: `El documento tiene ${pendientes} marca(s) [PENDIENTE…]. Resuélvalas antes de aprobarlo: un campo sin resolver bloquea la liberación.` };
    }
    await db.update(schema.entregables).set({ estado }).where(and(eq(schema.entregables.orgId, s.org.id), eq(schema.entregables.id, e.id)));
    await auditar(s.org.id, { tipo: "usuario", id: s.user.id }, `entregable.${estado}`, { processId: e.processId, entidad: "entregable", entidadId: e.id, detalle: { titulo: e.titulo, version: e.version } });
    revalidatePath(`/app/procesos/${e.processId}`);
    return { ok: `Marcado como ${estado}.` };
  } catch (e) {
    return fallo(e);
  }
}

/* ───────────── Documentos ───────────── */

export async function clasificarDocumentoAccion(_p: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  try {
    const s = await requerirPermiso("editar");
    const categoria = txt(fd, "categoria");
    const version = txt(fd, "version");
    if (!CATEGORIA_IDS.includes(categoria) || !(VERSIONES_DOC as readonly string[]).includes(version)) return { error: "Clasificación no válida." };
    const d = await actualizarDocumento(s.org.id, txt(fd, "id"), { categoria, version, descripcion: txt(fd, "descripcion").slice(0, 500) });
    await auditar(s.org.id, { tipo: "usuario", id: s.user.id }, "documento.clasificar", { processId: d.processId, entidad: "documento", entidadId: d.id, detalle: { categoria, version } });
    revalidatePath(d.processId ? `/app/procesos/${d.processId}` : `/app/empresas/${d.companyId}`);
    return { ok: "Clasificación guardada." };
  } catch (e) {
    return fallo(e);
  }
}

export async function eliminarDocumentoAccion(fd: FormData) {
  const s = await requerirPermiso("editar");
  const d = await eliminarDocumento(s.org.id, txt(fd, "id"));
  await auditar(s.org.id, { tipo: "usuario", id: s.user.id }, "documento.eliminar", { processId: d.processId, entidad: "documento", entidadId: d.id, detalle: { nombre: d.nombre, sha256: d.sha256 } });
  revalidatePath(d.processId ? `/app/procesos/${d.processId}` : `/app/empresas/${d.companyId}`);
}

/* ───────────── Equipo ───────────── */

export async function invitarAccion(_p: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  try {
    const s = await requerirPermiso("administrar");
    await verificarLimite(s.org.id, "miembros");
    const token = await crearInvitacion(s.org.id, txt(fd, "email"), txt(fd, "rol") as Rol, s.user.id);
    await auditar(s.org.id, { tipo: "usuario", id: s.user.id }, "equipo.invitar", { detalle: { email: txt(fd, "email").toLowerCase(), rol: txt(fd, "rol") } });
    revalidatePath("/app/equipo");
    return { ok: "Invitación creada. Copie el enlace y envíelo por un canal seguro; vence en 7 días.", campos: { enlace: `/invitacion/${token}` } };
  } catch (e) {
    return fallo(e);
  }
}

export async function cambiarRolAccion(fd: FormData) {
  const s = await requerirPermiso("administrar");
  const rol = txt(fd, "rol") as Rol;
  const userId = txt(fd, "userId");
  if (!ROLES.includes(rol) || rol === "propietario" || userId === s.user.id) return;
  await db
    .update(schema.memberships)
    .set({ rol })
    .where(and(eq(schema.memberships.orgId, s.org.id), eq(schema.memberships.userId, userId)));
  await auditar(s.org.id, { tipo: "usuario", id: s.user.id }, "equipo.rol", { detalle: { userId, rol } });
  revalidatePath("/app/equipo");
}

export async function quitarMiembroAccion(fd: FormData) {
  const s = await requerirPermiso("administrar");
  const userId = txt(fd, "userId");
  if (userId === s.user.id) return;
  const [m] = await db
    .select()
    .from(schema.memberships)
    .where(and(eq(schema.memberships.orgId, s.org.id), eq(schema.memberships.userId, userId)));
  if (!m || m.rol === "propietario") return;
  await db.delete(schema.memberships).where(and(eq(schema.memberships.orgId, s.org.id), eq(schema.memberships.userId, userId)));
  await db.delete(schema.sessions).where(and(eq(schema.sessions.userId, userId), eq(schema.sessions.orgId, s.org.id)));
  await auditar(s.org.id, { tipo: "usuario", id: s.user.id }, "equipo.quitar", { detalle: { userId } });
  revalidatePath("/app/equipo");
}

export async function anularInvitacionAccion(fd: FormData) {
  const s = await requerirPermiso("administrar");
  await db.delete(schema.invitations).where(and(eq(schema.invitations.orgId, s.org.id), eq(schema.invitations.id, txt(fd, "id"))));
  revalidatePath("/app/equipo");
}

/* ───────────── Administración de la plataforma ───────────── */

async function adminPlataforma() {
  const s = await requerirSesion();
  if (!s.user.esAdminPlataforma) throw new ErrorPermiso("Solo el operador de la plataforma puede hacer esto.");
  return s;
}

export async function adminOrganizacionAccion(fd: FormData) {
  const s = await adminPlataforma();
  const orgId = txt(fd, "orgId");
  const planId = txt(fd, "planId");
  const estado = txt(fd, "estado");
  const cambios: { planId?: string; estado?: string } = {};
  if (planId) {
    const [p] = await db.select().from(schema.plans).where(eq(schema.plans.id, planId));
    if (p) cambios.planId = planId;
  }
  if (["activa", "suspendida"].includes(estado)) cambios.estado = estado;
  if (!Object.keys(cambios).length) return;
  await db.update(schema.organizations).set(cambios).where(eq(schema.organizations.id, orgId));
  await auditar(orgId, { tipo: "usuario", id: s.user.id }, "plataforma.organizacion", { detalle: cambios });
  revalidatePath("/app/admin");
}

export async function adminPlanAccion(_p: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  try {
    await adminPlataforma();
    const id = txt(fd, "id")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");
    if (!id || !txt(fd, "nombre")) return { error: "Identificador y nombre son obligatorios." };
    const n = (k: string) => (txt(fd, k) === "" ? null : Number(txt(fd, k)));
    const limites = { empresas: n("empresas"), procesosActivos: n("procesosActivos"), miembros: n("miembros"), almacenamientoMb: n("almacenamientoMb"), presupuestoIaUsdMes: n("presupuestoIaUsdMes") };
    if (Object.values(limites).some((v) => v !== null && (!Number.isFinite(v) || v < 0))) return { error: "Los límites deben ser números positivos, o vacíos para «sin límite»." };
    const valores = { nombre: txt(fd, "nombre"), descripcion: txt(fd, "descripcion"), precioEtiqueta: txt(fd, "precioEtiqueta") || "Por definir", limites, publico: fd.get("publico") === "on", orden: Number(txt(fd, "orden") || 0) };
    await db
      .insert(schema.plans)
      .values({ id, ...valores })
      .onConflictDoUpdate({ target: schema.plans.id, set: valores });
    revalidatePath("/app/admin");
    revalidatePath("/");
    return { ok: "Plan guardado." };
  } catch (e) {
    return fallo(e);
  }
}
