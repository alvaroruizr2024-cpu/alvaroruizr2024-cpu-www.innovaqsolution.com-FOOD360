"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, Check, CircleX, LoaderCircle, MessagesSquare, Plus, Send, Square, X } from "lucide-react";
import type { ItemChat } from "@/agent/vista";
import type { EventoUI } from "@/agent/run";
import { Markdown } from "./markdown";

type Sesion = { id: string; titulo: string; fecha: string };

const SUGERENCIAS = [
  "Inicia el diagnóstico: revisa los documentos, identifica el régimen y los requisitos, arma la matriz de evidencias y brechas, y dime solo los datos críticos que falten.",
  "Calcula las fechas críticas del proceso y regístralas en el calendario con su regla o fuente.",
  "Haz la revisión crítica final con un especialista independiente y dime qué bloquea declarar el expediente listo.",
];

export function PanelAgente({
  processId,
  conversacionId,
  inicial,
  sesiones,
  tab,
  configurado,
  puedeEscribir,
  modoPrueba,
}: {
  processId: string;
  conversacionId: string | null;
  inicial: ItemChat[];
  sesiones: Sesion[];
  tab: string;
  configurado: boolean;
  puedeEscribir: boolean;
  modoPrueba: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState<ItemChat[]>(inicial);
  const [convId, setConvId] = useState<string | null>(conversacionId);
  const [texto, setTexto] = useState("");
  const [activo, setActivo] = useState(false);
  const [estado, setEstado] = useState("");
  const [costo, setCosto] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false); // solo pantallas angostas
  const fin = useRef<HTMLDivElement>(null);
  const corte = useRef(true);
  const aborto = useRef<AbortController | null>(null);

  // Al cambiar de sesión, el servidor entrega otro historial.
  useEffect(() => {
    setItems(inicial);
    setConvId(conversacionId);
    setCosto(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversacionId]);

  useEffect(() => {
    fin.current?.scrollIntoView({ block: "end" });
  }, [items, estado]);

  const aplicar = useCallback(
    (e: EventoUI) => {
      switch (e.t) {
        case "conversacion":
          setConvId(e.id);
          window.history.replaceState(null, "", `?tab=${tab}&c=${e.id}`);
          break;
        case "texto":
          setEstado("");
          setItems((prev) => {
            const ult = prev[prev.length - 1];
            if (!corte.current && ult?.tipo === "asistente") return [...prev.slice(0, -1), { tipo: "asistente", texto: ult.texto + e.d }];
            corte.current = false;
            return [...prev, { tipo: "asistente", texto: e.d }];
          });
          break;
        case "pensando":
          setEstado("Razonando…");
          break;
        case "paso":
          setEstado(e.d);
          break;
        case "corte":
          corte.current = true;
          break;
        case "herramienta":
          corte.current = true;
          setEstado("");
          setItems((prev) => [...prev, { tipo: "paso", id: e.id, etiqueta: e.etiqueta, ok: null }]);
          break;
        case "herramienta_fin":
          setItems((prev) => prev.map((x) => (x.tipo === "paso" && x.id === e.id ? { ...x, ok: e.ok } : x)));
          break;
        case "aviso":
        case "error":
          corte.current = true;
          setItems((prev) => [...prev, { tipo: e.t, texto: e.mensaje }]);
          break;
        case "fin":
          setEstado("");
          if (e.costoUsd > 0) setCosto(`Consumo estimado de este turno: USD ${e.costoUsd.toFixed(4)} · ${(e.tokens.entrada + e.tokens.salida).toLocaleString("es-PE")} tokens`);
          router.refresh(); // las pestañas reflejan lo que el agente guardó
          break;
      }
    },
    [router, tab],
  );

  async function enviar(mensaje: string) {
    const limpio = mensaje.trim();
    if (!limpio || activo) return;
    setTexto("");
    setCosto(null);
    setActivo(true);
    setEstado("Conectando con el agente…");
    corte.current = true;
    setItems((prev) => [...prev, { tipo: "usuario", texto: limpio }]);
    const ctrl = new AbortController();
    aborto.current = ctrl;
    try {
      const res = await fetch(`/api/procesos/${processId}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mensaje: limpio, conversacionId: convId }), signal: ctrl.signal });
      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        aplicar({ t: "error", mensaje: j?.error ?? `No se pudo contactar al agente (HTTP ${res.status}).` });
        return;
      }
      const lector = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await lector.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const trozo = buf.slice(0, i);
          buf = buf.slice(i + 2);
          for (const linea of trozo.split("\n")) {
            if (!linea.startsWith("data: ")) continue;
            try {
              aplicar(JSON.parse(linea.slice(6)) as EventoUI);
            } catch {
              /* línea incompleta: se ignora */
            }
          }
        }
      }
    } catch (e) {
      if (ctrl.signal.aborted) aplicar({ t: "aviso", mensaje: "Dejó de seguir la respuesta. El agente termina el paso en curso en el servidor; recargue la página para ver lo guardado." });
      else aplicar({ t: "error", mensaje: e instanceof Error ? `Se perdió la conexión: ${e.message}. Lo ya guardado se conserva; recargue la página.` : "Se perdió la conexión." });
    } finally {
      setActivo(false);
      setEstado("");
      aborto.current = null;
    }
  }

  const bloqueado = !configurado || !puedeEscribir;

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="fixed right-4 bottom-4 z-30 flex h-12 items-center gap-2 rounded-full bg-primario px-5 text-sm font-semibold text-white shadow-elevada xl:hidden"
        aria-label="Abrir el agente"
      >
        <Bot size={18} /> Agente
      </button>

      <aside
        aria-label="Agente"
        className={`${abierto ? "fixed inset-0 z-50 flex" : "hidden"} flex-col border-l border-borde bg-superficie xl:sticky xl:top-14 xl:z-10 xl:flex xl:h-[calc(100vh-3.5rem)]`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-borde px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primario text-white">
              <Bot size={15} aria-hidden />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="text-[13px] font-bold">Agente del expediente</p>
              <p className="truncate text-[11px] text-tinta-3">{modoPrueba ? "Modo de prueba sin modelo" : "Trabaja solo sobre este proceso"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {sesiones.length ? (
              <details className="relative">
                <summary className="flex h-8 cursor-pointer list-none items-center gap-1 rounded-lg px-2 text-[12px] font-medium text-tinta-2 hover:bg-fondo" title="Sesiones anteriores">
                  <MessagesSquare size={15} aria-hidden /> {sesiones.length}
                </summary>
                <div className="absolute right-0 z-20 mt-1 max-h-72 w-72 overflow-y-auto rounded-xl border border-borde bg-superficie p-1 shadow-elevada">
                  {sesiones.map((x) => (
                    <Link key={x.id} href={`?tab=${tab}&c=${x.id}`} className={`block rounded-lg px-3 py-2 text-[13px] hover:bg-fondo ${x.id === convId ? "bg-primario-suave" : ""}`}>
                      <span className="line-clamp-2">{x.titulo}</span>
                      <span className="text-[11px] text-tinta-3">{x.fecha}</span>
                    </Link>
                  ))}
                </div>
              </details>
            ) : null}
            <Link href={`?tab=${tab}&c=nueva`} className="flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] font-medium text-tinta-2 hover:bg-fondo" title="Nueva sesión (el expediente guardado se conserva)">
              <Plus size={15} aria-hidden /> Nueva
            </Link>
            <button type="button" onClick={() => setAbierto(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-tinta-3 hover:bg-fondo xl:hidden" aria-label="Cerrar el agente">
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
          {!items.length ? (
            <div className="pt-2">
              <p className="text-[13px] leading-relaxed text-tinta-2">
                Suba las bases y los documentos de la empresa en la pestaña <strong>Documentos</strong> y pídale al agente que empiece. Lo que registre aparecerá en las pestañas de la izquierda.
              </p>
              {!bloqueado ? (
                <div className="mt-4 space-y-2">
                  {SUGERENCIAS.map((sug) => (
                    <button key={sug} type="button" onClick={() => enviar(sug)} className="block w-full rounded-xl border border-borde bg-fondo px-3 py-2.5 text-left text-[13px] leading-snug text-tinta-2 transition-colors hover:border-primario/40 hover:bg-primario-suave">
                      {sug}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {items.map((it, i) => {
            if (it.tipo === "usuario") {
              return (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[88%] rounded-2xl rounded-br-md bg-primario px-3.5 py-2 text-[13.5px] leading-relaxed whitespace-pre-wrap text-white">{it.texto}</div>
                </div>
              );
            }
            if (it.tipo === "asistente") return <Markdown key={i} className="text-[13.5px]">{it.texto}</Markdown>;
            if (it.tipo === "paso") {
              return (
                <div key={i} className="flex items-center gap-2 text-[12px] text-tinta-3">
                  {it.ok === null ? <LoaderCircle size={13} className="animate-spin text-primario" aria-hidden /> : it.ok ? <Check size={13} className="text-ok" aria-hidden /> : <CircleX size={13} className="text-mal" aria-hidden />}
                  <span className="truncate">{it.etiqueta}</span>
                  {it.ok === false ? <span className="shrink-0 text-mal">no completado</span> : null}
                </div>
              );
            }
            return (
              <div key={i} role={it.tipo === "error" ? "alert" : "status"} className={`rounded-lg border px-3 py-2 text-[13px] ${it.tipo === "error" ? "border-mal/20 bg-mal-suave text-mal" : "border-alerta/20 bg-alerta-suave text-alerta"}`}>
                {it.texto}
              </div>
            );
          })}

          {activo ? (
            <div className="flex items-center gap-2 text-[12px] text-tinta-3">
              <span className="inline-flex gap-1" aria-hidden>
                <span className="h-1.5 w-1.5 animate-pulso rounded-full bg-primario" />
                <span className="h-1.5 w-1.5 animate-pulso rounded-full bg-primario [animation-delay:200ms]" />
                <span className="h-1.5 w-1.5 animate-pulso rounded-full bg-primario [animation-delay:400ms]" />
              </span>
              {estado || "Trabajando…"}
            </div>
          ) : null}
          {costo && !activo ? <p className="text-[11px] text-tinta-3">{costo}</p> : null}
          <div ref={fin} />
        </div>

        <div className="border-t border-borde p-3">
          {!configurado ? (
            <p className="rounded-lg bg-alerta-suave px-3 py-2 text-[12.5px] text-alerta">El agente no está configurado: falta la clave del proveedor del modelo (ANTHROPIC_API_KEY) en el servidor.</p>
          ) : !puedeEscribir ? (
            <p className="rounded-lg bg-fondo px-3 py-2 text-[12.5px] text-tinta-3">Su rol es de solo lectura: puede ver las sesiones, no conversar con el agente.</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                enviar(texto);
              }}
              className="flex items-end gap-2"
            >
              <label htmlFor="mensaje-agente" className="sr-only">
                Mensaje para el agente
              </label>
              <textarea
                id="mensaje-agente"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    enviar(texto);
                  }
                }}
                rows={2}
                maxLength={20000}
                placeholder="Pida un análisis, un borrador o una revisión…"
                className="max-h-40 min-h-[44px] flex-1 resize-y rounded-xl border border-borde-fuerte bg-superficie px-3 py-2 text-[13.5px] leading-snug focus:border-primario focus:ring-2 focus:ring-primario/20 focus:outline-none"
              />
              {activo ? (
                <button type="button" onClick={() => aborto.current?.abort()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-borde-fuerte text-tinta-2 hover:bg-fondo" aria-label="Dejar de seguir la respuesta" title="Dejar de seguir la respuesta">
                  <Square size={15} />
                </button>
              ) : (
                <button type="submit" disabled={!texto.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primario text-white transition-colors hover:bg-primario-fuerte disabled:opacity-40" aria-label="Enviar">
                  <Send size={16} />
                </button>
              )}
            </form>
          )}
          <p className="mt-2 text-[11px] leading-snug text-tinta-3">El agente prepara borradores para revisión. No firma, no presenta ni envía nada fuera de la plataforma.</p>
        </div>
      </aside>
    </>
  );
}
