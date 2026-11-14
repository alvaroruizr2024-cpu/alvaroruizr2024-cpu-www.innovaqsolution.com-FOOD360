import { NextResponse } from "next/server";
import { asegurarDb, sql } from "@/db/client";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Comprobación de salud para balanceadores y plataformas de contenedores. No expone datos. */
export async function GET() {
  try {
    await asegurarDb();
    await sql`select 1`;
    return NextResponse.json({ ok: true, baseDeDatos: "ok", agente: env.agenteConfigurado ? "configurado" : "sin clave" });
  } catch {
    return NextResponse.json({ ok: false, baseDeDatos: "sin conexión" }, { status: 503 });
  }
}
