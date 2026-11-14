// Planes, límites y medición de consumo de IA por organización.
import { and, eq, gte, inArray, sql as raw } from "drizzle-orm";
import { db, schema } from "@/db/client";
import type { PlanLimites } from "@/db/schema";
import { ESTADOS_ACTIVOS } from "./catalogos";

/**
 * Precios de referencia en USD por millón de tokens (API de Anthropic, tabla consultada el
 * 2026-11-03). Son la base del costo ESTIMADO que se muestra y del tope mensual del plan.
 * Se pueden sustituir con PRECIOS_MODELOS_JSON sin tocar código.
 */
const PRECIOS_BASE: Record<string, { entrada: number; salida: number; lecturaCache: number; escrituraCache: number }> = {
  "claude-opus-5-5": { entrada: 4, salida: 20, lecturaCache: 0.2, escrituraCache: 5 },
  "claude-sonnet-5-5": { entrada: 2, salida: 10, lecturaCache: 0.1, escrituraCache: 2.5 },
  "claude-haiku-5-5": { entrada: 0.1, salida: 0.5, lecturaCache: 0.01, escrituraCache: 0.125 },
  "claude-fable-5-2": { entrada: 8, salida: 40, lecturaCache: 0.2, escrituraCache: 10 },
};

function precios() {
  try {
    return { ...PRECIOS_BASE, ...(process.env.PRECIOS_MODELOS_JSON ? JSON.parse(process.env.PRECIOS_MODELOS_JSON) : {}) } as typeof PRECIOS_BASE;
  } catch {
    return PRECIOS_BASE;
  }
}

export type UsoTokens = { input_tokens?: number | null; output_tokens?: number | null; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null; busquedasWeb?: number };

export function costoUsd(modelo: string, u: UsoTokens): number {
  const p = precios()[modelo] ?? precios()["claude-opus-5-5"];
  const porBusqueda = Number(process.env.PRECIO_BUSQUEDA_WEB_USD ?? 0.01);
  return (
    ((u.input_tokens ?? 0) * p.entrada + (u.output_tokens ?? 0) * p.salida + (u.cache_read_input_tokens ?? 0) * p.lecturaCache + (u.cache_creation_input_tokens ?? 0) * p.escrituraCache) / 1_000_000 +
    (u.busquedasWeb ?? 0) * porBusqueda
  );
}

export async function registrarUso(d: { orgId: string; userId?: string | null; processId?: string | null; modelo: string; tipo: "agente" | "especialista"; uso: UsoTokens }) {
  const costo = costoUsd(d.modelo, d.uso);
  await db.insert(schema.usageEvents).values({
    orgId: d.orgId,
    userId: d.userId ?? null,
    processId: d.processId ?? null,
    modelo: d.modelo,
    tipo: d.tipo,
    inputTokens: d.uso.input_tokens ?? 0,
    outputTokens: d.uso.output_tokens ?? 0,
    cacheReadTokens: d.uso.cache_read_input_tokens ?? 0,
    cacheWriteTokens: d.uso.cache_creation_input_tokens ?? 0,
    busquedasWeb: d.uso.busquedasWeb ?? 0,
    costoUsd: costo.toFixed(6),
  });
  return costo;
}

export async function planDe(orgId: string) {
  const [f] = await db
    .select({ plan: schema.plans })
    .from(schema.organizations)
    .innerJoin(schema.plans, eq(schema.plans.id, schema.organizations.planId))
    .where(eq(schema.organizations.id, orgId));
  if (!f) throw new Error("organización sin plan");
  return f.plan;
}

export async function usoDe(orgId: string) {
  const inicioMes = raw`date_trunc('month', now() at time zone 'America/Lima') at time zone 'America/Lima'`;
  const [[emp], [proc], [miem], [alm], [ia]] = await Promise.all([
    db.select({ n: raw<number>`count(*)::int` }).from(schema.companies).where(eq(schema.companies.orgId, orgId)),
    db
      .select({ n: raw<number>`count(*)::int` })
      .from(schema.processes)
      .where(and(eq(schema.processes.orgId, orgId), inArray(schema.processes.estado, ESTADOS_ACTIVOS))),
    db.select({ n: raw<number>`count(*)::int` }).from(schema.memberships).where(eq(schema.memberships.orgId, orgId)),
    db.select({ n: raw<number>`coalesce(sum(${schema.documents.tamano}), 0)::float8` }).from(schema.documents).where(eq(schema.documents.orgId, orgId)),
    db
      .select({ usd: raw<number>`coalesce(sum(${schema.usageEvents.costoUsd}), 0)::float8`, llamadas: raw<number>`count(*)::int` })
      .from(schema.usageEvents)
      .where(and(eq(schema.usageEvents.orgId, orgId), gte(schema.usageEvents.createdAt, inicioMes))),
  ]);
  return { empresas: emp.n, procesosActivos: proc.n, miembros: miem.n, almacenamientoMb: alm.n / 1_048_576, iaUsdMes: ia.usd, llamadasIaMes: ia.llamadas };
}

export class ErrorLimite extends Error {}

const ETIQUETA: Record<keyof PlanLimites, string> = {
  empresas: "empresas",
  procesosActivos: "procesos activos",
  miembros: "miembros del equipo",
  almacenamientoMb: "MB de almacenamiento",
  presupuestoIaUsdMes: "USD de consumo de IA este mes",
};

/** Lanza ErrorLimite si crear `extra` unidades más del recurso supera el plan. */
export async function verificarLimite(orgId: string, recurso: keyof PlanLimites, extra = 1) {
  const [plan, uso] = await Promise.all([planDe(orgId), usoDe(orgId)]);
  const tope = plan.limites[recurso];
  if (tope === null || tope === undefined) return;
  const actual = { empresas: uso.empresas, procesosActivos: uso.procesosActivos, miembros: uso.miembros, almacenamientoMb: uso.almacenamientoMb, presupuestoIaUsdMes: uso.iaUsdMes }[recurso];
  if (actual + extra > tope) {
    throw new ErrorLimite(`El plan ${plan.nombre} permite hasta ${tope} ${ETIQUETA[recurso]} y la organización ya usa ${Math.round(actual * 100) / 100}. Un administrador puede cambiar de plan.`);
  }
}
