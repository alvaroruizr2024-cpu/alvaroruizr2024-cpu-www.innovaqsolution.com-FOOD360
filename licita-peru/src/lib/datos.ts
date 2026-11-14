// Acceso a datos. Regla de tenencia: TODA función recibe el orgId de la sesión y lo aplica en
// el WHERE; ningún identificador que venga del navegador o del modelo se usa sin ese filtro.
import { and, asc, desc, eq, inArray, isNull, or, sql as raw } from "drizzle-orm";
import { db, schema, sql } from "@/db/client";
import { almacen, claveDe } from "./storage";
import { sha256 } from "./cuentas";
import { extraerTexto } from "./extraccion";
import { tablaDef, validarFila } from "./registros";
import type { Actor } from "./audit";
import { auditar } from "./audit";

export class NoEncontrado extends Error {
  constructor(que = "Recurso") {
    super(`${que} no encontrado.`);
  }
}

/* ───────────── Empresas ───────────── */

export async function listarEmpresas(orgId: string) {
  return db.select().from(schema.companies).where(eq(schema.companies.orgId, orgId)).orderBy(asc(schema.companies.razonSocial));
}

export async function empresa(orgId: string, id: string) {
  const [c] = await db
    .select()
    .from(schema.companies)
    .where(and(eq(schema.companies.orgId, orgId), eq(schema.companies.id, id)));
  if (!c) throw new NoEncontrado("Empresa");
  return c;
}

export async function crearEmpresa(orgId: string, d: { razonSocial: string; ruc?: string; modalidad?: string; sector?: string; representante?: string }) {
  const [c] = await db
    .insert(schema.companies)
    .values({ orgId, razonSocial: d.razonSocial.trim(), ruc: (d.ruc ?? "").trim(), modalidad: d.modalidad ?? "individual", sector: d.sector ?? "", representante: (d.representante ?? "").trim() })
    .returning();
  return c;
}

export async function actualizarEmpresa(orgId: string, id: string, patch: Partial<{ razonSocial: string; ruc: string; modalidad: string; sector: string; representante: string; perfil: Record<string, unknown> }>) {
  const [c] = await db
    .update(schema.companies)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(schema.companies.orgId, orgId), eq(schema.companies.id, id)))
    .returning();
  if (!c) throw new NoEncontrado("Empresa");
  return c;
}

/* ───────────── Procesos ───────────── */

export async function listarProcesos(orgId: string, companyId?: string) {
  return db
    .select({ p: schema.processes, empresa: schema.companies.razonSocial })
    .from(schema.processes)
    .innerJoin(schema.companies, eq(schema.companies.id, schema.processes.companyId))
    .where(and(eq(schema.processes.orgId, orgId), companyId ? eq(schema.processes.companyId, companyId) : undefined))
    .orderBy(desc(schema.processes.updatedAt));
}

export async function proceso(orgId: string, id: string) {
  const [f] = await db
    .select({ p: schema.processes, c: schema.companies })
    .from(schema.processes)
    .innerJoin(schema.companies, eq(schema.companies.id, schema.processes.companyId))
    .where(and(eq(schema.processes.orgId, orgId), eq(schema.processes.id, id)));
  if (!f) throw new NoEncontrado("Proceso");
  return f;
}

export type DatosProceso = Partial<{
  nombre: string;
  cliente: string;
  codigo: string;
  tipo: string;
  sector: string;
  objeto: string;
  lugar: string;
  etapa: string;
  fechaLimite: Date | null;
  zonaHoraria: string;
  portal: string;
  ficha: Record<string, unknown>;
}>;

export async function crearProceso(orgId: string, companyId: string, d: DatosProceso & { nombre: string }) {
  await empresa(orgId, companyId); // confirma que la empresa es de esta organización
  const [p] = await db
    .insert(schema.processes)
    .values({ orgId, companyId, ...d, nombre: d.nombre.trim() })
    .returning();
  return p;
}

export async function actualizarProceso(orgId: string, id: string, patch: DatosProceso & { estado?: string }) {
  const [p] = await db
    .update(schema.processes)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(schema.processes.orgId, orgId), eq(schema.processes.id, id)))
    .returning();
  if (!p) throw new NoEncontrado("Proceso");
  return p;
}

/* ───────────── Documentos ───────────── */

const colsDoc = {
  id: schema.documents.id,
  nombre: schema.documents.nombre,
  categoria: schema.documents.categoria,
  version: schema.documents.version,
  descripcion: schema.documents.descripcion,
  mime: schema.documents.mime,
  tamano: schema.documents.tamano,
  sha256: schema.documents.sha256,
  paginas: schema.documents.paginas,
  textoEstado: schema.documents.textoEstado,
  origen: schema.documents.origen,
  processId: schema.documents.processId,
  companyId: schema.documents.companyId,
  createdAt: schema.documents.createdAt,
};

