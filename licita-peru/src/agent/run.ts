// Bucle del agente: historial de solo anexar, ejecución de herramientas con el ámbito de la
// sesión, medición de consumo y pasadas de especialista.
import { and, eq, isNull, lt, or, sql as raw } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { env } from "@/lib/env";
import { auditar, type Actor } from "@/lib/audit";
import { conversacion, guardarRegistros, mensajes, proceso } from "@/lib/datos";
import { ErrorLimite, registrarUso, verificarLimite } from "@/lib/planes";
import { almacen, claveDe } from "@/lib/storage";
import { sha256 } from "@/lib/cuentas";
import { ahoraEn } from "@/lib/fechas";
import { Anthropic, modeloPorDefecto, type MensajeApi, type Modelo, type RespuestaApi } from "./modelo";
import { construirSystem, encargoEspecialista, ROLES_ESPECIALISTA, type RolEspecialista } from "./prompt";
import { definicionesApi, ejecutarHerramienta, etiquetaHerramienta, type CtxHerramienta } from "./tools";

export type EventoUI =
  | { t: "conversacion"; id: string }
  | { t: "texto"; d: string }
  | { t: "pensando"; d: string }
  | { t: "herramienta"; id: string; etiqueta: string }
  | { t: "herramienta_fin"; id: string; ok: boolean }
  | { t: "paso"; d: string }
  | { t: "corte" }
  | { t: "aviso"; mensaje: string }
  | { t: "error"; mensaje: string }
  | { t: "fin"; costoUsd: number; tokens: { entrada: number; salida: number }; cambios: string[] };

export type SesionAgente = { orgId: string; userId: string; usuarioNombre: string; rol: string };

/* ───────── Persistencia: los binarios de las lecturas visuales van al almacén, no a la tabla ───────── */

type Bloque = Record<string, unknown>;
const esBase64 = (b: Bloque) => (b.type === "document" || b.type === "image") && (b.source as Bloque | undefined)?.type === "base64";

async function deshidratar(orgId: string, contenido: unknown): Promise<unknown> {
  if (!Array.isArray(contenido)) return contenido;
  const out: unknown[] = [];
  for (const bloque of contenido as Bloque[]) {
    if (bloque?.type === "tool_result" && Array.isArray(bloque.content)) {
      const interno: unknown[] = [];
      for (const b of bloque.content as Bloque[]) {
        if (esBase64(b)) {
          const src = b.source as { data: string; media_type: string };
          const bytes = Buffer.from(src.data, "base64");
          const key = claveDe(orgId, sha256(bytes), ".msg");
          await almacen().put(key, bytes, src.media_type);
          interno.push({ ...b, source: { type: "__almacen", key, media_type: src.media_type } });
        } else interno.push(b);
      }
      out.push({ ...bloque, content: interno });
    } else out.push(bloque);
  }
  return out;
}

async function hidratar(orgId: string, contenido: unknown): Promise<unknown> {
  if (!Array.isArray(contenido)) return contenido;
  const out: unknown[] = [];
  for (const bloque of contenido as Bloque[]) {
    if (bloque?.type === "tool_result" && Array.isArray(bloque.content)) {
      const interno: unknown[] = [];
      for (const b of bloque.content as Bloque[]) {
        const src = b.source as { type?: string; key?: string; media_type?: string } | undefined;
        if (src?.type === "__almacen" && src.key) {
          if (!src.key.startsWith(`org/${orgId}/`)) throw new Error("referencia de almacenamiento ajena a la organización");
          // Mismos bytes que se enviaron la primera vez: el historial se reproduce idéntico.
          interno.push({ ...b, source: { type: "base64", media_type: src.media_type, data: (await almacen().get(src.key)).toString("base64") } });
        } else interno.push(b);
      }
      out.push({ ...bloque, content: interno });
    } else out.push(bloque);
  }
  return out;
}

async function anexar(orgId: string, conversationId: string, rol: "user" | "assistant", contenido: unknown) {
  await db.insert(schema.messages).values({ conversationId, orgId, rol, contenido: JSON.stringify(await deshidratar(orgId, contenido)) });
}

/* ───────── Utilidades ───────── */

/** Mensaje de usuario o asistente con el contenido tal como se envió o recibió de la API. */
const msg = (role: "user" | "assistant", content: unknown): MensajeApi => ({ role, content }) as MensajeApi;

