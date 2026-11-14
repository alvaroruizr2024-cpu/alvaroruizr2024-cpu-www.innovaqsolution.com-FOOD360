import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Plus } from "lucide-react";
import { requerirSesion } from "@/lib/auth";
import { puede } from "@/lib/cuentas";
import { estadoProceso, SECTORES, tipoProceso } from "@/lib/catalogos";
import { empresa, listarDocumentos, listarProcesos, listarRegistros, NoEncontrado } from "@/lib/datos";
import { env } from "@/lib/env";
import { formatoFechaHora } from "@/lib/fechas";
import { tablaDef } from "@/lib/registros";
import { actualizarEmpresaAccion } from "@/app/app/acciones";
import { DocumentosLista } from "@/components/documentos-lista";
import { FichaLibre } from "@/components/ficha";
import { Enviar, Formulario } from "@/components/formulario";
import { SubirDocumentos } from "@/components/subir-documentos";
import { TablaRegistros } from "@/components/tabla-registros";
import { Campo, Enlace, Entrada, Insignia, Selector, Tarjeta, TituloSeccion, Vacio } from "@/components/ui";

export const metadata = { title: "Empresa" };

export default async function Empresa({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerirSesion();
  const { id } = await params;
  const c = await empresa(s.org.id, id).catch((e) => {
    if (e instanceof NoEncontrado) notFound();
    throw e;
  });
  const a = { orgId: s.org.id, companyId: c.id, processId: null };
  const [procesos, docs, evidencias] = await Promise.all([listarProcesos(s.org.id, c.id), listarDocumentos(s.org.id, a), listarRegistros(a, "evidencias", "empresa")]);
  const editar = puede(s.rol, "editar");

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 lg:px-6">
      <nav className="mb-3 flex items-center gap-1 text-[13px] text-tinta-3" aria-label="Ruta">
        <Link href="/app/empresas" className="hover:text-tinta hover:underline">
          Empresas
        </Link>
        <ChevronRight size={14} aria-hidden />
        <span className="truncate text-tinta-2">{c.razonSocial}</span>
      </nav>
      <TituloSeccion
        titulo={c.razonSocial}
        descripcion={`${c.ruc ? `RUC ${c.ruc}` : "RUC sin registrar"} · ${c.modalidad}${c.sector ? ` · ${c.sector}` : ""}`}
        acciones={
          editar ? (
            <Enlace href={`/app/procesos/nuevo?empresa=${c.id}`}>
              <Plus size={16} aria-hidden /> Nuevo proceso
            </Enlace>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-8">
          <section>
            <h3 className="mb-3 text-[15px] font-bold">Procesos</h3>
            {!procesos.length ? (
              <Vacio titulo="Sin procesos">Cree uno para una convocatoria, o uno de tipo «expediente corporativo» para preparar la documentación reutilizable.</Vacio>
            ) : (
              <div className="space-y-2">
                {procesos.map(({ p }) => (
                  <Link key={p.id} href={`/app/procesos/${p.id}`} className="group block">
                    <Tarjeta className="flex flex-wrap items-center justify-between gap-3 p-4 transition-shadow group-hover:shadow-elevada">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold">{p.nombre}</p>
                        <p className="text-[12.5px] text-tinta-3">
                          {p.cliente || "Cliente sin registrar"} · {tipoProceso(p.tipo)}
                          {p.fechaLimite ? ` · límite ${formatoFechaHora(p.fechaLimite, p.zonaHoraria)}` : ""}
                        </p>
                      </div>
                      <Insignia tono={estadoProceso(p.estado).tono === "ok" ? "ok" : estadoProceso(p.estado).tono === "info" ? "info" : "neutro"}>{estadoProceso(p.estado).nombre}</Insignia>
                    </Tarjeta>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-[15px] font-bold">Expediente corporativo: documentos</h3>
            <p className="mt-0.5 mb-3 text-[13px] text-tinta-3">Documentos reutilizables de la empresa (ficha RUC, poderes, estados financieros, certificados). Están disponibles en todos sus procesos.</p>
            {editar ? (
              <div className="mb-3">
                <SubirDocumentos processId={null} companyId={c.id} maxMb={env.maxArchivoMb} />
              </div>
            ) : null}
            <DocumentosLista
              puedeEditar={editar}
              docs={docs.map((d) => ({ id: d.id, nombre: d.nombre, categoria: d.categoria, version: d.version, descripcion: d.descripcion, mime: d.mime, tamano: d.tamano, paginas: d.paginas, textoEstado: d.textoEstado, origen: d.origen, corporativo: true, fecha: formatoFechaHora(d.createdAt), sha: d.sha256.slice(0, 12) }))}
            />
          </section>

          <section>
            <h3 className="text-[15px] font-bold">Expediente corporativo: evidencias</h3>
            <p className="mt-0.5 mb-3 text-[13px] text-tinta-3">Registro de evidencias con titular, emisor, vigencia, alcance y ubicación exacta. Una antigüedad de emisión no es un vencimiento salvo que exista esa regla.</p>
            <TablaRegistros def={tablaDef("evidencias")} processId={null} companyId={c.id} puedeEditar={editar} filas={evidencias.map((f) => ({ codigo: f.codigo, data: f.data, ambito: "empresa" as const, actualizadoPor: f.actualizadoPor }))} />
          </section>

          {Object.keys(c.perfil).length ? (
            <section>
              <h3 className="mb-1 text-[15px] font-bold">Ficha corporativa</h3>
              <p className="mb-3 text-[13px] text-tinta-3">Datos que el agente extrajo de los documentos de la empresa, con su fuente.</p>
              <Tarjeta className="px-5 py-2">
                <FichaLibre datos={c.perfil} />
              </Tarjeta>
            </section>
          ) : null}
        </div>

        <Tarjeta className="h-fit p-5">
          <h3 className="text-[15px] font-bold">Datos de la empresa</h3>
          <Formulario accion={actualizarEmpresaAccion} className="mt-4">
            <input type="hidden" name="id" value={c.id} />
            <fieldset disabled={!editar} className="space-y-3">
              <Campo etiqueta="Razón social *">
                <Entrada name="razonSocial" required defaultValue={c.razonSocial} maxLength={200} />
              </Campo>
              <Campo etiqueta="RUC" ayuda="11 dígitos">
                <Entrada name="ruc" inputMode="numeric" pattern="\d{11}" maxLength={11} defaultValue={c.ruc} />
              </Campo>
              <Campo etiqueta="Modalidad">
                <Selector name="modalidad" defaultValue={c.modalidad}>
                  <option value="individual">Individual</option>
                  <option value="consorcio">Consorcio</option>
                </Selector>
              </Campo>
              <Campo etiqueta="Sector principal">
                <Selector name="sector" defaultValue={c.sector}>
                  <option value="">—</option>
                  {c.sector && !(SECTORES as readonly string[]).includes(c.sector) ? <option>{c.sector}</option> : null}
                  {SECTORES.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </Selector>
              </Campo>
              <Campo etiqueta="Representante legal">
                <Entrada name="representante" defaultValue={c.representante} maxLength={160} />
              </Campo>
              {editar ? <Enviar className="w-full">Guardar</Enviar> : null}
            </fieldset>
          </Formulario>
        </Tarjeta>
      </div>
    </div>
  );
}
