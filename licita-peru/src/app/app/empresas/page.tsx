import Link from "next/link";
import { Building2 } from "lucide-react";
import { requerirSesion } from "@/lib/auth";
import { puede } from "@/lib/cuentas";
import { SECTORES } from "@/lib/catalogos";
import { listarEmpresas, listarProcesos } from "@/lib/datos";
import { crearEmpresaAccion } from "@/app/app/acciones";
import { Enviar, Formulario } from "@/components/formulario";
import { Campo, Entrada, Selector, Tarjeta, TituloSeccion, Vacio } from "@/components/ui";

export const metadata = { title: "Empresas" };

export default async function Empresas() {
  const s = await requerirSesion();
  const [empresas, procesos] = await Promise.all([listarEmpresas(s.org.id), listarProcesos(s.org.id)]);
  const porEmpresa = new Map<string, number>();
  for (const { p } of procesos) porEmpresa.set(p.companyId, (porEmpresa.get(p.companyId) ?? 0) + 1);
  const editar = puede(s.rol, "editar");
  return (
    <div className="mx-auto max-w-6xl px-4 py-7 lg:px-6">
      <TituloSeccion titulo="Empresas" descripcion="Proveedores, contratistas, consultoras o consorcios para los que su organización prepara expedientes. Cada una mantiene su ficha y sus documentos por separado." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {!empresas.length ? (
            <Vacio icono={<Building2 size={20} />} titulo="Sin empresas registradas">
              Registre la primera con el formulario. Solo la razón social es obligatoria; el agente puede completar la ficha desde los documentos.
            </Vacio>
          ) : (
            empresas.map((c) => (
              <Link key={c.id} href={`/app/empresas/${c.id}`} className="group block">
                <Tarjeta className="flex items-center justify-between gap-4 p-4 transition-shadow duration-200 group-hover:shadow-elevada">
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-bold">{c.razonSocial}</h3>
                    <p className="mt-0.5 truncate text-[13px] text-tinta-3">
                      {c.ruc ? `RUC ${c.ruc}` : "RUC sin registrar"} · {c.modalidad}
                      {c.sector ? ` · ${c.sector}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-[13px] text-tinta-2">{porEmpresa.get(c.id) ?? 0} proceso(s)</span>
                </Tarjeta>
              </Link>
            ))
          )}
        </div>
        {editar ? (
          <Tarjeta className="h-fit p-5">
            <h3 className="text-[15px] font-bold">Registrar empresa</h3>
            <Formulario accion={crearEmpresaAccion} className="mt-4 space-y-3">
              <Campo etiqueta="Razón social *">
                <Entrada name="razonSocial" required maxLength={200} />
              </Campo>
              <Campo etiqueta="RUC" ayuda="11 dígitos">
                <Entrada name="ruc" inputMode="numeric" pattern="\d{11}" maxLength={11} />
              </Campo>
              <Campo etiqueta="Modalidad">
                <Selector name="modalidad" defaultValue="individual">
                  <option value="individual">Individual</option>
                  <option value="consorcio">Consorcio</option>
                </Selector>
              </Campo>
              <Campo etiqueta="Sector principal">
                <Selector name="sector" defaultValue="">
                  <option value="">—</option>
                  {SECTORES.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </Selector>
              </Campo>
              <Campo etiqueta="Representante legal">
                <Entrada name="representante" maxLength={160} />
              </Campo>
              <Enviar className="w-full">Registrar</Enviar>
            </Formulario>
          </Tarjeta>
        ) : null}
      </div>
    </div>
  );
}
