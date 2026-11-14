// Compuertas de estado del expediente (§13 y §15 del prompt). Valen igual para el agente y
// para las personas: nadie declara "listo" o "presentado" sin lo que la regla exige.
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { ACCIONES_DE_PRESENTACION, ESTADOS_DEL_AGENTE, ESTADOS_PROCESO, type EstadoProceso } from "./catalogos";
import { listarAprobaciones, listarRegistros, proceso, type Ambito } from "./datos";
import { auditar, type Actor } from "./audit";

export type ResultadoEstado = { ok: true; avisos: string[] } | { ok: false; motivos: string[] };

const CUMPLE = new Set(["cumple verificado", "no aplica con fundamento"]);
const EXIGIBLE = new Set(["eliminatorio", "obligatorio"]);

export async function evaluarCambioEstado(
  a: Ambito & { processId: string },
  nuevo: string,
  actor: Actor,
  opciones: { pendientesDeFirma?: string[] } = {},
): Promise<ResultadoEstado> {
  if (!ESTADOS_PROCESO.some((e) => e.id === nuevo)) return { ok: false, motivos: [`estado desconocido: ${nuevo}`] };
  const estado = nuevo as EstadoProceso;
  if (actor.tipo === "agente" && !ESTADOS_DEL_AGENTE.includes(estado)) {
    return { ok: false, motivos: ["Este estado refleja un resultado externo y solo lo registra una persona con la comunicación verificable del cliente."] };
  }
  const { p } = await proceso(a.orgId, a.processId);
  const motivos: string[] = [];
  const avisos: string[] = [];

  if (estado === "en_preparacion" || ["adjudicado", "no_adjudicado", "desistido", "cerrado"].includes(estado)) return { ok: true, avisos };

  const [requisitos, brechas, preguntas, aprobaciones] = await Promise.all([
    listarRegistros(a, "requisitos"),
    listarRegistros(a, "brechas"),
    listarRegistros(a, "preguntas"),
    listarAprobaciones(a.orgId, a.processId),
  ]);
  const firmas = new Set(estado === "listo_aprobacion_firma" ? (opciones.pendientesDeFirma ?? []) : []);
  const bloqueantes = requisitos.filter((r) => EXIGIBLE.has(String(r.data.caracter ?? "")) && !CUMPLE.has(String(r.data.estado ?? "")) && !firmas.has(r.codigo));
  const brechasAltas = brechas.filter((b) => b.data.prioridad === "alta" && b.data.estado !== "cerrada");

  if (estado === "listo_aprobacion_firma" || estado === "listo_presentar") {
    if (!requisitos.length) motivos.push("La matriz maestra está vacía: no hay requisitos contra los cuales declarar el expediente listo.");
    if (bloqueantes.length) {
      motivos.push(
        `Hay ${bloqueantes.length} requisito(s) eliminatorio(s) u obligatorio(s) sin cumplir: ${bloqueantes
          .slice(0, 12)
          .map((r) => `${r.codigo} (${r.data.estado})`)
          .join(", ")}${bloqueantes.length > 12 ? "…" : ""}. Un avance alto no compensa un requisito eliminatorio incumplido.`,
      );
    }
    if (brechasAltas.length) motivos.push(`Hay ${brechasAltas.length} brecha(s) de prioridad alta sin cerrar: ${brechasAltas.map((b) => b.codigo).join(", ")}.`);
    const desconocidas = [...firmas].filter((c) => !requisitos.some((r) => r.codigo === c));
    if (desconocidas.length) motivos.push(`Códigos de requisito inexistentes en pendientes de firma: ${desconocidas.join(", ")}.`);
    const abiertas = preguntas.filter((q) => q.data.estado === "abierta").length;
    if (abiertas) avisos.push(`Quedan ${abiertas} pregunta(s) abiertas a la empresa.`);
  }

  if (estado === "listo_presentar") {
    if (p.estado !== "listo_aprobacion_firma") motivos.push("Primero debe estar en «Listo para aprobación y firma».");
    const pendientes = aprobaciones.filter((x) => x.estado === "pendiente");
    if (pendientes.length) motivos.push(`Hay ${pendientes.length} aprobación(es) pendiente(s) de resolver.`);
    if (!aprobaciones.some((x) => x.estado === "aprobada" && ACCIONES_DE_PRESENTACION.includes(x.accion))) {
      motivos.push("Falta una aprobación explícita y aprobada para presentar, enviar o emitir la oferta (destinatario, versión, contenido, precio y efecto).");
    }
    const firmasPrevias = Array.isArray(p.ficha.pendientes_de_firma) ? (p.ficha.pendientes_de_firma as string[]) : [];
    const sinFirma = requisitos.filter((r) => firmasPrevias.includes(r.codigo) && !CUMPLE.has(String(r.data.estado ?? "")));
    if (sinFirma.length) motivos.push(`Siguen sin completarse las firmas o aprobaciones identificadas: ${sinFirma.map((r) => r.codigo).join(", ")}.`);
  }

  if (estado === "presentado") {
    const [constancia] = await db
      .select({ id: schema.documents.id })
      .from(schema.documents)
      .where(and(eq(schema.documents.orgId, a.orgId), eq(schema.documents.processId, a.processId), eq(schema.documents.categoria, "constancia")))
      .limit(1);
    if (!constancia) motivos.push("No hay una constancia verificable de presentación. Suba el cargo, correo o constancia del portal con la categoría «Constancia de presentación».");
  }

  return motivos.length ? { ok: false, motivos } : { ok: true, avisos };
}