function usoDe(m: RespuestaApi) {
  const u = m.usage as RespuestaApi["usage"] & { server_tool_use?: { web_search_requests?: number | null } | null };
  return {
    input_tokens: u.input_tokens,
    output_tokens: u.output_tokens,
    cache_read_input_tokens: u.cache_read_input_tokens,
    cache_creation_input_tokens: u.cache_creation_input_tokens,
    busquedasWeb: u.server_tool_use?.web_search_requests ?? 0,
  };
}

function mensajeDeError(e: unknown): string {
  if (e instanceof ErrorLimite) return e.message;
  if (e instanceof Anthropic.AuthenticationError) return "La clave de la API del modelo no es válida o no tiene permisos. Revise ANTHROPIC_API_KEY en la configuración del servidor.";
  if (e instanceof Anthropic.RateLimitError) return "El proveedor del modelo aplicó un límite de tasa. Espere un minuto y reintente.";
  if (e instanceof Anthropic.BadRequestError) return `El proveedor del modelo rechazó la solicitud: ${e.message}`;
  if (e instanceof Anthropic.APIConnectionError) return "No se pudo conectar con el proveedor del modelo. Reintente en unos segundos.";
  if (e instanceof Anthropic.APIError) return `Error del proveedor del modelo (${e.status ?? "sin código"}). Reintente; si persiste, revise el estado del servicio.`;
  return e instanceof Error ? e.message : String(e);
}

/** Pide un turno al modelo; si la entrada de una herramienta llegó como JSON ilegible, reintenta. */
async function turnoConReintento(modelo: Modelo, p: Parameters<Modelo["turno"]>[0]): Promise<RespuestaApi> {
  for (let intento = 0; ; intento++) {
    try {
      return await modelo.turno(p);
    } catch (e) {
      if (e instanceof Anthropic.APIError || intento >= 2 || p.signal?.aborted) throw e;
      if (!(e instanceof SyntaxError) && !/JSON/i.test(e instanceof Error ? e.message : "")) throw e;
      console.warn("[agente] entrada de herramienta ilegible; se reintenta el turno");
    }
  }
}

type Corrida = {
  ctx: CtxHerramienta;
  modelo: Modelo;
  system: ReturnType<typeof construirSystem>;
  tools: ReturnType<typeof definicionesApi>;
  emitir: (e: EventoUI) => void;
  sesion: SesionAgente;
  totales: { costo: number; entrada: number; salida: number };
  signal?: AbortSignal;
};

async function medir(c: Corrida, modelo: string, tipo: "agente" | "especialista", m: RespuestaApi) {
  const uso = usoDe(m);
  c.totales.costo += await registrarUso({ orgId: c.ctx.orgId, userId: c.sesion.userId, processId: c.ctx.processId, modelo, tipo, uso });
  c.totales.entrada += (uso.input_tokens ?? 0) + (uso.cache_read_input_tokens ?? 0) + (uso.cache_creation_input_tokens ?? 0);
  c.totales.salida += uso.output_tokens ?? 0;
}

const textoDe = (m: RespuestaApi) =>
  m.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("\n")
    .trim();

/* ───────── Especialista: pasada independiente, solo lectura ───────── */

