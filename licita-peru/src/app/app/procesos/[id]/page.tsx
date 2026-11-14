import Link from "next/link";
import { notFound } from "next/navigation";
import { inArray } from "drizzle-orm";
import { CalendarClock, ChevronRight, Download, FileSpreadsheet } from "lucide-react";
import { db, schema } from "@/db/client";
import { vistaConversacion } from "@/agent/vista";
import { requerirSesion } from "@/lib/auth";
import { puede } from "@/lib/cuentas";
import { estadoProceso } from "@/lib/catalogos";
import { bitacora, listarAprobaciones, listarConversaciones, listarDocumentos, listarEntregables, NoEncontrado, proceso, todosLosRegistros } from "@/lib/datos";
import { env } from "@/lib/env";
import { formatoFechaHora } from "@/lib/fechas";
import { TABLAS, tablaDef } from "@/lib/registros";
import { DocumentosLista } from "@/components/documentos-lista";
import { PanelAgente } from "@/components/panel-agente";
import { SubirDocumentos } from "@/components/subir-documentos";
import { TablaRegistros } from "@/components/tabla-registros";
import { claseBoton, Insignia, TituloSeccion } from "@/components/ui";
import { Aprobaciones, Bitacora, Entregables, Preguntas, Resumen } from "./secciones";

export const metadata = { title: "Proceso" };

const PESTANAS: { id: string; n: string }[] = [
  { id: "resumen", n: "Resumen" },
  { id: "documentos", n: "Documentos" },
  { id: "requisitos", n: "Matriz" },
  { id: "brechas", n: "Brechas" },
  { id: "evidencias", n: "Evidencias" },
  { id: "regimen", n: "Régimen" },
  { id: "hitos", n: "Calendario" },
  { id: "preguntas", n: "Datos críticos" },
  { id: "entregables", n: "Entregables" },
  { id: "consultas", n: "Consultas" },
  { id: "presupuesto", n: "Presupuesto" },
  { id: "flujo_caja", n: "Flujo de caja" },
  { id: "negociacion", n: "Negociación" },
  { id: "obligaciones", n: "Obligaciones" },
  { id: "aprobaciones", n: "Aprobaciones" },
  { id: "revisiones", n: "Revisiones" },
  { id: "bitacora", n: "Bitácora" },
];
const TABLAS_GENERICAS = new Set(TABLAS.map((t) => t.id).filter((t) => t !== "preguntas"));