export async function cambiarEstado(
  a: Ambito & { processId: string },
  nuevo: string,
  actor: Actor,
  opciones: { fundamento?: string; pendientesDeFirma?: string[] } = {},
): Promise<ResultadoEstado> {
  const r = await evaluarCambioEstado(a, nuevo, actor, opciones);
  const { p } = await proceso(a.orgId, a.processId);
  if (!r.ok) {
    await auditar(a.orgId, actor, "proceso.estado.rechazado", { processId: a.processId, entidad: "proceso", entidadId: a.processId, detalle: { de: p.estado, a: nuevo, motivos: r.motivos } });
    return r;
  }
  const ficha = { ...p.ficha };
  if (nuevo === "listo_aprobacion_firma") ficha.pendientes_de_firma = opciones.pendientesDeFirma ?? [];
  await db.update(schema.processes).set({ estado: nuevo, ficha, updatedAt: new Date() }).where(and(eq(schema.processes.orgId, a.orgId), eq(schema.processes.id, a.processId)));
  await auditar(a.orgId, actor, "proceso.estado", {
    processId: a.processId,
    entidad: "proceso",
    entidadId: a.processId,
    detalle: { de: p.estado, a: nuevo, fundamento: opciones.fundamento ?? "", pendientesDeFirma: opciones.pendientesDeFirma ?? [] },
  });
  return r;
}

/**
 * Control de cambios (§13): si llegan bases, adendas, aclaraciones o contrato nuevos a un
 * expediente ya declarado listo, se reabre para rehacer las revisiones afectadas.
 */
export async function reabrirSiCorresponde(a: Ambito & { processId: string }, categoria: string, nombre: string) {
  if (!["bases", "tdr", "adenda", "aclaracion", "contrato", "cuestionario", "anexo"].includes(categoria)) return false;
  const { p } = await proceso(a.orgId, a.processId);
  if (!["listo_aprobacion_firma", "listo_presentar"].includes(p.estado)) return false;
  await db.update(schema.processes).set({ estado: "en_preparacion", updatedAt: new Date() }).where(and(eq(schema.processes.orgId, a.orgId), eq(schema.processes.id, a.processId)));
  await auditar(a.orgId, { tipo: "sistema", id: "control-de-cambios" }, "proceso.reabierto", {
    processId: a.processId,
    entidad: "proceso",
    entidadId: a.processId,
    detalle: { de: p.estado, motivo: `Nuevo documento del proceso (${categoria}): ${nombre}. Comparar versiones y rehacer las revisiones afectadas.` },
  });
  return true;
}
