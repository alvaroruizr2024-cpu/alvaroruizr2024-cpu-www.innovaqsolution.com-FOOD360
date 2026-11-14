// Frontera con la API del modelo. El bucle del agente depende de esta interfaz, lo que
// permite probarlo con un guion determinista sin gastar tokens.
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import type { BetaMessage, BetaMessageParam, BetaTextBlockParam, BetaToolUnion } from "./tipos";


export type EventoModelo = { t: "texto"; d: string } | { t: "pensando"; d: string } | { t: "bloque"; id: string; nombre: string };

export type ParamsTurno = {
  model: string;
  effort: "low" | "medium" | "high" | "xhigh" | "max";
  maxTokens: number;
  system: BetaTextBlockParam[];
  tools: BetaToolUnion[];
  messages: BetaMessageParam[];
  onEvento?: (e: EventoModelo) => void;
  signal?: AbortSignal;
};

export interface Modelo {
  turno(p: ParamsTurno): Promise<BetaMessage>;
}

// El respaldo del lado del servidor ante rechazos del clasificador existe para estas familias;
// Haiku no lo admite.
const ADMITE_RESPALDO = /^claude-(opus-5|sonnet-5-5|fable-5)/;

export class ModeloAnthropic implements Modelo {
  private cliente: Anthropic;
  constructor() {
    // Lee ANTHROPIC_API_KEY (o ANTHROPIC_AUTH_TOKEN) del entorno. Reintenta 429/5xx por sí solo.
    this.cliente = new Anthropic({ maxRetries: 3 });
  }

  async turno(p: ParamsTurno): Promise<BetaMessage> {
    const respaldo = env.fallbacks === "default" && ADMITE_RESPALDO.test(p.model);
    const stream = this.cliente.beta.messages.stream(
      {
        model: p.model,
        max_tokens: p.maxTokens,
        system: p.system,
        tools: p.tools,
        messages: p.messages,
        // El razonamiento es adaptativo; se pide el resumen para mostrar actividad al usuario.
        thinking: { type: "adaptive", display: "summarized" },
        output_config: { effort: p.effort },
        // Cachea automáticamente el prefijo (herramientas, sistema e historial) entre iteraciones.
        cache_control: { type: "ephemeral" },
        ...(respaldo ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      },
      { signal: p.signal },
    );
    stream.on("streamEvent", (ev) => {
      if (ev.type === "content_block_delta") {
        if (ev.delta.type === "text_delta") p.onEvento?.({ t: "texto", d: ev.delta.text });
        else if (ev.delta.type === "thinking_delta") p.onEvento?.({ t: "pensando", d: ev.delta.thinking });
      } else if (ev.type === "content_block_start") {
        const b = ev.content_block;
        if (b.type === "tool_use" || b.type === "server_tool_use") p.onEvento?.({ t: "bloque", id: b.id, nombre: b.name });
      }
    });
    return stream.finalMessage();
  }
}

let instancia: Modelo | null = null;
export async function modeloPorDefecto(): Promise<Modelo> {
  if (instancia) return instancia;
  if (process.env.AGENT_FAKE === "1") {
    const { ModeloDePrueba } = await import("./modelo-prueba");
    return (instancia = new ModeloDePrueba());
  }
  return (instancia = new ModeloAnthropic());
}

export { Anthropic };
export type MensajeApi = BetaMessageParam;
export type RespuestaApi = BetaMessage;
