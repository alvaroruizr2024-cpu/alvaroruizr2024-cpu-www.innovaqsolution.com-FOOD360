// Secciones del espacio de trabajo que no son tablas genéricas.
import Link from "next/link";
import { CalendarClock, Check, CircleAlert, Download, FileDown, FileText, ShieldCheck, X } from "lucide-react";
import { accionAprobacion, ESTADOS_PROCESO, estadoProceso, tipoEntregable, tipoProceso } from "@/lib/catalogos";
import { ahoraEn, diasEntre, formatoFecha, formatoFechaHora, utcALocal } from "@/lib/fechas";
import { ESTADOS_REQUISITO } from "@/lib/registros";
import { actualizarProcesoAccion, cambiarEstadoAccion, estadoEntregableAccion, resolverAprobacionAccion, responderPreguntaAccion } from "@/app/app/acciones";
import { FichaLibre } from "@/components/ficha";
import { Enviar, Formulario } from "@/components/formulario";
import { Markdown } from "@/components/markdown";
import { CamposProceso } from "@/components/proceso-form";
import { Area, Aviso, Campo, claseBoton, Entrada, Insignia, Selector, Tarjeta, tonoDeEstado, Vacio } from "@/components/ui";
import type { schema } from "@/db/client";

type Proceso = typeof schema.processes.$inferSelect;
type Reg = { tabla: string; codigo: string; data: Record<string, unknown> };

const BARRA: Record<string, string> = {
  "cumple verificado": "bg-ok",
  "no aplica con fundamento": "bg-tinta-3/50",
  "pendiente de validación": "bg-primario",
  "pendiente de evidencia": "bg-acento",
  "no cumple": "bg-mal",
};

/* ───────────────────────── Resumen ───────────────────────── */

