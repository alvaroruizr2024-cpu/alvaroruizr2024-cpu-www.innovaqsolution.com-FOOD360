import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { iniciarSesion } from "@/app/acciones-cuenta";
import { Formulario, Enviar } from "@/components/formulario";
import { Campo, Entrada, Tarjeta } from "@/components/ui";
import { Logo, PieLegal } from "@/components/marca";
import { env } from "@/lib/env";

export const metadata = { title: "Ingresar" };

export default async function Login() {
  if (await obtenerSesion()) redirect("/app");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-6">
        <Logo />
      </div>
      <Tarjeta className="w-full max-w-sm p-6">
        <h1 className="text-xl font-bold">Ingresar</h1>
        <p className="mt-1 text-[13px] text-tinta-3">Acceda al espacio de trabajo de su organización.</p>
        <Formulario accion={iniciarSesion} className="mt-5 space-y-4">
          <Campo etiqueta="Correo">
            <Entrada name="email" type="email" autoComplete="email" required autoFocus />
          </Campo>
          <Campo etiqueta="Contraseña">
            <Entrada name="password" type="password" autoComplete="current-password" required />
          </Campo>
          <Enviar className="w-full" pendiente="Ingresando…">
            Ingresar
          </Enviar>
        </Formulario>
        {env.registroAbierto ? (
          <p className="mt-5 text-center text-[13px] text-tinta-3">
            ¿Aún no tiene cuenta?{" "}
            <Link href="/registro" className="font-medium text-primario hover:underline">
              Crear una organización
            </Link>
          </p>
        ) : null}
      </Tarjeta>
      <div className="mt-6 max-w-sm text-center">
        <PieLegal />
      </div>
    </main>
  );
}