export default async function PaginaProceso({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; c?: string }> }) {
  const s = await requerirSesion();
  const { id } = await params;
  const sp = await searchParams;
  const { p, c } = await proceso(s.org.id, id).catch((e) => {
    if (e instanceof NoEncontrado) notFound();
    throw e;
  });
  const tab = PESTANAS.some((x) => x.id === sp.tab) ? sp.tab! : "resumen";
  const a = { orgId: s.org.id, companyId: p.companyId, processId: p.id };
  const editar = puede(s.rol, "editar");
  const aprobar = puede(s.rol, "aprobar");

  const [registros, aprobaciones, conversaciones] = await Promise.all([todosLosRegistros(a), listarAprobaciones(s.org.id, p.id), listarConversaciones(s.org.id, p.id)]);
  const de = (t: string) => registros.filter((r) => r.tabla === t);
  const pendientes = {
    preguntas: de("preguntas").filter((q) => q.data.estado === "abierta").length,
    aprobaciones: aprobaciones.filter((x) => x.estado === "pendiente").length,
    brechas: de("brechas").filter((b) => b.data.estado !== "cerrada").length,
  };

  // Sesión del agente: la pedida, o la más reciente; "nueva" abre una en blanco.
  const convActual = sp.c === "nueva" ? null : (conversaciones.find((x) => x.id === sp.c) ?? conversaciones[0] ?? null);
  const items = convActual ? await vistaConversacion(s.org.id, convActual.id) : [];
  const base = `/app/procesos/${p.id}?${convActual ? `c=${convActual.id}&` : ""}`;
  const est = estadoProceso(p.estado);

  let contenido: React.ReactNode;
  if (tab === "resumen") {
    contenido = <Resumen p={p} registros={registros} aprobacionesPendientes={pendientes.aprobaciones} puedeEditar={editar} puedeAprobar={aprobar} base={base} />;
  } else if (tab === "documentos") {
    const docs = await listarDocumentos(s.org.id, a);
    contenido = (
      <>
        <TituloSeccion titulo="Documentos" descripcion="Bases, anexos, contrato, adendas y evidencias. Los originales se conservan intactos y con su huella SHA-256; el agente solo analiza lo que está aquí y en el expediente corporativo de la empresa." />
        {editar ? (
          <div className="mb-4">
            <SubirDocumentos processId={p.id} companyId={p.companyId} maxMb={env.maxArchivoMb} />
          </div>
        ) : null}
        <DocumentosLista
          puedeEditar={editar}
          docs={docs.map((d) => ({ id: d.id, nombre: d.nombre, categoria: d.categoria, version: d.version, descripcion: d.descripcion, mime: d.mime, tamano: d.tamano, paginas: d.paginas, textoEstado: d.textoEstado, origen: d.origen, corporativo: d.processId === null, fecha: formatoFechaHora(d.createdAt, p.zonaHoraria), sha: d.sha256.slice(0, 12) }))}
        />
      </>
    );
  } else if (tab === "preguntas") {
    contenido = (
      <>
        <TituloSeccion titulo="Datos críticos faltantes" descripcion="Preguntas del agente sobre datos que no encontró en los documentos. Sus respuestas quedan registradas y el agente las lee en su siguiente revisión." />
        <Preguntas processId={p.id} preguntas={de("preguntas")} puedeEditar={editar} />
      </>
    );
  } else if (tab === "entregables") {
    contenido = (
      <>
        <TituloSeccion titulo="Entregables" descripcion="Documentos redactados para revisión. Un borrador no es un documento firmado ni emitido por terceros; no puede aprobarse mientras tenga campos pendientes." />
        <Entregables entregables={await listarEntregables(s.org.id, p.id)} zona={p.zonaHoraria} puedeEditar={editar} puedeAprobar={aprobar} />
      </>
    );
  } else if (tab === "aprobaciones") {
    contenido = (
      <>
        <TituloSeccion titulo="Aprobaciones" descripcion="Autorizaciones explícitas para acciones externas: a quién, qué versión, qué contenido, qué precio y con qué efecto. Aprobar no ejecuta la acción; autoriza a hacerla." />
        <Aprobaciones aprobaciones={aprobaciones} zona={p.zonaHoraria} puedeAprobar={aprobar} />
      </>
    );
  } else if (tab === "bitacora") {
    const eventos = await bitacora(s.org.id, p.id);
    const idsUsuarios = [...new Set(eventos.filter((e) => e.actorTipo === "usuario").map((e) => e.actorId))].filter((x) => /^[0-9a-f-]{36}$/.test(x));
    const usuarios = idsUsuarios.length ? await db.select({ id: schema.users.id, nombre: schema.users.nombre }).from(schema.users).where(inArray(schema.users.id, idsUsuarios)) : [];
    contenido = (
      <>
        <TituloSeccion titulo="Bitácora" descripcion="Registro de solo anexar de los últimos 200 cambios del expediente." />
        <Bitacora eventos={eventos} zona={p.zonaHoraria} nombres={new Map(usuarios.map((u) => [u.id, u.nombre]))} />
      </>
    );
  } else if (TABLAS_GENERICAS.has(tab)) {
    const def = tablaDef(tab);
    contenido = (
      <>
        <TituloSeccion
          titulo={def.nombre}
          descripcion={def.descripcion}
          acciones={
            <>
              {tab === "hitos" ? (
                <a href={`/api/procesos/${p.id}/exportar?formato=ics`} className={claseBoton("secundario", "s")}>
                  <CalendarClock size={14} aria-hidden /> Calendario (.ics)
                </a>
              ) : null}
              <a href={`/api/procesos/${p.id}/exportar?formato=xlsx`} className={claseBoton("secundario", "s")} title="Todas las matrices, con fórmulas. Incluye datos internos.">
                <FileSpreadsheet size={14} aria-hidden /> Excel completo
              </a>
              <a href={`/api/procesos/${p.id}/exportar?formato=xlsx&internos=0`} className={claseBoton("fantasma", "s")} title="Sin costos internos, límites de negociación ni hojas de trabajo interno.">
                <Download size={14} aria-hidden /> Excel sin internos
              </a>
            </>
          }
        />
        <TablaRegistros
          def={def}
          processId={p.id}
          companyId={p.companyId}
          puedeEditar={editar}
          filas={de(tab).map((f) => ({ codigo: f.codigo, data: f.data, ambito: f.processId ? ("proceso" as const) : ("empresa" as const), actualizadoPor: f.actualizadoPor }))}
        />
      </>
    );
  }

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-w-0 px-4 pt-5 pb-24 lg:px-6 xl:pb-10">
        <nav className="mb-2 flex items-center gap-1 text-[13px] text-tinta-3" aria-label="Ruta">
          <Link href="/app" className="hover:text-tinta hover:underline">
            Panel
          </Link>
          <ChevronRight size={14} aria-hidden />
          <Link href={`/app/empresas/${c.id}`} className="max-w-56 truncate hover:text-tinta hover:underline">
            {c.razonSocial}
          </Link>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold leading-tight break-words lg:text-2xl">{p.nombre}</h1>
            <p className="mt-1 text-[13px] text-tinta-3">
              {p.cliente || "Cliente sin registrar"}
              {p.codigo ? ` · ${p.codigo}` : ""}
              {c.ruc ? ` · ${c.razonSocial} (RUC ${c.ruc})` : ""}
            </p>
          </div>
          <Insignia tono={est.tono === "ok" ? "ok" : est.tono === "mal" ? "mal" : est.tono === "info" ? "info" : "neutro"} className="text-[13px]">
            {est.nombre}
          </Insignia>
        </div>

        <div className="-mx-4 mt-4 overflow-x-auto border-b border-borde px-4 lg:-mx-6 lg:px-6">
          <nav className="flex gap-1" aria-label="Secciones del expediente">
            {PESTANAS.map((x) => {
              const n = x.id === "preguntas" ? pendientes.preguntas : x.id === "aprobaciones" ? pendientes.aprobaciones : x.id === "brechas" ? pendientes.brechas : 0;
              const activa = x.id === tab;
              return (
                <Link
                  key={x.id}
                  href={`${base}tab=${x.id}`}
                  aria-current={activa ? "page" : undefined}
                  className={`relative flex h-10 shrink-0 items-center gap-1.5 px-3 text-[13px] font-medium whitespace-nowrap transition-colors ${activa ? "text-primario after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primario" : "text-tinta-2 hover:text-tinta"}`}
                >
                  {x.n}
                  {n ? <span className={`rounded-full px-1.5 text-[11px] leading-[18px] font-semibold ${x.id === "brechas" ? "bg-fondo text-tinta-2" : "bg-acento text-tinta"}`}>{n}</span> : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-5">{contenido}</div>
      </div>

      <PanelAgente
        processId={p.id}
        conversacionId={convActual?.id ?? null}
        inicial={items}
        sesiones={conversaciones.map((x) => ({ id: x.id, titulo: x.titulo, fecha: formatoFechaHora(x.updatedAt, p.zonaHoraria) }))}
        tab={tab}
        configurado={env.agenteConfigurado}
        puedeEscribir={editar}
        modoPrueba={process.env.AGENT_FAKE === "1"}
      />
    </div>
  );
}