/**
 * Documentos visibles desde un proceso: los del proceso más el expediente corporativo de SU
 * empresa. Nunca los de otra empresa, aunque sea de la misma organización (§16 del prompt).
 */
export async function listarDocumentos(orgId: string, ambito: { companyId: string; processId?: string | null }) {
  const filtro = ambito.processId
    ? or(eq(schema.documents.processId, ambito.processId), and(eq(schema.documents.companyId, ambito.companyId), isNull(schema.documents.processId)))
    : and(eq(schema.documents.companyId, ambito.companyId), isNull(schema.documents.processId));
  return db
    .select(colsDoc)
    .from(schema.documents)
    .where(and(eq(schema.documents.orgId, orgId), eq(schema.documents.companyId, ambito.companyId), filtro))
    .orderBy(desc(schema.documents.createdAt));
}

export async function documento(orgId: string, id: string) {
  const [d] = await db
    .select()
    .from(schema.documents)
    .where(and(eq(schema.documents.orgId, orgId), eq(schema.documents.id, id)));
  if (!d) throw new NoEncontrado("Documento");
  return d;
}

/** Documento accesible desde el ámbito dado (misma empresa; del proceso o corporativo). */
export async function documentoEnAmbito(orgId: string, ambito: { companyId: string; processId?: string | null }, id: string) {
  const d = await documento(orgId, id);
  const visible = d.companyId === ambito.companyId && (d.processId === null || d.processId === (ambito.processId ?? null));
  if (!visible) throw new NoEncontrado("Documento");
  return d;
}

export async function contenidoDocumento(orgId: string, id: string) {
  const d = await documento(orgId, id);
  return { doc: d, buffer: await almacen().get(d.storageKey) };
}

export async function guardarDocumento(
  orgId: string,
  d: {
    companyId: string;
    processId: string | null;
    buffer: Buffer;
    nombre: string;
    mime: string;
    categoria?: string;
    version?: string;
    descripcion?: string;
    origen?: "usuario" | "agente";
    subidoPor?: string | null;
  },
) {
  const hash = sha256(d.buffer);
  const key = claveDe(orgId, hash);
  await almacen().put(key, d.buffer, d.mime);
  const ext = await extraerTexto(d.buffer, d.mime, d.nombre);
  const [doc] = await db
    .insert(schema.documents)
    .values({
      orgId,
      companyId: d.companyId,
      processId: d.processId,
      nombre: d.nombre.slice(0, 240),
      categoria: d.categoria ?? "otro",
      version: d.version ?? "original",
      descripcion: d.descripcion ?? "",
      mime: d.mime,
      tamano: d.buffer.length,
      sha256: hash,
      storageKey: key,
      paginas: ext.totalPaginas,
      textoEstado: ext.estado,
      origen: d.origen ?? "usuario",
      subidoPor: d.subidoPor ?? null,
    })
    .returning();
  if (ext.paginas.length) {
    const filas = ext.paginas.map((texto, i) => ({ documentId: doc.id, pagina: i + 1, texto }));
    for (let i = 0; i < filas.length; i += 200) await db.insert(schema.documentPages).values(filas.slice(i, i + 200));
  }
  return { doc, extraccion: ext };
}

export async function actualizarDocumento(orgId: string, id: string, patch: Partial<{ categoria: string; version: string; descripcion: string; nombre: string }>) {
  const [d] = await db
    .update(schema.documents)
    .set(patch)
    .where(and(eq(schema.documents.orgId, orgId), eq(schema.documents.id, id)))
    .returning();
  if (!d) throw new NoEncontrado("Documento");
  return d;
}

export async function eliminarDocumento(orgId: string, id: string) {
  const d = await documento(orgId, id);
  await db.delete(schema.documents).where(and(eq(schema.documents.orgId, orgId), eq(schema.documents.id, id)));
  const [{ n }] = await db
    .select({ n: raw<number>`count(*)::int` })
    .from(schema.documents)
    .where(eq(schema.documents.storageKey, d.storageKey));
  if (n === 0) await almacen().del(d.storageKey).catch(() => {});
  return d;
}

export async function leerPaginas(documentId: string, desde: number, hasta: number) {
  return db
    .select()
    .from(schema.documentPages)
    .where(and(eq(schema.documentPages.documentId, documentId), raw`${schema.documentPages.pagina} between ${desde} and ${hasta}`))
    .orderBy(asc(schema.documentPages.pagina));
}