async function pasadaEspecialista(c: Corrida, rol: RolEspecialista, encargo: string): Promise<string> {
  const nombre = ROLES_ESPECIALISTA[rol].nombre;
  const ctx: CtxHerramienta = { ...c.ctx, soloLectura: true, leidos: new Set(), consultarEspecialista: undefined, actor: { tipo: "agente", id: `especialista:${rol}` } };
  const historial: MensajeApi[] = [{ role: "user", content: encargoEspecialista(rol, encargo) }];
  let informe = "";
  let iteraciones = 0;
  for (; iteraciones < 16; iteraciones++) {
    const m = await turnoConReintento(c.modelo, {
      model: env.modeloEspecialista,
      effort: env.esfuerzoEspecialista,
      maxTokens: Math.min(env.maxTokens, 32000),
      system: c.system,
      tools: c.tools,
      messages: historial,
      signal: c.signal,
      onEvento: (e) => {
        if (e.t === "bloque") c.emitir({ t: "paso", d: `${nombre}: ${etiquetaHerramienta(e.nombre, {}).toLowerCase()}` });
      },
    });
    await medir(c, env.modeloEspecialista, "especialista", m);
    if (m.stop_reason === "refusal") {
      informe = "El especialista no pudo completar el encargo: el proveedor del modelo declinó la solicitud.";
      break;
    }
    historial.push(msg("assistant", m.content));
    if (m.stop_reason === "pause_turn") continue;
    const usos = m.content.filter((b) => b.type === "tool_use") as { id: string; name: string; input: unknown }[];
    if (!usos.length || m.stop_reason === "max_tokens") {
      informe = textoDe(m) || "El especialista no devolvió un informe.";
      break;
    }
    const resultados = [];
    for (const u of usos) {
      const r = await ejecutarHerramienta(ctx, u.name, u.input);
      resultados.push({ type: "tool_result" as const, tool_use_id: u.id, content: r.contenido, ...(r.esError ? { is_error: true } : {}) });
    }
    historial.push(msg("user", resultados));
  }
  if (!informe) informe = "El especialista agotó sus iteraciones sin cerrar un informe. Acote el encargo y vuelva a intentarlo.";

  await auditar(c.ctx.orgId, ctx.actor, "especialista.consulta", { processId: c.ctx.processId, entidad: "especialista", entidadId: rol, detalle: { iteraciones: iteraciones + 1, documentos_leidos: [...ctx.leidos] } });

  if (rol === "auditoria_final") {
    const veredicto = /RESULTADO:\s*(conforme|con observaciones|bloqueante)/i.exec(informe)?.[1]?.toLowerCase();
    const { p } = await proceso(c.ctx.orgId, c.ctx.processId);
    await guardarRegistros(
      c.ctx,
      "revisiones",
      [
        {
          tipo: "crítica final",
          revisor: "Agente — auditoría final (pasada independiente del modelo, con contexto propio)",
          fecha: ahoraEn(p.zonaHoraria).fecha,
          evidencia_usada: ctx.leidos.size ? `Documentos leídos: ${[...ctx.leidos].join("; ")}` : "Registros del expediente; no leyó documentos en esta pasada.",
          observaciones: informe.slice(0, 20000),
          ...(veredicto ? { resultado: veredicto } : {}),
        },
      ],
      ctx.actor,
    );
  }
  return `Informe del especialista (${nombre}) — pasada independiente, solo lectura:\n\n${informe}`;
}

/* ───────── Turno principal ───────── */

