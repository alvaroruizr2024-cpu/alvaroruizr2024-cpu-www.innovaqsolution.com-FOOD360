import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { registrarse } from "@/app/acciones-cuenta";
import { Formulario, Enviar } from "@/components/formulario";
import { Aviso, Campo, Entrada, Tarjeta } from "@/components/ui";
import { Logo, PieLegal } from "@/components/marca";
import { env } from "@/lib/env";

export const metadata = { title: "Crear cuenta" };

export default async function Registro() {
  if (await obtenerSesion()) redirect("/app");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-6">
        <Logo />
      </div>
      <Tarjeta className="w-full max-w-md p-6">
        <h1 className="text-xl font-bold">Crear su organización</h1>
        <p className="mt-1 text-[13px] text-tinta-3">Una organización agrupa a su equipo y a las empresas para las que prepara expedientes. Los datos de cada empresa quedan separados.</p>
        {env.registroAbierto ? (
          <Formulario accion={registrarse} className="mt-5 space-y-4">
            <Campo etiqueta="Nombre de la organización" ayuda="su empresa o consultora">
              <Entrada name="organizacion" required maxLength={120} />
            </Campo>
            <Campo etiqueta="Su nombre">
              <Entrada name="nombre" autoComplete="name" required maxLength={120} />
            </Campo>
            <Campo etiqueta="Correo de trabajo">
              <Entrada name="email" type="email" autoComplete="email" required />
            </Campo>
            <Campo etiqueta="Contraseña" ayuda="mínimo 10 caracteres">
              <Entrada name="password" type="password" autoComplete="new-password" required minLength={10} />
            </Campo>
            <label className="flex items-start gap-2 text-[13px] text-tinta-2">
              <input type="checkbox" name="acepta" required className="mt-0.5 h-4 w-4 accent-primario" />
              <span>
                Entiendo que el agente prepara borradores y matrices para revisión humana, que no firma ni presenta por mí, y acepto las condiciones de uso y el tratamiento de datos del operador.
              </span>
            </label>
            <Enviar className="w-full" pendiente="Creando…">
              Crear cuenta
            </Enviar>
          </Formulario>
        ) : (
          <Aviso tono="alerta" className="mt-5">
            El registro está cerrado. Pida una invitación al administrador de su organización.
          </Aviso>
        )}
        <p className="mt-5 text-center text-[13px] text-tinta-3">
          ¿Ya tiene cuenta?{" "}
          <Link href="/login" className="font-medium text-primario hover:underline">
            Ingresar
          </Link>
        </p>
      </Tarjeta>
      <div className="mt-6 max-w-md text-center">
        <PieLegal />
      </div>
    </main>
  );
}
