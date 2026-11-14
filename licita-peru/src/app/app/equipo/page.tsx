import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { requerirSesion } from "@/lib/auth";
import { puede, ROL_ETIQUETA, ROLES, type Rol } from "@/lib/cuentas";
import { formatoFechaHora } from "@/lib/fechas";
import { anularInvitacionAccion, cambiarRolAccion, quitarMiembroAccion } from "@/app/app/acciones";
import { Invitar } from "@/components/invitar";
import { SelectorAuto } from "@/components/nav";
import { Insignia, Tarjeta, TituloSeccion } from "@/components/ui";

export const metadata = { title: "Equipo" };

export default async function Equipo() {
  const s = await requerirSesion();
  const admin = puede(s.rol, "administrar");
  const [miembros, invitaciones] = await Promise.all([
    db
      .select({ id: schema.users.id, nombre: schema.users.nombre, email: schema.users.email, rol: schema.memberships.rol, desde: schema.memberships.createdAt })
      .from(schema.memberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
      .where(eq(schema.memberships.orgId, s.org.id))
      .orderBy(asc(schema.memberships.createdAt)),
    admin
      ? db
          .select()
          .from(schema.invitations)
          .where(and(eq(schema.invitations.orgId, s.org.id), isNull(schema.invitations.aceptadaAt), gt(schema.invitations.expiresAt, new Date())))
      : [],
  ]);
  return (
    <div className="mx-auto max-w-5xl px-4 py-7 lg:px-6">
      <TituloSeccion titulo="Equipo" descripcion={`Personas con acceso a ${s.org.nombre}. El acceso es por rol: los aprobadores resuelven las aprobaciones y los cambios de estado; los lectores solo consultan.`} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <Tarjeta className="divide-y divide-borde">
          {miembros.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold">
                  {m.nombre} {m.id === s.user.id ? <span className="font-normal text-tinta-3">(usted)</span> : null}
                </p>
                <p className="truncate text-[12.5px] text-tinta-3">
                  {m.email} · desde {formatoFechaHora(m.desde)}
                </p>
              </div>
              {admin && m.rol !== "propietario" && m.id !== s.user.id ? (
                <div className="flex items-center gap-2">
                  <form action={cambiarRolAccion}>
                    <input type="hidden" name="userId" value={m.id} />
                    <SelectorAuto name="rol" defaultValue={m.rol} etiqueta={`Rol de ${m.nombre}`} className="h-8 rounded-lg border border-borde-fuerte bg-superficie px-2 text-[13px]">
                      {ROLES.filter((r) => r !== "propietario").map((r) => (
                        <option key={r} value={r}>
                          {ROL_ETIQUETA[r]}
                        </option>
                      ))}
                    </SelectorAuto>
                  </form>
                  <form action={quitarMiembroAccion}>
                    <input type="hidden" name="userId" value={m.id} />
                    <button type="submit" className="text-[13px] font-medium text-mal hover:underline">
                      Quitar
                    </button>
                  </form>
                </div>
              ) : (
                <Insignia tono={m.rol === "propietario" ? "info" : "neutro"}>{ROL_ETIQUETA[m.rol as Rol] ?? m.rol}</Insignia>
              )}
            </div>
          ))}
          {invitaciones.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 bg-fondo/60 p-4">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium">{i.email}</p>
                <p className="text-[12.5px] text-tinta-3">
                  Invitación pendiente como {ROL_ETIQUETA[i.rol as Rol] ?? i.rol} · vence {formatoFechaHora(i.expiresAt)}
                </p>
              </div>
              <form action={anularInvitacionAccion}>
                <input type="hidden" name="id" value={i.id} />
                <button type="submit" className="text-[13px] font-medium text-mal hover:underline">
                  Anular
                </button>
              </form>
            </div>
          ))}
        </Tarjeta>
        {admin ? <Invitar /> : null}
      </div>
    </div>
  );
}
