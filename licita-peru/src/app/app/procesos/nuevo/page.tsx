import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requerirPermiso } from "@/lib/auth";
import { listarEmpresas } from "@/lib/datos";
import { crearProcesoAccion } from "@/app/app/acciones";
import { Enviar, Formulario } from "@/components/formulario";
import { CamposProceso } from "@/components/proceso-form";
import { Aviso, Campo, Enlace, Selector, Tarjeta, TituloSeccion } from "@/components/ui";

export const metadata = { title: "Nuevo proceso" };

export default async function NuevoProceso({ searchParams }: { searchParams: Promise<{ empresa?: string }> }) {
  const s = await requerirPermiso("editar");
  const { empresa } = await searchParams;
  const empresas = await listarEmpresas(s.org.id);
  return (
    <div className="mx-auto max-w-3xl px-4 py-7 lg:px-6">
      <nav className="mb-3 flex items-center gap-1 text-[13px] text-tinta-3" aria-label="Ruta">
        <Link href="/app" className="hover:text-tinta hover:underline">
          Panel
        </Link>
        <ChevronRight size={14} aria-hidden />
        <span className="text-tinta-2">Nuevo proceso</span>
      </nav>
      <TituloSeccion titulo="Nuevo proceso" descripcion="Basta el nombre y la empresa. Lo demás puede completarlo el agente a partir de las bases, y usted corregirlo después." />
      {!empresas.length ? (
        <Aviso tono="alerta">
          Primero registre la empresa que participa. <Enlace href="/app/empresas" variante="secundario" tam="s" className="ml-2">Ir a Empresas</Enlace>
        </Aviso>
      ) : (
        <Tarjeta className="p-6">
          <Formulario accion={crearProcesoAccion}>
            <Campo etiqueta="Empresa que participa *" className="mb-4">
              <Selector name="companyId" required defaultValue={empresa ?? (empresas.length === 1 ? empresas[0].id : "")}>
                <option value="" disabled>
                  Elija una empresa
                </option>
                {empresas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.razonSocial}
                    {c.ruc ? ` — RUC ${c.ruc}` : ""}
                  </option>
                ))}
              </Selector>
            </Campo>
            <CamposProceso />
            <div className="mt-6 flex justify-end">
              <Enviar pendiente="Creando…">Crear proceso y subir documentos</Enviar>
            </div>
          </Formulario>
        </Tarjeta>
      )}
    </div>
  );
}
