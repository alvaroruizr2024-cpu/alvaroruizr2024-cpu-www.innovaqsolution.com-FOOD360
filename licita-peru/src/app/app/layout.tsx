import { Building2, CreditCard, LayoutDashboard, LogOut, Settings, Users } from "lucide-react";
import { requerirSesion } from "@/lib/auth";
import { organizacionesDe, puede, ROL_ETIQUETA } from "@/lib/cuentas";
import { cambiarOrganizacionAccion, cerrarSesionAccion } from "@/app/acciones-cuenta";
import { Logo } from "@/components/marca";
import { NavEnlace, SelectorAuto } from "@/components/nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requerirSesion();
  const orgs = await organizacionesDe(s.user.id);
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-tinta text-white">
        <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
          <Logo claro href="/app" />
          <nav className="ml-2 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" aria-label="Principal">
            <NavEnlace href="/app" exacto>
              <LayoutDashboard size={15} aria-hidden /> Panel
            </NavEnlace>
            <NavEnlace href="/app/empresas">
              <Building2 size={15} aria-hidden /> Empresas
            </NavEnlace>
            <NavEnlace href="/app/equipo">
              <Users size={15} aria-hidden /> Equipo
            </NavEnlace>
            <NavEnlace href="/app/plan">
              <CreditCard size={15} aria-hidden /> Plan y consumo
            </NavEnlace>
            {s.user.esAdminPlataforma ? (
              <NavEnlace href="/app/admin">
                <Settings size={15} aria-hidden /> Plataforma
              </NavEnlace>
            ) : null}
          </nav>
          <div className="flex shrink-0 items-center gap-3">
            {orgs.length > 1 ? (
              <form action={cambiarOrganizacionAccion}>
                <SelectorAuto name="orgId" defaultValue={s.org.id} etiqueta="Organización" className="h-8 max-w-44 rounded-lg border border-white/20 bg-white/10 px-2 text-[13px] text-white [&>option]:text-tinta">
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nombre}
                    </option>
                  ))}
                </SelectorAuto>
              </form>
            ) : (
              <span className="hidden max-w-44 truncate text-[13px] text-white/70 md:block" title={s.org.nombre}>
                {s.org.nombre}
              </span>
            )}
            <span className="hidden text-right leading-tight lg:block">
              <span className="block max-w-40 truncate text-[13px] font-medium">{s.user.nombre}</span>
              <span className="block text-[11px] text-white/60">{ROL_ETIQUETA[s.rol]}</span>
            </span>
            <form action={cerrarSesionAccion}>
              <button type="submit" aria-label="Cerrar sesión" title="Cerrar sesión" className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white">
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </div>
      </header>
      {!puede(s.rol, "editar") ? <div className="border-b border-borde bg-acento-suave px-4 py-1.5 text-center text-[12px] text-alerta">Su rol es de solo lectura: puede consultar y descargar, no modificar.</div> : null}
      <main>{children}</main>
    </div>
  );
}
