import { cerrarSesionAccion } from "@/app/acciones-cuenta";
import { Boton, Tarjeta } from "@/components/ui";
import { Logo } from "@/components/marca";
import { env } from "@/lib/env";

export const metadata = { title: "Cuenta suspendida" };

export default function Suspendida() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-6">
        <Logo />
      </div>
      <Tarjeta className="w-full max-w-md p-6 text-center">
        <h1 className="text-xl font-bold">Organización suspendida</h1>
        <p className="mt-2 text-[13px] text-tinta-3">El acceso de esta organización está suspendido. Sus datos se conservan. {env.contactoVentas ? `Escriba a ${env.contactoVentas} para reactivarla.` : "Contacte al operador de la plataforma para reactivarla."}</p>
        <form action={cerrarSesionAccion} className="mt-5">
          <Boton variante="secundario">Cerrar sesión</Boton>
        </form>
      </Tarjeta>
    </main>
  );
}
