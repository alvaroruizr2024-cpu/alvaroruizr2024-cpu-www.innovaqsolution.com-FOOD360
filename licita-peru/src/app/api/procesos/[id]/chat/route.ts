import { crearConversacion, ejecutarTurno, type EventoUI } from "@/agent/run";
import { conversacion } from "@/lib/datos";
import { env } from "@/lib/env";
import { errorJson, ErrorHttp, mismoOrigen, sesionApi } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Un turno del agente puede tardar varios minutos (lectura de documentos y especialistas).
export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    mismoOrigen(req);
    const s = await sesionApi("editar");
    const { id } = await params;
    const cuerpo = (await req.json().catch(() => null)) as { mensaje?: unknown; conversacionId?: unknown } | null;
    const texto = typeof cuerpo?.mensaje === "string" ? cuerpo.mensaje.trim() : "";
    if (!texto) throw new ErrorHttp(400, "Escriba un mensaje.");
    if (texto.length > 20000) throw new ErrorHttp(400, "El mensaje es demasiado largo. Suba el contenido como documento.");
    if (!env.agenteConfigurado) throw new ErrorHttp(503, "El agente no está configurado: falta la clave del proveedor del modelo (ANTHROPIC_API_KEY) en el servidor.");

    let conv;
    if (typeof cuerpo?.conversacionId === "string" && cuerpo.conversacionId) {
      conv = await conversacion(s.org.id, cuerpo.conversacionId);
      if (conv.processId !== id) throw new ErrorHttp(404, "Conversación no encontrada.");
    } else {
      conv = await crearConversacion(s.org.id, id, s.user.id);
    }

    const codif = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(control) {
        let abierto = true;
        const emitir = (e: EventoUI) => {
          if (!abierto) return;
          try {
            control.enqueue(codif.encode(`data: ${JSON.stringify(e)}\n\n`));
          } catch {
            abierto = false; // el navegador cerró; el turno sigue y queda guardado
          }
        };
        emitir({ t: "conversacion", id: conv.id });
        // Latido para que proxies y balanceadores no corten la conexión en pasos largos.
        const latido = setInterval(() => {
          if (!abierto) return;
          try {
            control.enqueue(codif.encode(": latido\n\n"));
          } catch {
            abierto = false;
          }
        }, 15000);
        try {
          await ejecutarTurno({ sesion: { orgId: s.org.id, userId: s.user.id, usuarioNombre: s.user.nombre, rol: s.rol }, conversationId: conv.id, texto, emitir });
        } finally {
          clearInterval(latido);
          if (abierto) control.close();
        }
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
  } catch (e) {
    return errorJson(e);
  }
}
