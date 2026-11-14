import { Enlace } from "@/components/ui";
import { Logo } from "@/components/marca";

export default function NoEncontrada() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Logo />
      <h1 className="mt-8 text-2xl font-extrabold">No encontramos esta página</h1>
      <p className="mt-2 max-w-md text-[14px] text-tinta-3">El enlace no existe o pertenece a otra organización. Si llegó aquí desde un enlace compartido, pida acceso al administrador de esa organización.</p>
      <Enlace href="/app" className="mt-6">
        Ir a mi espacio de trabajo
      </Enlace>
    </main>
  );
}