export async function buscarTexto(orgId: string, ambito: { companyId: string; processId?: string | null }, consulta: string, documentoIds?: string[]) {
  const q = consulta.trim();
  if (!q) return [];
  const patron = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
  const docs = (await listarDocumentos(orgId, ambito)).filter((d) => !documentoIds?.length || documentoIds.includes(d.id));
  if (!docs.length) return [];
  const ids = docs.map((d) => d.id);
  const filas = await sql<{ document_id: string; pagina: number; texto: string }[]>`
    select document_id, pagina, texto from document_pages
    where document_id in ${sql(ids)}
      and (texto ilike ${patron} or to_tsvector('spanish', texto) @@ plainto_tsquery('spanish', ${q}))
    order by document_id, pagina
    limit 40`;
  const nombres = new Map(docs.map((d) => [d.id, d.nombre]));
  return filas.map((f) => {
    const i = f.texto.toLowerCase().indexOf(q.toLowerCase());
    const ini = Math.max(0, (i < 0 ? 0 : i) - 180);
    return { documento_id: f.document_id, documento: nombres.get(f.document_id) ?? "", pagina: f.pagina, fragmento: f.texto.slice(ini, ini + 420).replace(/\s+/g, " ").trim() };
  });
}

/* ───────────── Registros (matrices del expediente) ───────────── */

export type Ambito = { orgId: string; companyId: string; processId: string | null };
const ambitoId = (a: Ambito, ambito: "proceso" | "empresa") => {
  if (ambito === "proceso") {
    if (!a.processId) throw new Error("esta tabla requiere un proceso");
    return a.processId;
  }
  return a.companyId;
};

export async function listarRegistros(a: Ambito, tabla: string, ambito?: "proceso" | "empresa") {
  const def = tablaDef(tabla);
  const amb = ambito ?? (def.ambitos.includes("proceso") && a.processId ? "proceso" : def.ambitos[0]);
  return db
    .select()
    .from(schema.registros)
    .where(and(eq(schema.registros.orgId, a.orgId), eq(schema.registros.ambitoId, ambitoId(a, amb)), eq(schema.registros.tabla, tabla)))
    .orderBy(asc(schema.registros.orden), asc(schema.registros.createdAt));
}

/** Evidencias: las del proceso y las corporativas de la empresa, juntas. */
export async function listarRegistrosAmbos(a: Ambito, tabla: string) {
  const def = tablaDef(tabla);
  const ids = [...(def.ambitos.includes("empresa") ? [a.companyId] : []), ...(def.ambitos.includes("proceso") && a.processId ? [a.processId] : [])];
  if (!ids.length) return [];
  return db
    .select()
    .from(schema.registros)
    .where(and(eq(schema.registros.orgId, a.orgId), inArray(schema.registros.ambitoId, ids), eq(schema.registros.tabla, tabla)))
    .orderBy(asc(schema.registros.orden), asc(schema.registros.createdAt));
}

export type ResultadoGuardar = { creados: string[]; actualizados: string[]; errores: { codigo: string; errores: string[] }[] };

