import { auditar } from "@/lib/audit";
import { entregable, proceso } from "@/lib/datos";
import { markdownADocx, markdownAPdf } from "@/lib/exportar/documento";
import { ahoraEn } from "@/lib/fechas";
import { disposicion, errorJson, ErrorHttp, sesionApi } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const s = await sesionApi();
    const { id } = await params;
    const e = await entregable(s.org.id, id);
    const { p, c } = await proceso(s.org.id, e.processId);
    const formato = new URL(req.url).searchParams.get("formato") ?? "docx";
    const meta = { titulo: e.titulo, empresa: c.razonSocial, proceso: p.nombre, version: e.version, estado: e.estado, destino: e.destino, fecha: ahoraEn(p.zonaHoraria).fecha };
    const base = `${e.titulo} v${e.version}${e.estado === "aprobado" ? "" : " BORRADOR"}`;
    await auditar(s.org.id, { tipo: "usuario", id: s.user.id }, `exportar.${formato}`, { processId: p.id, entidad: "entregable", entidadId: e.id });
    if (formato === "docx") {
      return new Response(new Uint8Array(await markdownADocx(e.contenidoMd, meta)), {
        headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Content-Disposition": disposicion(`${base}.docx`), "Cache-Control": "private, no-store" },
      });
    }
    if (formato === "pdf") {
      return new Response(new Uint8Array(await markdownAPdf(e.contenidoMd, meta)), { headers: { "Content-Type": "application/pdf", "Content-Disposition": disposicion(`${base}.pdf`), "Cache-Control": "private, no-store" } });
    }
    if (formato === "md") {
      return new Response(e.contenidoMd, { headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": disposicion(`${base}.md`), "Cache-Control": "private, no-store" } });
    }
    throw new ErrorHttp(400, "Formato no admitido.");
  } catch (err) {
    return errorJson(err);
  }
}
