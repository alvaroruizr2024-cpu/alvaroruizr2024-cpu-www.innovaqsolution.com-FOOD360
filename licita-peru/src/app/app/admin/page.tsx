import { notFound } from "next/navigation";
import { asc, desc, gte, sql as raw } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { requerirSesion } from "@/lib/auth";
import { formatoFechaHora } from "@/lib/fechas";
import type { PlanLimites } from "@/db/schema";
import { adminOrganizacionAccion, adminPlanAccion } from "@/app/app/acciones";
import { Enviar, Formulario } from "@/components/formulario";
import { SelectorAuto } from "@/components/nav";
import { Campo, Entrada, Insignia, Tarjeta, TituloSeccion } from "@/components/ui";

export const metadata = { title: "Plataforma" };

const CAMPOS_LIMITE: [keyof PlanLimites, string][] = [
  ["empresas", "Empresas"],
  ["procesosActivos", "Procesos activos"],
  ["miembros", "Miembros"],
  ["almacenamientoMb", "Almacenamiento (MB)"],
  ["presupuestoIaUsdMes", "IA por mes (USD)"],
];

export default async function Admin() {
  const s = await requerirSesion();
  if (!s.user.esAdminPlataforma) notFound();
  const inicioMes = raw`date_trunc('month', now() at time zone 'America/Lima') at time zone 'America/Lima'`;
  const [orgs, planes, consumo] = await Promise.all([
    db.select().from(schema.organizations).orderBy(desc(schema.organizations.createdAt)),
    db.select().from(schema.plans).orderBy(asc(schema.plans.orden)),
    db
      .select({ orgId: schema.usageEvents.orgId, usd: raw<number>`coalesce(sum(${schema.usageEvents.costoUsd}), 0)::float8` })
      .from(schema.usageEvents)
      .where(gte(schema.usageEvents.createdAt, inicioMes))
      .groupBy(schema.usageEvents.orgId),
  ]);
  const usd = new Map(consumo.map((c) => [c.orgId, c.usd]));
  return (
    <div className="mx-auto max-w-6xl px-4 py-7 lg:px-6">
      <TituloSeccion titulo="Administración de la plataforma" descripcion="Solo para el operador. Organizaciones clientes, planes y consumo estimado de IA del mes. Desde aquí no se ven los expedientes de los clientes." />

      <h3 className="mb-3 text-[15px] font-bold">Organizaciones ({orgs.length})</h3>
      <div className="overflow-x-auto rounded-xl border border-borde bg-superficie shadow-tarjeta">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-borde bg-fondo text-[12px] text-tinta-2">
              <th className="px-3 py-2 font-semibold">Organización</th>
              <th className="px-3 py-2 font-semibold">Alta</th>
              <th className="px-3 py-2 text-right font-semibold">IA este mes (USD)</th>
              <th className="px-3 py-2 font-semibold">Plan</th>
              <th className="px-3 py-2 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((o) => (
              <tr key={o.id} className="border-b border-borde/70 last:border-0">
                <td className="px-3 py-2 font-medium">{o.nombre}</td>
                <td className="px-3 py-2 whitespace-nowrap text-tinta-3">{formatoFechaHora(o.createdAt)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{(usd.get(o.id) ?? 0).toFixed(2)}</td>
                <td className="px-3 py-2">
                  <form action={adminOrganizacionAccion}>
                    <input type="hidden" name="orgId" value={o.id} />
                    <SelectorAuto name="planId" defaultValue={o.planId} etiqueta={`Plan de ${o.nombre}`} className="h-8 rounded-lg border border-borde-fuerte bg-superficie px-2 text-[13px]">
                      {planes.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </SelectorAuto>
                  </form>
                </td>
                <td className="px-3 py-2">
                  <form action={adminOrganizacionAccion} className="flex items-center gap-2">
                    <input type="hidden" name="orgId" value={o.id} />
                    <Insignia tono={o.estado === "activa" ? "ok" : "mal"}>{o.estado}</Insignia>
                    <button type="submit" name="estado" value={o.estado === "activa" ? "suspendida" : "activa"} className="text-[12.5px] font-medium text-primario hover:underline">
                      {o.estado === "activa" ? "Suspender" : "Reactivar"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-9 mb-1 text-[15px] font-bold">Planes</h3>
      <p className="mb-3 text-[13px] text-tinta-3">Usted fija el precio (texto libre que se muestra en la página comercial) y los límites. Un límite vacío significa «sin límite». Para crear un plan, use un identificador nuevo.</p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[...planes, null].map((p) => {
          const l = (p?.limites ?? {}) as Partial<PlanLimites>;
          return (
            <Tarjeta key={p?.id ?? "nuevo"} className="p-5">
              <Formulario accion={adminPlanAccion}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Campo etiqueta="Identificador" ayuda={p ? "no editable" : "minúsculas, sin espacios"}>
                    <Entrada name="id" defaultValue={p?.id} readOnly={Boolean(p)} required placeholder="nuevo-plan" />
                  </Campo>
                  <Campo etiqueta="Nombre">
                    <Entrada name="nombre" defaultValue={p?.nombre} required />
                  </Campo>
                  <Campo etiqueta="Precio (texto)" ayuda="p. ej. S/ 000 al mes + IGV">
                    <Entrada name="precioEtiqueta" defaultValue={p?.precioEtiqueta} />
                  </Campo>
                  <Campo etiqueta="Orden">
                    <Entrada name="orden" type="number" defaultValue={p?.orden ?? planes.length + 1} />
                  </Campo>
                  <Campo etiqueta="Descripción" className="sm:col-span-2">
                    <Entrada name="descripcion" defaultValue={p?.descripcion} />
                  </Campo>
                  {CAMPOS_LIMITE.map(([k, etiqueta]) => (
                    <Campo key={k} etiqueta={etiqueta}>
                      <Entrada name={k} type="number" min={0} step="any" defaultValue={l[k] ?? ""} placeholder="sin límite" />
                    </Campo>
                  ))}
                  <label className="flex items-center gap-2 pt-6 text-[13px] font-medium text-tinta-2">
                    <input type="checkbox" name="publico" defaultChecked={p?.publico ?? true} className="h-4 w-4 accent-primario" /> Visible en la página comercial
                  </label>
                </div>
                <div className="mt-4 flex justify-end">
                  <Enviar variante={p ? "secundario" : "primario"}>{p ? "Guardar plan" : "Crear plan"}</Enviar>
                </div>
              </Formulario>
            </Tarjeta>
          );
        })}
      </div>
    </div>
  );
}