export async function guardarRegistros(a: Ambito, tabla: string, filas: Record<string, unknown>[], actor: Actor, ambito?: "proceso" | "empresa"): Promise<ResultadoGuardar> {
  const def = tablaDef(tabla);
  const amb = ambito ?? (def.ambitos.includes("proceso") && a.processId ? "proceso" : def.ambitos[0]);
  if (!def.ambitos.includes(amb)) throw new Error(`la tabla ${tabla} no admite el ámbito ${amb}`);
  const aid = ambitoId(a, amb);
  const res: ResultadoGuardar = { creados: [], actualizados: [], errores: [] };

  const existentes = await db
    .select()
    .from(schema.registros)
    .where(and(eq(schema.registros.orgId, a.orgId), eq(schema.registros.ambitoId, aid), eq(schema.registros.tabla, tabla)));
  const porCodigo = new Map(existentes.map((r) => [r.codigo, r]));
  let consecutivo = existentes.reduce((max, r) => {
    const m = new RegExp(`^${def.prefijo}-(\\d+)$`).exec(r.codigo);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);
  let orden = existentes.reduce((max, r) => Math.max(max, r.orden), 0);

  for (const fila of filas) {
    const codigoDado = typeof fila.codigo === "string" ? fila.codigo.trim().slice(0, 40) : "";
    const previo = codigoDado ? porCodigo.get(codigoDado) : undefined;
    const v = validarFila(tabla, fila, { parcial: Boolean(previo) });
    if (!v.ok) {
      res.errores.push({ codigo: codigoDado || "(nuevo)", errores: v.errores });
      continue;
    }
    if (previo) {
      const data = { ...previo.data, ...v.data };
      await db.update(schema.registros).set({ data, actualizadoPor: `${actor.tipo}:${actor.id}`, updatedAt: new Date() }).where(eq(schema.registros.id, previo.id));
      porCodigo.set(previo.codigo, { ...previo, data });
      res.actualizados.push(previo.codigo);
    } else {
      const codigo = codigoDado || `${def.prefijo}-${String(++consecutivo).padStart(2, "0")}`;
      const [nuevo] = await db
        .insert(schema.registros)
        .values({ orgId: a.orgId, companyId: a.companyId, processId: amb === "proceso" ? a.processId : null, ambitoId: aid, tabla, codigo, data: v.data, orden: ++orden, actualizadoPor: `${actor.tipo}:${actor.id}` })
        .returning();
      porCodigo.set(codigo, nuevo);
      res.creados.push(codigo);
    }
  }
  if (res.creados.length || res.actualizados.length) {
    await auditar(a.orgId, actor, "registros.guardar", { processId: a.processId, entidad: tabla, detalle: { creados: res.creados, actualizados: res.actualizados } });
  }
  return res;
}

export async function eliminarRegistros(a: Ambito, tabla: string, codigos: string[], actor: Actor) {
  tablaDef(tabla);
  const ids = [a.companyId, ...(a.processId ? [a.processId] : [])];
  const borrados = await db
    .delete(schema.registros)
    .where(and(eq(schema.registros.orgId, a.orgId), inArray(schema.registros.ambitoId, ids), eq(schema.registros.tabla, tabla), inArray(schema.registros.codigo, codigos)))
    .returning({ codigo: schema.registros.codigo });
  if (borrados.length) await auditar(a.orgId, actor, "registros.eliminar", { processId: a.processId, entidad: tabla, detalle: { codigos: borrados.map((b) => b.codigo) } });
  return borrados.map((b) => b.codigo);
}

/* ───────────── Entregables y aprobaciones ───────────── */

export async function listarEntregables(orgId: string, processId: string) {
  return db
    .select()
    .from(schema.entregables)
    .where(and(eq(schema.entregables.orgId, orgId), eq(schema.entregables.processId, processId)))
    .orderBy(desc(schema.entregables.createdAt));
}

export async function entregable(orgId: string, id: string) {
  const [e] = await db
    .select()
    .from(schema.entregables)
    .where(and(eq(schema.entregables.orgId, orgId), eq(schema.entregables.id, id)));
  if (!e) throw new NoEncontrado("Entregable");
  return e;
}

export async function crearEntregable(orgId: string, processId: string, d: { tipo: string; titulo: string; contenidoMd: string; destino?: string; creadoPor: string }) {
  const previos = await db
    .select({ v: schema.entregables.version })
    .from(schema.entregables)
    .where(and(eq(schema.entregables.orgId, orgId), eq(schema.entregables.processId, processId), eq(schema.entregables.tipo, d.tipo), eq(schema.entregables.titulo, d.titulo)));
  const version = previos.reduce((m, p) => Math.max(m, p.v), 0) + 1;
  const [e] = await db
    .insert(schema.entregables)
    .values({ orgId, processId, tipo: d.tipo, titulo: d.titulo.slice(0, 200), contenidoMd: d.contenidoMd, version, destino: d.destino ?? "interno", creadoPor: d.creadoPor })
    .returning();
  return e;
}

export async function listarAprobaciones(orgId: string, processId: string) {
  return db
    .select()
    .from(schema.aprobaciones)
    .where(and(eq(schema.aprobaciones.orgId, orgId), eq(schema.aprobaciones.processId, processId)))
    .orderBy(desc(schema.aprobaciones.createdAt));
}

/* ───────────── Conversaciones ───────────── */

export async function listarConversaciones(orgId: string, processId: string) {
  return db
    .select()
    .from(schema.conversations)
    .where(and(eq(schema.conversations.orgId, orgId), eq(schema.conversations.processId, processId)))
    .orderBy(desc(schema.conversations.updatedAt));
}

export async function conversacion(orgId: string, id: string) {
  const [c] = await db
    .select()
    .from(schema.conversations)
    .where(and(eq(schema.conversations.orgId, orgId), eq(schema.conversations.id, id)));
  if (!c) throw new NoEncontrado("Conversación");
  return c;
}

export async function mensajes(orgId: string, conversationId: string) {
  return db
    .select()
    .from(schema.messages)
    .where(and(eq(schema.messages.orgId, orgId), eq(schema.messages.conversationId, conversationId)))
    .orderBy(asc(schema.messages.seq));
}

export async function bitacora(orgId: string, processId: string, limite = 200) {
  return db
    .select()
    .from(schema.auditLog)
    .where(and(eq(schema.auditLog.orgId, orgId), eq(schema.auditLog.processId, processId)))
    .orderBy(desc(schema.auditLog.id))
    .limit(limite);
}
