import { asc, eq } from "drizzle-orm";
import {
  ArrowRight,
  BadgeCheck,
  Ban,
  Building2,
  CalendarClock,
  Check,
  CircleAlert,
  FileSpreadsheet,
  FileText,
  History,
  Landmark,
  ListChecks,
  Lock,
  ScanText,
  ShieldCheck,
  Stamp,
  Workflow,
} from "lucide-react";
import { asegurarDb, db, schema } from "@/db/client";
import { obtenerSesion } from "@/lib/auth";
import { env } from "@/lib/env";
import { Enlace, Insignia } from "@/components/ui";
import { Logo, PieLegal } from "@/components/marca";
import type { PlanLimites } from "@/db/schema";

export const dynamic = "force-dynamic";

const PASOS = [
  { t: "Suba lo que tiene", d: "Bases, invitación, cuestionario de precalificación, contrato, adendas y los documentos de su empresa. PDF, Word, Excel o escaneos." },
  { t: "El agente lee y ordena", d: "Identifica el régimen, descompone cada requisito en una obligación verificable y la enlaza con su evidencia y su página." },
  { t: "Usted ve las brechas", d: "Qué falta, quién lo cierra, cuánto cuesta y para cuándo. Las fechas críticas se calculan en días hábiles de Perú." },
  { t: "Revisa, aprueba y presenta", d: "Borradores en Word y PDF, matrices en Excel con fórmulas y una compuerta que no deja declarar «listo» lo que no lo está." },
];

const FUNCIONES = [
  { i: ListChecks, t: "Matriz maestra de requisitos", d: "Fuente y numeral, carácter eliminatorio o puntuable, evidencia admitida y disponible, responsable, vencimiento, estado y brecha. Editable por su equipo y exportable.", ancho: true },
  { i: Building2, t: "Precalificación y homologación privada", d: "Registro de proveedor, cuestionarios, debida diligencia, visita del evaluador y mantenimiento de la homologación, sin confundir estar inscrito con estar aprobado." },
  { i: Landmark, t: "Contratación pública", d: "Ruta bajo la Ley N.° 32069 y su Reglamento cuando corresponda, verificando el régimen aplicable a cada convocatoria en lugar de asumir la norma más reciente." },
  { i: ScanText, t: "Lectura visual de escaneos", d: "El agente ve las páginas originales para contrastar importes, fechas, firmas y sellos. La transcripción es solo auxiliar." },
  { i: CalendarClock, t: "Plazos en días hábiles", d: "Cálculo reproducible con feriados nacionales, en la zona horaria del portal, y calendario exportable a Google u Outlook." },
  { i: Workflow, t: "Especialistas y auditoría final", d: "Pasadas independientes del modelo con rol normativo, técnico, financiero o SSOMA, y una revisión crítica que busca causas de rechazo y queda registrada.", ancho: true },
  { i: FileSpreadsheet, t: "Presupuesto y flujo de caja", d: "Partidas con fuente del precio, totales por moneda con fórmulas y escenarios base y adverso. Lo interno nunca sale en el paquete del cliente." },
  { i: Stamp, t: "Aprobaciones explícitas", d: "Enviar, presentar, firmar o pagar requieren una aprobación con destinatario, versión, contenido, precio y efecto, resuelta por una persona autorizada." },
  { i: History, t: "Bitácora completa", d: "Quién cambió qué y cuándo, incluidas las acciones del agente. Originales, borradores y versión aprobada siempre separados." },
];

const NO_HACE = [
  "No inventa artículos, plazos, porcentajes ni datos de su empresa: lo desconocido queda como pendiente visible.",
  "No firma, no presenta en portales, no envía correos ni realiza pagos. Prepara el paquete y pide su aprobación.",
  "No fabrica constancias, certificados, poderes ni registros. Distingue lo que puede redactarse de lo que debe existir.",
  "No promete adjudicación ni presenta un porcentaje de avance como probabilidad de ganar.",
];