export async function ejecutarTurno(o: { sesion: SesionAgente; conversationId: string; texto: string; emitir: (e: EventoUI) => void; modelo?: Modelo; signal?: AbortSignal }): Promise<void> {
  const { sesion, emitir } = o;
  const conv = await conversacion(sesion.orgId, o.conversationId);
  const { p, c: emp } = await proceso(sesion.orgId, conv.processId);

  // Una sola ejecución por conversación (el candado caduca solo si el servidor cayó a mitad).
  const tomado = await db
    .update(schema.conversations)
    .set({ enCursoDesde: new Date() })
    .where(and(eq(schema.conversations.id, conv.id), or(isNull(schema.conversations.enCursoDesde), lt(schema.conversations.enCursoDesde, raw`now() - interval '20 minutes'`))))
    .returning({ id: schema.conversations.id });
  if (!tomado.length) {
    emitir({ t: "error", mensaje: "El agente ya está trabajando en esta sesión. Espere a que termine." });
    return;
  }

  const actor: Actor = { tipo: "agente", id: "coordinador" };
  const corrida: Corrida = {
    ctx: { orgId: sesion.orgId, companyId: p.companyId, processId: p.id, userId: sesion.userId, actor, soloLectura: false, leidos: new Set() },
    modelo: o.modelo ?? (await modeloPorDefecto()),
    system: construirSystem({
      empresa: { razonSocial: emp.razonSocial, ruc: emp.ruc, modalidad: emp.modalidad },
      proceso: { nombre: p.nombre, cliente: p.cliente, codigo: p.codigo, tipo: p.tipo, etapa: p.etapa, estado: p.estado, zonaHoraria: p.zonaHoraria },
      usuario: { nombre: sesion.usuarioNombre, rol: sesion.rol },
    }),
    tools: definicionesApi(),
    emitir,
    sesion,
    totales: { costo: 0, entrada: 0, salida: 0 },
    signal: o.signal,
  };
  corrida.ctx.consultarEspecialista = (rol, encargo) => pasadaEspecialista(corrida, rol, encargo);
  const cambios = new Set<string>();

  try {
    await verificarLimite(sesion.orgId, "presupuestoIaUsdMes", 0);

    const previos = await mensajes(sesion.orgId, conv.id);
    const historial: MensajeApi[] = [];
    for (const m of previos) historial.push(msg(m.rol as "user" | "assistant", await hidratar(sesion.orgId, JSON.parse(m.contenido))));

    const entrada = [{ type: "text" as const, text: o.texto }];
    historial.push({ role: "user", content: entrada });
    await anexar(sesion.orgId, conv.id, "user", entrada);
    if (!previos.length) await db.update(schema.conversations).set({ titulo: o.texto.replace(/\s+/g, " ").slice(0, 70) }).where(eq(schema.conversations.id, conv.id));
    await auditar(sesion.orgId, { tipo: "usuario", id: sesion.userId }, "agente.mensaje", { processId: p.id, entidad: "conversacion", entidadId: conv.id });

    let cerrado = false;
    for (let i = 0; i < env.maxIteraciones && !cerrado; i++) {
      if (o.signal?.aborted) break;
      const m = await turnoConReintento(corrida.modelo, {
        model: env.modeloAgente,
        effort: env.esfuerzo,
        maxTokens: env.maxTokens,
        system: corrida.system,
        tools: corrida.tools,
        messages: historial,
        signal: o.signal,
        onEvento: (e) => {
          if (e.t === "texto" || e.t === "pensando") emitir(e);
          // Las herramientas propias se anuncian al ejecutarlas, con su entrada ya validada.
          else if (e.nombre === "web_search" || e.nombre === "web_fetch") emitir({ t: "herramienta", id: e.id, etiqueta: etiquetaHerramienta(e.nombre, {}) });
        },
      });
      await medir(corrida, env.modeloAgente, "agente", m);

      if (m.stop_reason === "refusal") {
        // No se guarda la respuesta parcial: el historial queda como antes de este intento.
        emitir({ t: "aviso", mensaje: "El proveedor del modelo declinó continuar con esta solicitud por sus políticas de uso. Reformule el pedido; el expediente no se modificó en este paso." });
        break;
      }

      const usos = m.content.filter((b) => b.type === "tool_use") as { id: string; name: string; input: unknown }[];
      if (m.stop_reason === "max_tokens" && usos.length) {
        emitir({ t: "error", mensaje: "La respuesta del modelo se cortó a mitad de una operación y no se ejecutó. Pida el trabajo en partes más pequeñas." });
        break;
      }

      historial.push(msg("assistant", m.content));
      await anexar(sesion.orgId, conv.id, "assistant", m.content);
      for (const b of m.content) if (b.type === "server_tool_use") emitir({ t: "herramienta_fin", id: b.id, ok: true });

      if (m.stop_reason === "pause_turn") continue; // el servidor retoma su propia herramienta
      if (!usos.length) {
        if (m.stop_reason === "max_tokens") emitir({ t: "aviso", mensaje: "La respuesta alcanzó el límite de longitud y quedó cortada." });
        cerrado = true;
        break;
      }

      emitir({ t: "corte" });
      const resultados = [];
      for (const u of usos) {
        emitir({ t: "herramienta", id: u.id, etiqueta: etiquetaHerramienta(u.name, u.input) });
        const r = await ejecutarHerramienta(corrida.ctx, u.name, u.input);
        for (const cb of r.cambios ?? []) cambios.add(cb);
        emitir({ t: "herramienta_fin", id: u.id, ok: !r.esError });
        resultados.push({ type: "tool_result" as const, tool_use_id: u.id, content: r.contenido, ...(r.esError ? { is_error: true } : {}) });
      }
      // Todos los resultados de un mismo mensaje del asistente viajan juntos en un solo mensaje.
      historial.push(msg("user", resultados));
      await anexar(sesion.orgId, conv.id, "user", resultados);
    }
    if (!cerrado && !o.signal?.aborted) {
      const ultimo = historial[historial.length - 1];
      if (ultimo?.role === "user" && Array.isArray(ultimo.content) && ultimo.content.some((b) => b.type === "tool_result")) {
        emitir({ t: "aviso", mensaje: `El agente alcanzó el máximo de ${env.maxIteraciones} pasos en un turno. Lo avanzado quedó guardado; escriba «continúa» para seguir.` });
      }
    }
  } catch (e) {
    if (!o.signal?.aborted) {
      console.error("[agente] turno fallido", e);
      emitir({ t: "error", mensaje: mensajeDeError(e) });
    }
  } finally {
    await db.update(schema.conversations).set({ enCursoDesde: null, updatedAt: new Date() }).where(eq(schema.conversations.id, conv.id));
    emitir({ t: "fin", costoUsd: Math.round(corrida.totales.costo * 10000) / 10000, tokens: { entrada: corrida.totales.entrada, salida: corrida.totales.salida }, cambios: [...cambios] });
  }
}

export async function crearConversacion(orgId: string, processId: string, userId: string) {
  await proceso(orgId, processId); // confirma tenencia
  const [c] = await db.insert(schema.conversations).values({ orgId, processId, creadaPor: userId }).returning();
  return c;
}