export function Resumen({ p, registros, aprobacionesPendientes, puedeEditar, puedeAprobar, base }: { p: Proceso; registros: Reg[]; aprobacionesPendientes: number; puedeEditar: boolean; puedeAprobar: boolean; base: string }) {
  const de = (t: string) => registros.filter((r) => r.tabla === t);
  const requisitos = de("requisitos");
  const cuenta = new Map<string, number>();
  for (const r of requisitos) cuenta.set(String(r.data.estado), (cuenta.get(String(r.data.estado)) ?? 0) + 1);
  const exigiblesSinCumplir = requisitos.filter((r) => ["eliminatorio", "obligatorio"].includes(String(r.data.caracter)) && !["cumple verificado", "no aplica con fundamento"].includes(String(r.data.estado)));
  const brechasAltas = de("brechas").filter((b) => b.data.prioridad === "alta" && b.data.estado !== "cerrada");
  const preguntas = de("preguntas").filter((q) => q.data.estado === "abierta");
  const hoy = ahoraEn(p.zonaHoraria).fecha;
  const hitos = de("hitos")
    .filter((h) => typeof h.data.fecha === "string" && h.data.fecha && h.data.estado !== "cumplido" && h.data.estado !== "no aplica")
    .sort((a, b) => String(a.data.fecha).localeCompare(String(b.data.fecha)))
    .slice(0, 6);
  const dias = p.fechaLimite ? diasEntre(hoy, ahoraEn(p.zonaHoraria, p.fechaLimite).fecha) : null;
  const est = estadoProceso(p.estado);
  const { decision_participar, fundamento_decision, pendientes_de_firma, ...restoFicha } = p.ficha as Record<string, unknown>;
  const firmas = Array.isArray(pendientes_de_firma) ? (pendientes_de_firma as string[]) : [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Tarjeta className="p-5">
          <p className="text-[12px] font-semibold tracking-wide text-tinta-3 uppercase">Estado del expediente</p>
          <p className="titulo mt-1.5 text-xl font-extrabold">{est.nombre}</p>
          <p className="mt-1 text-[12.5px] text-tinta-3">{tipoProceso(p.tipo)}{p.etapa ? ` · etapa: ${p.etapa}` : ""}</p>
          {firmas.length ? <p className="mt-2 text-[12.5px] text-alerta">Pendientes de firma identificados: {firmas.join(", ")}</p> : null}
        </Tarjeta>
        <Tarjeta className="p-5">
          <p className="text-[12px] font-semibold tracking-wide text-tinta-3 uppercase">Plazo</p>
          {p.fechaLimite ? (
            <>
              <p className={`titulo mt-1.5 text-xl font-extrabold ${dias !== null && dias < 0 ? "text-mal" : dias !== null && dias <= 5 ? "text-alerta" : ""}`}>{dias !== null && dias < 0 ? `Venció hace ${-dias} día(s)` : `Faltan ${dias} día(s) calendario`}</p>
              <p className="mt-1 text-[12.5px] text-tinta-3">
                {formatoFechaHora(p.fechaLimite, p.zonaHoraria)} · {p.zonaHoraria}
              </p>
            </>
          ) : (
            <>
              <p className="titulo mt-1.5 text-xl font-extrabold text-tinta-3">Sin fecha límite</p>
              <p className="mt-1 text-[12.5px] text-tinta-3">Regístrela en la ficha o pídale al agente que la tome de las bases.</p>
            </>
          )}
        </Tarjeta>
        <Tarjeta className="p-5">
          <p className="text-[12px] font-semibold tracking-wide text-tinta-3 uppercase">Decisión de participar</p>
          <p className="titulo mt-1.5 text-xl font-extrabold">{typeof decision_participar === "string" && decision_participar ? decision_participar : "Sin evaluar"}</p>
          <p className="mt-1 line-clamp-3 text-[12.5px] text-tinta-3">{typeof fundamento_decision === "string" && fundamento_decision ? fundamento_decision : "El agente la propone según elegibilidad, recursos, plazo y brechas; decide la empresa."}</p>
        </Tarjeta>
      </div>

      <Tarjeta className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[15px] font-bold">Requisitos por estado</h3>
          <Link href={`${base}tab=requisitos`} className="text-[13px] font-medium text-primario hover:underline">
            Ver la matriz
          </Link>
        </div>
        {requisitos.length ? (
          <>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-fondo" role="img" aria-label="Distribución de requisitos por estado">
              {ESTADOS_REQUISITO.map((e) => (cuenta.get(e) ? <div key={e} className={BARRA[e]} style={{ width: `${((cuenta.get(e) ?? 0) / requisitos.length) * 100}%` }} title={`${e}: ${cuenta.get(e)}`} /> : null))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-tinta-2">
              {ESTADOS_REQUISITO.map((e) => (
                <span key={e} className="inline-flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${BARRA[e]}`} aria-hidden /> {e}: <strong className="tabular-nums">{cuenta.get(e) ?? 0}</strong>
                </span>
              ))}
            </div>
            <p className="mt-3 text-[12.5px] text-tinta-3">
              Denominador: {requisitos.length} requisito(s) registrados en la matriz. Este conteo no es un puntaje del comprador ni una probabilidad de adjudicación.
            </p>
            {exigiblesSinCumplir.length ? (
              <Aviso tono="mal" className="mt-3">
                <strong>{exigiblesSinCumplir.length} requisito(s) eliminatorio(s) u obligatorio(s) sin cumplir.</strong> Mientras existan, el expediente no puede declararse listo: {exigiblesSinCumplir.slice(0, 8).map((r) => r.codigo).join(", ")}
                {exigiblesSinCumplir.length > 8 ? "…" : ""}
              </Aviso>
            ) : (
              <Aviso tono="ok" className="mt-3">
                No hay requisitos eliminatorios u obligatorios sin cumplir en la matriz registrada.
              </Aviso>
            )}
          </>
        ) : (
          <p className="mt-2 text-[13px] text-tinta-3">La matriz está vacía. Suba las bases y pida al agente que inicie el diagnóstico.</p>
        )}
      </Tarjeta>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Tarjeta className="p-5">
          <h3 className="flex items-center gap-2 text-[15px] font-bold">
            <CircleAlert size={16} className="text-mal" aria-hidden /> Requiere atención
          </h3>
          <ul className="mt-3 space-y-2 text-[13px]">
            <li className="flex items-center justify-between gap-3">
              <Link href={`${base}tab=brechas`} className="hover:underline">Brechas de prioridad alta sin cerrar</Link>
              <Insignia tono={brechasAltas.length ? "mal" : "ok"}>{brechasAltas.length}</Insignia>
            </li>
            <li className="flex items-center justify-between gap-3">
              <Link href={`${base}tab=preguntas`} className="hover:underline">Preguntas del agente por responder</Link>
              <Insignia tono={preguntas.length ? "alerta" : "ok"}>{preguntas.length}</Insignia>
            </li>
            <li className="flex items-center justify-between gap-3">
              <Link href={`${base}tab=aprobaciones`} className="hover:underline">Aprobaciones pendientes</Link>
              <Insignia tono={aprobacionesPendientes ? "info" : "ok"}>{aprobacionesPendientes}</Insignia>
            </li>
          </ul>
          {brechasAltas.length ? (
            <ul className="mt-3 space-y-1.5 border-t border-borde pt-3 text-[12.5px] text-tinta-2">
              {brechasAltas.slice(0, 5).map((b) => (
                <li key={b.codigo} className="line-clamp-2">
                  <strong>{b.codigo}</strong> · {String(b.data.brecha ?? "")}
                </li>
              ))}
            </ul>
          ) : null}
        </Tarjeta>
        <Tarjeta className="p-5">
          <h3 className="flex items-center gap-2 text-[15px] font-bold">
            <CalendarClock size={16} className="text-alerta" aria-hidden /> Próximas fechas
          </h3>
          {hitos.length ? (
            <ul className="mt-3 space-y-2 text-[13px]">
              {hitos.map((h) => {
                const d = diasEntre(hoy, String(h.data.fecha));
                return (
                  <li key={h.codigo} className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      {h.data.critico ? <span className="mr-1 text-alerta" title="Crítico">●</span> : null}
                      {String(h.data.hito)}
                      {h.data.tipo && h.data.tipo !== "dato" ? <span className="text-tinta-3"> ({String(h.data.tipo)})</span> : null}
                    </span>
                    <Insignia tono={d < 0 ? "mal" : d <= 3 ? "acento" : "neutro"}>
                      {formatoFecha(String(h.data.fecha))} · {d < 0 ? `hace ${-d} d` : d === 0 ? "hoy" : `en ${d} d`}
                    </Insignia>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-[13px] text-tinta-3">Sin hitos registrados. El agente puede calcularlos en días hábiles a partir de las bases.</p>
          )}
        </Tarjeta>
      </div>

      {puedeAprobar ? (
        <Tarjeta className="p-5">
          <h3 className="flex items-center gap-2 text-[15px] font-bold">
            <ShieldCheck size={16} className="text-primario" aria-hidden /> Cambiar el estado del expediente
          </h3>
          <p className="mt-1 text-[12.5px] text-tinta-3">La plataforma verifica las condiciones de cada estado y explica qué falta. «Presentado» exige una constancia subida; los resultados externos se registran con la comunicación del cliente.</p>
          <Formulario accion={cambiarEstadoAccion} className="mt-3">
            <input type="hidden" name="processId" value={p.id} />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr_1fr_auto] md:items-end">
              <Campo etiqueta="Nuevo estado">
                <Selector name="estado" defaultValue={p.estado}>
                  {ESTADOS_PROCESO.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </Selector>
              </Campo>
              <Campo etiqueta="Fundamento">
                <Entrada name="fundamento" maxLength={500} placeholder="Qué se verificó o qué comunicación lo sustenta" />
              </Campo>
              <Campo etiqueta="Pendientes solo de firma" ayuda="códigos, separados por coma">
                <Entrada name="pendientesDeFirma" placeholder="REQ-07, REQ-12" defaultValue={firmas.join(", ")} />
              </Campo>
              <Enviar variante="oscuro">Aplicar</Enviar>
            </div>
          </Formulario>
        </Tarjeta>
      ) : null}

      <Tarjeta className="p-5">
        <details open={!p.cliente && !p.objeto}>
          <summary className="cursor-pointer text-[15px] font-bold">Ficha del proceso</summary>
          <Formulario accion={actualizarProcesoAccion} className="mt-4">
            <input type="hidden" name="id" value={p.id} />
            <fieldset disabled={!puedeEditar}>
              <CamposProceso
                v={{ nombre: p.nombre, cliente: p.cliente, codigo: p.codigo, tipo: p.tipo, sector: p.sector, objeto: p.objeto, lugar: p.lugar, etapa: p.etapa, portal: p.portal, zonaHoraria: p.zonaHoraria, fechaLimiteLocal: p.fechaLimite ? utcALocal(p.fechaLimite, p.zonaHoraria) : "" }}
              />
              {puedeEditar ? (
                <div className="mt-4 flex justify-end">
                  <Enviar>Guardar ficha</Enviar>
                </div>
              ) : null}
            </fieldset>
          </Formulario>
        </details>
        {Object.keys(restoFicha).length ? (
          <div className="mt-4 border-t border-borde pt-3">
            <p className="mb-1 text-[13px] font-semibold text-tinta-2">Registrado por el agente</p>
            <FichaLibre datos={restoFicha} />
          </div>
        ) : null}
      </Tarjeta>
    </div>
  );
}

/* ───────────────────────── Datos críticos (preguntas) ───────────────────────── */

export function Preguntas({ processId, preguntas, puedeEditar }: { processId: string; preguntas: Reg[]; puedeEditar: boolean }) {
  if (!preguntas.length) return <Vacio titulo="El agente no ha planteado preguntas">Cuando le falte un dato crítico que no esté en los documentos, lo preguntará aquí (máximo cinco a la vez) y seguirá con lo demás.</Vacio>;
  const abiertas = preguntas.filter((q) => q.data.estado === "abierta");
  const resto = preguntas.filter((q) => q.data.estado !== "abierta");
  return (
    <div className="space-y-4">
      {abiertas.map((q) => (
        <Tarjeta key={q.codigo} className="border-alerta/30 p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[14px] font-semibold">{String(q.data.pregunta)}</p>
            <Insignia tono="alerta">{q.codigo} · abierta</Insignia>
          </div>
          {q.data.motivo ? <p className="mt-1 text-[12.5px] text-tinta-3">Por qué importa: {String(q.data.motivo)}</p> : null}
          {puedeEditar ? (
            <Formulario accion={responderPreguntaAccion} className="mt-3">
              <input type="hidden" name="processId" value={processId} />
              <input type="hidden" name="codigo" value={q.codigo} />
              <Area name="respuesta" rows={2} maxLength={4000} placeholder="Respuesta de la empresa. Si no lo sabe, dígalo: el agente lo dejará como pendiente en vez de suponer." aria-label={`Respuesta a ${q.codigo}`} />
              <div className="mt-2 flex justify-end gap-2">
                <button type="submit" name="descartar" value="1" formNoValidate className={claseBoton("fantasma", "s")}>
                  No corresponde
                </button>
                <Enviar tam="s">Responder</Enviar>
              </div>
            </Formulario>
          ) : null}
        </Tarjeta>
      ))}
      {resto.length ? (
        <Tarjeta className="divide-y divide-borde">
          {resto.map((q) => (
            <div key={q.codigo} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13.5px] font-medium">{String(q.data.pregunta)}</p>
                <Insignia tono={tonoDeEstado(q.data.estado)}>{q.codigo} · {String(q.data.estado)}</Insignia>
              </div>
              {q.data.respuesta ? <p className="mt-1 text-[13px] whitespace-pre-line text-tinta-2">{String(q.data.respuesta)}</p> : null}
            </div>
          ))}
        </Tarjeta>
      ) : null}
    </div>
  );
}

/* ───────────────────────── Entregables ───────────────────────── */

type Entregable = typeof schema.entregables.$inferSelect;

export function Entregables({ entregables, zona, puedeEditar, puedeAprobar }: { entregables: Entregable[]; zona: string; puedeEditar: boolean; puedeAprobar: boolean }) {
  if (!entregables.length) return <Vacio icono={<FileText size={20} />} titulo="Sin entregables">Pida al agente el diagnóstico, la propuesta técnica, las consultas o los anexos en borrador. Cada uno se descarga en Word y PDF y queda versionado.</Vacio>;
  const grupos = new Map<string, Entregable[]>();
  for (const e of entregables) grupos.set(`${e.tipo}|${e.titulo}`, [...(grupos.get(`${e.tipo}|${e.titulo}`) ?? []), e]);
  return (
    <div className="space-y-4">
      {[...grupos.values()].map((versiones) => {
        const e = versiones[0];
        const pendientes = (e.contenidoMd.match(/\[PENDIENTE/gi) ?? []).length;
        return (
          <Tarjeta key={e.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-tinta-3">{tipoEntregable(e.tipo)}</p>
                <h3 className="text-[15px] font-bold break-words">{e.titulo}</h3>
                <p className="mt-0.5 text-[12.5px] text-tinta-3">
                  Versión {e.version} · {e.creadoPor === "agente" ? "redactado por el agente" : "creado por el equipo"} · {formatoFechaHora(e.createdAt, zona)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Insignia tono={e.destino === "cliente" ? "info" : "neutro"}>{e.destino === "cliente" ? "para el cliente" : "uso interno"}</Insignia>
                <Insignia tono={tonoDeEstado(e.estado)}>{e.estado}</Insignia>
                {pendientes ? <Insignia tono="alerta">{pendientes} pendiente(s)</Insignia> : null}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a href={`/api/entregables/${e.id}?formato=docx`} className={claseBoton("secundario", "s")}>
                <FileDown size={14} aria-hidden /> Word
              </a>
              <a href={`/api/entregables/${e.id}?formato=pdf`} className={claseBoton("secundario", "s")}>
                <FileDown size={14} aria-hidden /> PDF
              </a>
              <a href={`/api/entregables/${e.id}?formato=md`} className={claseBoton("fantasma", "s")}>
                <Download size={14} aria-hidden /> Texto
              </a>
              {puedeEditar ? (
                <Formulario accion={estadoEntregableAccion} className="ml-auto flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={e.id} />
                  {e.estado !== "borrador" ? (
                    <button type="submit" name="estado" value="borrador" className={claseBoton("fantasma", "s")}>
                      Volver a borrador
                    </button>
                  ) : null}
                  {e.estado === "borrador" ? (
                    <button type="submit" name="estado" value="revisado" className={claseBoton("secundario", "s")}>
                      Marcar revisado
                    </button>
                  ) : null}
                  {e.estado !== "aprobado" && puedeAprobar ? (
                    <button type="submit" name="estado" value="aprobado" className={claseBoton("oscuro", "s")}>
                      <Check size={14} aria-hidden /> Aprobar
                    </button>
                  ) : null}
                </Formulario>
              ) : null}
            </div>
            <details className="mt-3 border-t border-borde pt-3">
              <summary className="cursor-pointer text-[13px] font-medium text-primario">Ver contenido</summary>
              <Markdown className="mt-3 text-[13.5px]">{e.contenidoMd}</Markdown>
            </details>
            {versiones.length > 1 ? (
              <p className="mt-3 text-[12.5px] text-tinta-3">
                Versiones anteriores:{" "}
                {versiones.slice(1).map((v, i) => (
                  <span key={v.id}>
                    {i ? " · " : ""}
                    <a href={`/api/entregables/${v.id}?formato=docx`} className="text-primario hover:underline">
                      v{v.version} ({v.estado})
                    </a>
                  </span>
                ))}
              </p>
            ) : null}
          </Tarjeta>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Aprobaciones ───────────────────────── */

type Aprobacion = typeof schema.aprobaciones.$inferSelect;

export function Aprobaciones({ aprobaciones, zona, puedeAprobar }: { aprobaciones: Aprobacion[]; zona: string; puedeAprobar: boolean }) {
  if (!aprobaciones.length) return <Vacio icono={<ShieldCheck size={20} />} titulo="Sin solicitudes de aprobación">Antes de enviar, presentar, firmar, aceptar condiciones o pagar, el agente pedirá aquí una aprobación concreta. La plataforma nunca ejecuta esas acciones por su cuenta.</Vacio>;
  return (
    <div className="space-y-4">
      {aprobaciones.map((a) => (
        <Tarjeta key={a.id} className={`p-5 ${a.estado === "pendiente" ? "border-primario/40" : ""}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[12px] font-medium text-tinta-3">{accionAprobacion(a.accion)}</p>
              <h3 className="text-[15px] font-bold">{a.descripcion}</h3>
            </div>
            <Insignia tono={tonoDeEstado(a.estado)}>{a.estado}</Insignia>
          </div>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
            {[
              ["Destinatario", a.destinatario],
              ["Versión", a.versionRef],
              ["Contenido", a.contenido],
              ["Precio", a.precio],
              ["Efecto", a.efecto],
              ["Solicitada", `${a.solicitadaPor === "agente" ? "por el agente" : "por el equipo"} · ${formatoFechaHora(a.createdAt, zona)}`],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[12px] font-semibold text-tinta-3">{k}</dt>
                  <dd className="whitespace-pre-line break-words">{v}</dd>
                </div>
              ))}
          </dl>
          {a.estado !== "pendiente" ? (
            <p className="mt-3 border-t border-borde pt-3 text-[12.5px] text-tinta-3">
              Resuelta el {formatoFechaHora(a.resueltaAt, zona)}
              {a.comentario ? ` · ${a.comentario}` : ""}
            </p>
          ) : puedeAprobar ? (
            <Formulario accion={resolverAprobacionAccion} className="mt-3 border-t border-borde pt-3">
              <input type="hidden" name="id" value={a.id} />
              <Entrada name="comentario" maxLength={500} placeholder="Comentario (obligatorio si rechaza)" aria-label="Comentario" />
              <div className="mt-2 flex justify-end gap-2">
                <button type="submit" name="decision" value="rechazada" className={claseBoton("peligro", "s")}>
                  <X size={14} aria-hidden /> Rechazar
                </button>
                <button type="submit" name="decision" value="aprobada" className={claseBoton("oscuro", "s")}>
                  <Check size={14} aria-hidden /> Aprobar
                </button>
              </div>
            </Formulario>
          ) : (
            <p className="mt-3 border-t border-borde pt-3 text-[12.5px] text-tinta-3">Pendiente de un usuario con rol de aprobador.</p>
          )}
        </Tarjeta>
      ))}
    </div>
  );
}

/* ───────────────────────── Bitácora ───────────────────────── */

type Evento = typeof schema.auditLog.$inferSelect;
const ACTOR: Record<string, string> = { usuario: "Persona", agente: "Agente", sistema: "Sistema" };

export function Bitacora({ eventos, zona, nombres }: { eventos: Evento[]; zona: string; nombres: Map<string, string> }) {
  if (!eventos.length) return <Vacio titulo="Sin actividad registrada">Aquí queda cada cambio del expediente: quién, qué y cuándo, incluidas las acciones del agente.</Vacio>;
  return (
    <div className="overflow-x-auto rounded-xl border border-borde bg-superficie shadow-tarjeta">
      <table className="w-full min-w-[680px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-borde bg-fondo text-[12px] text-tinta-2">
            <th className="px-3 py-2 font-semibold">Fecha ({zona})</th>
            <th className="px-3 py-2 font-semibold">Quién</th>
            <th className="px-3 py-2 font-semibold">Acción</th>
            <th className="px-3 py-2 font-semibold">Detalle</th>
          </tr>
        </thead>
        <tbody>
          {eventos.map((e) => (
            <tr key={e.id} className="border-b border-borde/70 align-top last:border-0">
              <td className="px-3 py-2 whitespace-nowrap tabular-nums text-tinta-2">{formatoFechaHora(e.createdAt, zona)}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                <Insignia tono={e.actorTipo === "agente" ? "info" : e.actorTipo === "sistema" ? "acento" : "neutro"}>{ACTOR[e.actorTipo] ?? e.actorTipo}</Insignia>
                <span className="ml-1.5 text-tinta-3">{e.actorTipo === "usuario" ? (nombres.get(e.actorId) ?? "") : e.actorId}</span>
              </td>
              <td className="px-3 py-2 font-medium whitespace-nowrap">{e.accion}</td>
              <td className="max-w-md px-3 py-2 text-[12px] break-words text-tinta-3">{Object.keys(e.detalle).length ? JSON.stringify(e.detalle) : e.entidad}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