const FAQ = [
  { p: "¿Sirve para cualquier sector?", r: "Sí. El agente activa módulos según el objeto y el sector del proceso: construcción, minería y energía, salud, tecnología, alimentos, transporte, servicios generales, consultoría, suministro de bienes y cualquier otro. Los requisitos salen de sus documentos, no de una plantilla fija." },
  { p: "¿Puedo gestionar varias empresas?", r: "Sí. Una organización puede tener varias empresas y cada una sus procesos. El agente trabaja siempre sobre una sola empresa y un solo proceso; no puede leer documentos de otra, aunque pertenezcan a la misma cuenta." },
  { p: "¿Qué pasa con la confidencialidad de mis documentos?", r: "Los archivos se guardan separados por organización. Para analizarlos, su contenido se envía al proveedor del modelo de IA mediante su API; no se usa para otros clientes. El operador de la plataforma define la región y las condiciones de tratamiento de datos." },
  { p: "¿El agente reemplaza a mi abogado o a mi ingeniero?", r: "No. Acelera la lectura, la trazabilidad y la redacción, y deja a la vista lo que no pudo verificar. Las conclusiones legales, los diseños y los cálculos críticos requieren revisión profesional antes de firmarse." },
  { p: "¿Cómo se mide el consumo de IA?", r: "Cada organización ve su consumo estimado del mes y cada plan tiene un tope. Al llegar al tope, el agente se detiene y los datos siguen disponibles." },
];

function limite(v: number | null, sufijo: string) {
  return v === null ? `${sufijo} sin límite` : `${v.toLocaleString("es-PE")} ${sufijo}`;
}

