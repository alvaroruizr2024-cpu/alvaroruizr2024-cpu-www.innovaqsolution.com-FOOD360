// Convierte el historial guardado en elementos para mostrar en el chat.
import { mensajes } from "@/lib/datos";
import { etiquetaHerramienta } from "./tools";

export type ItemChat =
  | { tipo: "usuario"; texto: string }
  | { tipo: "asistente"; texto: string }
  | { tipo: "paso"; id: string; etiqueta: string; ok: boolean | null }
  | { tipo: "aviso" | "error"; texto: string };

type Bloque = { type?: string; text?: string; id?: string; name?: string; input?: unknown; tool_use_id?: string; is_error?: boolean };

export async function vistaConversacion(orgId: string, conversationId: string): Promise<ItemChat[]> {
  const filas = await mensajes(orgId, conversationId);
  const items: ItemChat[] = [];
  const pasos = new Map<string, Extract<ItemChat, { tipo: "paso" }>>();
  for (const f of filas) {
    let bloques: Bloque[] = [];
    try {
      const c = JSON.parse(f.contenido) as unknown;
      bloques = Array.isArray(c) ? (c as Bloque[]) : [{ type: "text", text: String(c) }];
    } catch {
      continue;
    }
    for (const b of bloques) {
      if (b.type === "text" && b.text?.trim()) items.push({ tipo: f.rol === "user" ? "usuario" : "asistente", texto: b.text });
      else if ((b.type === "tool_use" || b.type === "server_tool_use") && b.id && b.name) {
        const paso = { tipo: "paso" as const, id: b.id, etiqueta: etiquetaHerramienta(b.name, b.input), ok: b.type === "server_tool_use" ? true : null };
        pasos.set(b.id, paso);
        items.push(paso);
      } else if (b.type === "tool_result" && b.tool_use_id) {
        const paso = pasos.get(b.tool_use_id);
        if (paso) paso.ok = !b.is_error;
      }
    }
  }
  // Un paso sin resultado quedó interrumpido.
  for (const p of pasos.values()) if (p.ok === null) p.ok = false;
  return items;
}
