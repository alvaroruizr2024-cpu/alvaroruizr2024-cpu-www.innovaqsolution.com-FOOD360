import { db, schema } from "@/db/client";

export type Actor = { tipo: "usuario" | "agente" | "sistema"; id: string };

/** Bitácora de solo anexar: quién hizo qué y cuándo. Nunca debe tumbar la operación principal. */
export async function auditar(
  orgId: string,
  actor: Actor,
  accion: string,
  datos: { processId?: string | null; entidad?: string; entidadId?: string; detalle?: Record<string, unknown> } = {},
) {
  try {
    await db.insert(schema.auditLog).values({
      orgId,
      processId: datos.processId ?? null,
      actorTipo: actor.tipo,
      actorId: actor.id,
      accion,
      entidad: datos.entidad ?? "",
      entidadId: datos.entidadId ?? "",
      detalle: datos.detalle ?? {},
    });
  } catch (e) {
    console.error("[auditoría] no se pudo registrar", accion, e);
  }
}
