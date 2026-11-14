import Link from "next/link";
import { asegurarDb } from "@/db/client";
import { invitacionPorToken, ROL_ETIQUETA, type Rol } from "@/lib/cuentas";
import { aceptarInvitacionAccion } from "@/app/acciones-cuenta";
import { Formulario, Enviar } from "@/components/formulario";
import { Aviso, Campo, Entrada, Tarjeta } from "@/components/ui";
import { Logo } from "@/components/marca";

export const metadata = { title: "Invitación" };

export default async function Invitacion({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await asegurarDb();
  const inv = await invitacionPorToken(token);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-6">
        <Logo />
      </div>
      <Tarjeta className="w-full max-w-md p-6">
        {inv ? (
          <>
            <h1 className="text-xl font-bold">Únase a {inv.org}</h1>
            <p className="mt-1 text-[13px] text-tinta-3">
              Invitación para <strong>{inv.i.email}</strong> con rol «{ROL_ETIQUETA[inv.i.rol as Rol] ?? inv.i.rol}». Si ya tiene cuenta con ese correo, escriba su contraseña actual.
            </p>
            <Formulario accion={aceptarInvitacionAccion} className="mt-5 space-y-4">
              <input type="hidden" name="token" value={token} />
              <Campo etiqueta="Su nombre" ayuda="solo si es cuenta nueva">
                <Entrada name="nombre" autoComplete="name" maxLength={120} />
              </Campo>
              <Campo etiqueta="Contraseña" ayuda="mínimo 10 caracteres">
                <Entrada name="password" type="password" required minLength={10} />
              </Campo>
              <Enviar className="w-full">Aceptar invitación</Enviar>
            </Formulario>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold">Invitación no disponible</h1>
            <Aviso tono="alerta" className="mt-4">
              El enlace no existe, ya fue usado o venció. Pida al administrador que le envíe uno nuevo.
            </Aviso>
            <p className="mt-4 text-center text-[13px]">
              <Link href="/login" className="font-medium text-primario hover:underline">
                Ir a ingresar
              </Link>
            </p>
          </>
        )}
      </Tarjeta>
    </main>
  );
}
