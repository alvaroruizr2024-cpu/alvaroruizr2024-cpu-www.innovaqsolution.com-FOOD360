import Link from "next/link";
import { and, eq, inArray, sql as raw } from "drizzle-orm";
import { ArrowRight, Building2, CalendarClock, FolderOpen, Plus } from "lucide-react";
import { db, schema } from "@/db/client";
import { requerirSesion } from "@/lib/auth";
import { puede } from "@/lib/cuentas";
import { estadoProceso, tipoProceso } from "@/lib/catalogos";
import { listarEmpresas, listarProcesos } from "@/lib/datos";
import { ahoraEn, diasEntre, formatoFechaHora } from "@/lib/fechas";
import { Enlace, Insignia, Tarjeta, TituloSeccion, Vacio } from "@/components/ui";

export const metadata = { title: "Panel" };

export default async function Panel() {
  const s = await requerirSesion();
  const [empresas, procesos] = await Promise.all([listarEmpresas(s.org.id), listarProcesos(s.org.id)]);
  const ids = procesos.map((x) => x.p.id);
  const [preguntas, aprobaciones] = ids.length
    ? await Promise.all([
        db
          .select({ processId: schema.registros.processId, n: raw<number>`count(*)::int` })
          .from(schema.registros)
          .where(and(eq(schema.registros.orgId, s.org.id), eq(schema.registros.tabla, "preguntas"), raw`${schema.registros.data}->>'estado' = 'abierta'`))
          .groupBy(schema.registros.processId),
        db
          .select({ processId: schema.aprobaciones.processId, n: raw<number>`count(*)::int` })
          .from(schema.aprobaciones)
          .where(and(eq(schema.aprobaciones.orgId, s.org.id), eq(schema.aprobaciones.estado, "pendiente"), inArray(schema.aprobaciones.processId, ids)))
          .groupBy(schema.aprobaciones.processId),
      ])
    : [[], []];
  const nPreg = new Map(preguntas.map((x) => [x.processId, x.n]));
  const nAprob = new Map(aprobaciones.map((x) => [x.processId, x.n]));
  const editar = puede(s.rol, "editar");

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 lg:px-6">
      <TituloSeccion
        titulo={`Hola, ${s.user.nombre.split(" ")[0]}`}
        descripcion="Procesos en los que trabaja su organización, con su plazo y lo que espera una decisión suya."
        acciones={
          editar && empresas.length ? (
            <Enlace href="/app/procesos/nuevo">
              <Plus size={16} aria-hidden /> Nuevo proceso
            </Enlace>
          ) : null
        }
      />

      {!empresas.length ? (
        <Vacio icono={<Building2 size={20} />} titulo="Empiece registrando la empresa que participa">
          <p>Cada empresa tiene su ficha corporativa, sus documentos reutilizables y sus procesos. Los datos de una empresa nunca se mezclan con los de otra.</p>
          {editar ? (
            <Enlace href="/app/empresas" className="mt-4">
              Registrar empresa <ArrowRight size={15} aria-hidden />
            </Enlace>
          ) : null}
        </Vacio>
      ) : !procesos.length ? (
        <Vacio icono={<FolderOpen size={20} />} titulo="Aún no hay procesos">
          <p>Cree un proceso para una convocatoria, una precalificación o una homologación. Si todavía no hay convocatoria, cree uno de tipo «expediente corporativo» para preparar la documentación reutilizable.</p>
          {editar ? (
            <Enlace href="/app/procesos/nuevo" className="mt-4">
              Crear el primer proceso <ArrowRight size={15} aria-hidden />
            </Enlace>
          ) : null}
        </Vacio>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {procesos.map(({ p, empresa }) => {
            const est = estadoProceso(p.estado);
            const hoy = ahoraEn(p.zonaHoraria).fecha;
            const dias = p.fechaLimite ? diasEntre(hoy, ahoraEn(p.zonaHoraria, p.fechaLimite).fecha) : null;
            return (
              <Link key={p.id} href={`/app/procesos/${p.id}`} className="group block">
                <Tarjeta className="h-full p-5 transition-[transform,box-shadow] duration-200 group-hover:-translate-y-0.5 group-hover:shadow-elevada">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium text-tinta-3">{empresa}</p>
                      <h3 className="mt-0.5 line-clamp-2 text-[16px] font-bold leading-snug">{p.nombre}</h3>
                    </div>
                    <Insignia tono={est.tono === "ok" ? "ok" : est.tono === "mal" ? "mal" : est.tono === "info" ? "info" : "neutro"}>{est.nombre}</Insignia>
                  </div>
                  <p className="mt-2 text-[13px] text-tinta-2">
                    {p.cliente || "Cliente sin registrar"} · {tipoProceso(p.tipo)}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {p.fechaLimite ? (
                      <Insignia tono={dias !== null && dias < 0 ? "mal" : dias !== null && dias <= 5 ? "acento" : "neutro"}>
                        <CalendarClock size={12} aria-hidden /> {formatoFechaHora(p.fechaLimite, p.zonaHoraria)} · {dias !== null && dias < 0 ? `venció hace ${-dias} d` : `faltan ${dias} d calendario`}
                      </Insignia>
                    ) : (
                      <Insignia>Sin fecha límite registrada</Insignia>
                    )}
                    {nPreg.get(p.id) ? <Insignia tono="alerta">{nPreg.get(p.id)} pregunta(s) por responder</Insignia> : null}
                    {nAprob.get(p.id) ? <Insignia tono="info">{nAprob.get(p.id)} aprobación(es) pendiente(s)</Insignia> : null}
                  </div>
                </Tarjeta>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
