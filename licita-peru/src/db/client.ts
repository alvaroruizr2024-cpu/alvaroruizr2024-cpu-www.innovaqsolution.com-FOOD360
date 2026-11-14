import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { MIGRATIONS } from "./migrations.generated";
import type { PlanLimites } from "./schema";

function crear() {
  // La conexión es perezosa: construir el cliente no abre sockets, así que el build
  // puede importar este módulo sin base de datos disponible.
  const url = process.env.DATABASE_URL || "postgres://sin-configurar:x@127.0.0.1:1/sin-configurar";
  const sql = postgres(url, {
    max: Number(process.env.DB_POOL_MAX ?? 5),
    prepare: false, // compatible con poolers en modo transacción (Supabase, PgBouncer)
    onnotice: () => {},
  });
  return { sql, db: drizzle(sql, { schema }), listo: null as Promise<void> | null };
}

type Estado = ReturnType<typeof crear>;
const g = globalThis as unknown as { __licita?: Estado };
const estado: Estado = (g.__licita ??= crear());

export const sql = estado.sql;
export const db = estado.db;
export type DB = typeof db;
export { schema };

const PLANES_POR_DEFECTO: { id: string; nombre: string; descripcion: string; limites: PlanLimites; orden: number }[] = [
  {
    id: "inicial",
    nombre: "Inicial",
    descripcion: "Una empresa que participa en pocos procesos al año.",
    limites: { empresas: 1, procesosActivos: 2, miembros: 2, almacenamientoMb: 500, presupuestoIaUsdMes: 20 },
    orden: 1,
  },
  {
    id: "profesional",
    nombre: "Profesional",
    descripcion: "Equipos de licitaciones y consultoras con varios clientes.",
    limites: { empresas: 5, procesosActivos: 10, miembros: 8, almacenamientoMb: 5000, presupuestoIaUsdMes: 150 },
    orden: 2,
  },
  {
    id: "corporativo",
    nombre: "Corporativo",
    descripcion: "Grupos empresariales y consorcios con procesos simultáneos.",
    limites: { empresas: null, procesosActivos: null, miembros: null, almacenamientoMb: 50000, presupuestoIaUsdMes: 600 },
    orden: 3,
  },
];

export async function migrar(): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(727274001)`;
    await tx`create table if not exists _lp_migrations (id text primary key, applied_at timestamptz not null default now())`;
    const hechas = new Set((await tx`select id from _lp_migrations`).map((r) => r.id as string));
    for (const m of MIGRATIONS) {
      if (hechas.has(m.id)) continue;
      for (const parte of m.sql.split("--> statement-breakpoint")) {
        const s = parte.trim();
        if (s) await tx.unsafe(s);
      }
      await tx`insert into _lp_migrations (id) values (${m.id})`;
    }
    // Los planes iniciales son una propuesta editable por el operador; no fijan precios.
    const [{ n }] = await tx`select count(*)::int as n from plans`;
    if (n === 0) {
      for (const p of PLANES_POR_DEFECTO) {
        await tx`insert into plans (id, nombre, descripcion, limites, orden) values (${p.id}, ${p.nombre}, ${p.descripcion}, ${JSON.stringify(p.limites)}::jsonb, ${p.orden})`;
      }
    }
  });
}

/** Aplica migraciones una vez por proceso. Las páginas y rutas la llaman antes de consultar. */
export function asegurarDb(): Promise<void> {
  if ((process.env.AUTO_MIGRATE ?? "1") === "0") return Promise.resolve();
  if (!estado.listo) {
    estado.listo = migrar().catch((e) => {
      estado.listo = null;
      throw e;
    });
  }
  return estado.listo;
}
