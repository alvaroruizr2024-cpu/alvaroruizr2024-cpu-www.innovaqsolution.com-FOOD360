// Modelo de prueba (AGENT_FAKE=1): NO es inteligencia artificial. Sigue un guion fijo que
// ejercita el bucle, las herramientas y la interfaz sin llamar a ninguna API ni gastar tokens.
// Sirve para pruebas automáticas y para revisar la plataforma antes de configurar la clave.
import type { Modelo, ParamsTurno, RespuestaApi } from "./modelo";

let n = 0;
const id = (p: string) => `${p}_prueba_${Date.now().toString(36)}_${++n}`;

function respuesta(contenido: unknown[], stop: string): RespuestaApi {
  return {
    id: id("msg"),
    type: "message",
    role: "assistant",
    model: "modelo-de-prueba",
    content: contenido,
    stop_reason: stop,
    stop_sequence: null,
    usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
  } as unknown as RespuestaApi;
}

export class ModeloDePrueba implements Modelo {
  async turno(p: ParamsTurno): Promise<RespuestaApi> {
    // Cuenta cuántos resultados de herramienta hay desde el último mensaje de texto del usuario.
    let pasos = 0;
    for (let i = p.messages.length - 1; i >= 0; i--) {
      const m = p.messages[i];
      if (m.role !== "user") continue;
      const bloques = Array.isArray(m.content) ? m.content : [];
      if (bloques.some((b) => b.type === "tool_result")) pasos++;
      else break;
    }
    const decir = async (texto: string) => {
      for (const trozo of texto.match(/.{1,24}/gs) ?? []) {
        p.onEvento?.({ t: "texto", d: trozo });
        await new Promise((r) => setTimeout(r, 8));
      }
    };
    const usar = (nombre: string, input: unknown) => {
      const b = { type: "tool_use", id: id("toolu"), name: nombre, input };
      p.onEvento?.({ t: "bloque", id: b.id, nombre });
      return b;
    };

    if (pasos === 0) {
      const t = "[Modo de prueba sin modelo] Reviso el estado del expediente. ";
      await decir(t);
      return respuesta([{ type: "text", text: t }, usar("obtener_contexto", {})], "tool_use");
    }
    if (pasos === 1) {
      return respuesta(
        [
          usar("guardar_registros", {
            tabla: "requisitos",
            registros: [
              {
                codigo: "PRUEBA-01",
                etapa: "Prueba",
                fuente: "Guion de prueba (no proviene de ningún documento)",
                requisito: "Fila de ejemplo creada por el modo de prueba para verificar el flujo. Elimínela.",
                caracter: "informativo",
                estado: "pendiente de validación",
                prioridad: "baja",
              },
            ],
          }),
          usar("calcular_plazo", { desde: "2026-11-12", dias: 5, tipo: "habiles" }),
          usar("guardar_registros", { tabla: "hitos", registros: [{ codigo: "PRUEBA-H1", hito: "Hito de ejemplo del modo de prueba", fecha: "2026-11-19", regla: "Guion de prueba", tipo: "estimado", critico: true }] }),
          usar("plantear_preguntas", { preguntas: [{ pregunta: "[Prueba] ¿Quién será la persona designada para la evaluación?", motivo: "Pregunta de ejemplo del modo de prueba; puede descartarla." }] }),
          usar("crear_entregable", {
            tipo: "diagnostico",
            titulo: "Documento de ejemplo del modo de prueba",
            contenido_markdown:
              "# Documento de ejemplo\n\nEste texto lo generó el **modo de prueba**, no un modelo de IA. Sirve para comprobar la descarga en Word y PDF.\n\n| Elemento | Estado |\n|---|---|\n| Flujo de herramientas | verificado |\n| Análisis real | [PENDIENTE: requiere configurar el modelo] |\n\n- Primer punto\n- Segundo punto\n",
            destino: "interno",
          }),
          usar("solicitar_aprobacion", { accion: "enviar", descripcion: "[Prueba] Solicitud de ejemplo del modo de prueba", destinatario: "Nadie (ejemplo)", version: "v0 de prueba", contenido: "Sin contenido real", efecto: "Ninguno: es una solicitud de demostración; puede rechazarla." }),
        ],
        "tool_use",
      );
    }
    const t =
      "[Modo de prueba sin modelo] El flujo funciona: leí el contexto, guardé una fila de ejemplo en la matriz (PRUEBA-01), un hito, una pregunta, un entregable y una solicitud de aprobación, todos marcados como prueba. " +
      "Esto no es un análisis real: configure ANTHROPIC_API_KEY y quite AGENT_FAKE para activar el agente.";
    await decir(t);
    return respuesta([{ type: "text", text: t }], "end_turn");
  }
}
