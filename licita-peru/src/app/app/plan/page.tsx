import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { requerirSesion } from "@/lib/auth";
import { env } from "@/lib/env";
import { planDe, usoDe } from "@/lib/planes";
import type { PlanLimites } from "@/db/schema";
import { Aviso, Insignia, Tarjeta, TituloSeccion } from "@/components/ui";

export const metadata = { title: "Plan y consumo" };

function Medidor({ etiqueta, uso, tope, unidad = "", decimales = 0 }: { etiqueta: string; uso: number; tope: number | null; unidad?: string; decimales?: number }) {
  const pct = tope ? Math.min(100, (uso / tope) * 100) : 0;
  const f = (n: number) => n.toLocaleString("es-PE", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="font-medium text-tinta-2">{etiqueta}</span>
        <span className="tabular-nums text-tinta-3">
          {unidad}
          {f(uso)} {tope === null ? "· sin límite" : `de ${unidad}${f(tope)}`}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-fondo" role="progressbar" aria-label={etiqueta} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full ${pct >= 100 ? "bg-mal" : pct >= 80 ? "bg-acento" : "bg-primario"}`} style={{ width: tope === null ? "0%" : `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function Plan() {
  const s = await requerirSesion();
  const [plan, uso, planes] = await Promise.all([planDe(s.org.id), usoDe(s.org.id), db.select().from(schema.plans).where(eq(schema.plans.publico, true)).orderBy(asc(schema.plans.orden))]);
  const l = plan.limites as PlanLimites;
  return (
    <div className="mx-auto max-w-5xl px-4 py-7 lg:px-6">
      <TituloSeccion titulo="Plan y consumo" descripcion="Límites del plan de su organización y uso del mes en curso (hora de Lima)." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <Tarjeta className="space-y-5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[12px] font-semibold tracking-wide text-tinta-3 uppercase">Plan actual</p>
              <p className="titulo text-2xl font-extrabold">{plan.nombre}</p>
            </div>
            <Insignia tono="info">{plan.precioEtiqueta}</Insignia>
          </div>
          <Medidor etiqueta="Empresas" uso={uso.empresas} tope={l.empresas} />
          <Medidor etiqueta="Procesos activos" uso={uso.procesosActivos} tope={l.procesosActivos} />
          <Medidor etiqueta="Miembros del equipo" uso={uso.miembros} tope={l.miembros} />
          <Medidor etiqueta="Almacenamiento de documentos (MB)" uso={uso.almacenamientoMb} tope={l.almacenamientoMb} decimales={1} />
          <Medidor etiqueta="Consumo estimado de IA este mes" uso={uso.iaUsdMes} tope={l.presupuestoIaUsdMes} unidad="USD " decimales={2} />
          <p className="text-[12.5px] text-tinta-3">
            El consumo de IA se estima a partir de los tokens de cada llamada al modelo ({uso.llamadasIaMes.toLocaleString("es-PE")} este mes) y de los precios de lista del proveedor; la factura real del operador puede diferir. Al alcanzar el tope, el agente se detiene y sus datos siguen disponibles.
          </p>
        </Tarjeta>
        <div className="space-y-3">
          {planes
            .filter((p) => p.id !== plan.id)
            .map((p) => (
              <Tarjeta key={p.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[14px] font-bold">{p.nombre}</p>
                  <span className="text-[12.5px] text-tinta-3">{p.precioEtiqueta}</span>
                </div>
                <p className="mt-1 text-[12.5px] text-tinta-3">{p.descripcion}</p>
              </Tarjeta>
            ))}
          <Aviso tono="info">Para cambiar de plan{env.contactoVentas ? `, escriba a ${env.contactoVentas}` : ", contacte al operador de la plataforma"}. El cambio lo aplica el operador y no afecta sus datos.</Aviso>
        </div>
      </div>
    </div>
  );
}