export default async function Inicio() {
  await asegurarDb();
  const [sesion, planes] = await Promise.all([obtenerSesion(), db.select().from(schema.plans).where(eq(schema.plans.publico, true)).orderBy(asc(schema.plans.orden))]);
  const cta = sesion ? { href: "/app", t: "Ir a mi espacio de trabajo" } : env.registroAbierto ? { href: "/registro", t: "Crear cuenta" } : { href: "/login", t: "Ingresar" };

  return (
    <div className="bg-superficie">
      <header className="sticky top-0 z-30 border-b border-borde/70 bg-superficie/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden items-center gap-6 text-[13px] font-medium text-tinta-2 md:flex" aria-label="Secciones">
            <a href="#como" className="hover:text-tinta">Cómo funciona</a>
            <a href="#funciones" className="hover:text-tinta">Funciones</a>
            <a href="#limites" className="hover:text-tinta">Lo que no hace</a>
            <a href="#planes" className="hover:text-tinta">Planes</a>
          </nav>
          <div className="flex items-center gap-2">
            {!sesion ? (
              <Enlace href="/login" variante="fantasma" tam="s">
                Ingresar
              </Enlace>
            ) : null}
            <Enlace href={cta.href} tam="s">
              {cta.t}
            </Enlace>
          </div>
        </div>
      </header>

      {/* Portada */}
      <section className="relative overflow-hidden bg-tinta text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.55]" style={{ background: "radial-gradient(900px 420px at 85% -10%, #1d4ed8 0%, transparent 60%), radial-gradient(600px 300px at 0% 110%, #173fb3 0%, transparent 60%)" }} />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="min-w-0 animate-entrar">
            <Insignia className="border-white/20 bg-white/10 text-white">Contratación privada y pública · Perú · Todos los sectores</Insignia>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
              De las bases al expediente listo para firma, con cada requisito unido a su evidencia.
            </h1>
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-white/75">
              Un agente de IA lee sus bases y documentos, arma la matriz de requisitos, detecta las brechas y redacta los borradores. Su equipo revisa, aprueba y presenta, con trazabilidad de principio a fin.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Enlace href={cta.href} tam="l" className="bg-white !text-tinta hover:bg-white/90">
                {cta.t} <ArrowRight size={17} aria-hidden />
              </Enlace>
              <a href="#como" className="text-[14px] font-medium text-white/80 underline-offset-4 hover:text-white hover:underline">
                Ver cómo funciona
              </a>
            </div>
            <ul className="mt-9 grid max-w-xl gap-2 text-[13px] text-white/70 sm:grid-cols-2">
              {["Precalificación y homologación", "Licitaciones y concursos", "Varias empresas, datos separados", "Word, Excel y PDF listos para revisar"].map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <Check size={15} className="text-acento" aria-hidden /> {x}
                </li>
              ))}
            </ul>
          </div>

          {/* Maqueta del producto hecha con HTML: muestra la matriz y al agente trabajando */}
          <div className="min-w-0 animate-entrar lg:pt-4" style={{ animationDelay: "90ms" }} aria-hidden>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 shadow-elevada backdrop-blur">
              <div className="rounded-xl bg-superficie p-4 text-tinta">
                <div className="flex items-center justify-between">
                  <p className="titulo text-[13px] font-bold">Matriz maestra</p>
                  <Insignia tono="acento">
                    <CalendarClock size={12} /> Faltan 9 días hábiles
                  </Insignia>
                </div>
                <div className="mt-3 space-y-2 text-[12px]">
                  {[
                    ["Vigencia de poder, antigüedad ≤ 3 meses", "cumple verificado", "ok"],
                    ["Licencia de funcionamiento del local", "pendiente de evidencia", "alerta"],
                    ["Política de SSO aprobada y difundida", "pendiente de validación", "info"],
                    ["Tres servicios afines con conformidad", "cumple verificado", "ok"],
                  ].map(([r, e, tono]) => (
                    <div key={r} className="flex items-center justify-between gap-3 rounded-lg border border-borde px-3 py-2">
                      <span className="min-w-0 truncate">{r}</span>
                      <Insignia tono={tono as "ok"}>{e}</Insignia>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-lg bg-fondo p-3 text-[12px] leading-relaxed text-tinta-2">
                  <p className="mb-1 flex items-center gap-1.5 font-semibold text-tinta">
                    <span className="inline-block h-1.5 w-1.5 animate-pulso rounded-full bg-primario" /> Agente
                  </p>
                  La licencia no menciona la oficina 301. No puedo afirmar que la cubre: lo registré como brecha de prioridad alta y dejé una pregunta para Gerencia.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-primario">Cómo funciona</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight">Cuatro pasos, y en todos decide una persona.</h2>
        <ol className="mt-9 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PASOS.map((p, i) => (
            <li key={p.t} className="rounded-xl border border-borde bg-superficie p-5 shadow-tarjeta transition-transform duration-200 hover:-translate-y-0.5">
              <span className="titulo flex h-8 w-8 items-center justify-center rounded-lg bg-primario-suave text-[14px] font-extrabold text-primario">{i + 1}</span>
              <h3 className="mt-4 text-[15px] font-bold">{p.t}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-tinta-2">{p.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Funciones */}
      <section id="funciones" className="scroll-mt-16 border-y border-borde bg-fondo">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-primario">Funciones</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight">Todo el expediente en un solo lugar, desde la precalificación hasta la formalización.</h2>
          <div className="mt-9 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FUNCIONES.map((f) => (
              <article key={f.t} className={`rounded-xl border border-borde bg-superficie p-5 shadow-tarjeta ${f.ancho ? "lg:col-span-2" : ""}`}>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-tinta text-white">
                  <f.i size={18} aria-hidden />
                </span>
                <h3 className="mt-4 text-[15px] font-bold">{f.t}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-tinta-2">{f.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Límites */}
      <section id="limites" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-wider text-primario">Reglas de integridad</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Un expediente sirve si resiste una revisión. Por eso el agente tiene límites.</h2>
            <p className="mt-4 text-[14px] leading-relaxed text-tinta-2">
              La información de un cuestionario o de una oferta suele tener carácter de declaración jurada. La plataforma está hecha para que nada llegue al cliente sin respaldo y sin la aprobación de quien responde por ello.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { i: ShieldCheck, t: "Compuertas de estado", d: "«Listo para presentar» exige aprobación; «presentado» exige constancia." },
                { i: Lock, t: "Empresas aisladas", d: "El agente no cruza datos entre empresas ni entre clientes." },
                { i: BadgeCheck, t: "Fuente y fecha", d: "Cada conclusión normativa lleva norma, numeral, enlace y fecha de consulta." },
                { i: FileText, t: "Versiones separadas", d: "Original, borrador, revisado, aprobado y presentado no se mezclan." },
              ].map((x) => (
                <div key={x.t} className="rounded-xl border border-borde p-4">
                  <x.i size={18} className="text-primario" aria-hidden />
                  <p className="mt-2 text-[14px] font-semibold">{x.t}</p>
                  <p className="mt-0.5 text-[13px] text-tinta-3">{x.d}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-tinta p-7 text-white">
            <p className="flex items-center gap-2 text-[15px] font-bold">
              <Ban size={18} className="text-acento" aria-hidden /> Lo que el agente no hace
            </p>
            <ul className="mt-5 space-y-4">
              {NO_HACE.map((x) => (
                <li key={x} className="flex gap-3 text-[14px] leading-relaxed text-white/85">
                  <CircleAlert size={17} className="mt-0.5 shrink-0 text-acento" aria-hidden />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Planes */}
      <section id="planes" className="scroll-mt-16 border-y border-borde bg-fondo">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-primario">Planes</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight">Elija según cuántas empresas y procesos gestiona.</h2>
          <div className="mt-9 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {planes.map((p, i) => {
              const l = p.limites as PlanLimites;
              const destacado = planes.length > 1 && i === 1;
              return (
                <article key={p.id} className={`flex flex-col rounded-2xl border bg-superficie p-6 shadow-tarjeta ${destacado ? "border-primario ring-2 ring-primario/15" : "border-borde"}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-extrabold">{p.nombre}</h3>
                    {destacado ? <Insignia tono="info">Recomendado</Insignia> : null}
                  </div>
                  <p className="mt-1 min-h-10 text-[13px] text-tinta-3">{p.descripcion}</p>
                  <p className="titulo mt-4 text-2xl font-extrabold">{p.precioEtiqueta}</p>
                  <ul className="mt-5 flex-1 space-y-2.5 text-[13px] text-tinta-2">
                    {[limite(l.empresas, "empresas"), limite(l.procesosActivos, "procesos activos"), limite(l.miembros, "miembros del equipo"), limite(l.almacenamientoMb, "MB de documentos"), l.presupuestoIaUsdMes === null ? "Consumo de IA sin tope" : `Consumo de IA incluido hasta USD ${l.presupuestoIaUsdMes} al mes`].map((x) => (
                      <li key={x} className="flex items-start gap-2">
                        <Check size={15} className="mt-0.5 shrink-0 text-ok" aria-hidden /> {x}
                      </li>
                    ))}
                  </ul>
                  <Enlace href={cta.href} variante={destacado ? "primario" : "secundario"} className="mt-6 w-full">
                    {sesion ? "Ir a mi espacio" : "Empezar"}
                  </Enlace>
                </article>
              );
            })}
          </div>
          {env.contactoVentas ? <p className="mt-6 text-[13px] text-tinta-3">¿Necesita otra cosa? Escriba a {env.contactoVentas}.</p> : null}
        </div>
      </section>

      {/* Preguntas */}
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="text-3xl font-extrabold tracking-tight">Preguntas frecuentes</h2>
        <div className="mt-7 divide-y divide-borde rounded-xl border border-borde">
          {FAQ.map((f) => (
            <details key={f.p} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold">
                {f.p}
                <span className="text-tinta-3 transition-transform duration-200 group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <p className="mt-2 text-[14px] leading-relaxed text-tinta-2">{f.r}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="bg-tinta">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-12 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white">Empiece con el proceso que tiene abierto hoy.</h2>
            <p className="mt-1 text-[14px] text-white/70">Suba las bases y vea la matriz preliminar y las brechas antes de decidir si participa.</p>
          </div>
          <Enlace href={cta.href} tam="l" className="bg-white !text-tinta hover:bg-white/90">
            {cta.t} <ArrowRight size={17} aria-hidden />
          </Enlace>
        </div>
        <footer className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 md:flex-row md:items-start md:justify-between">
            <Logo claro />
            <div className="max-w-2xl">
              <PieLegal claro />
            </div>
          </div>
        </footer>
      </section>
    </div>
  );
}
