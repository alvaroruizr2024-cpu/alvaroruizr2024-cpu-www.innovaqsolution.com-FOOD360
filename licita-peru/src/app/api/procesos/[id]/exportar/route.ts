import { auditar } from "@/lib/audit";
import { listarRegistros, proceso } from "@/lib/datos";
import { hitosAIcs } from "@/lib/exportar/ics";
import { exportarExpedienteXlsx } from "@/lib/exportar/xlsx";
import { disposicion, errorJson, ErrorHttp, sesionApi } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const s = await sesionApi();
    const { id } = await params;
    const { p, c } = await proceso(s.org.id, id);
    const a = { orgId: s.org.id, companyId: p.companyId, processId: p.id };
    const q = new URL(req.url).searchParams;
    const formato = q.get("formato") ?? "xlsx";

    if (formato === "xlsx") {
      const incluirInternos = q.get("internos") !== "0";
      const { buffer, nombre } = await exportarExpedienteXlsx(a, { incluirInternos });
      await auditar(s.org.id, { tipo: "usuario", id: s.user.id }, "exportar.xlsx", { processId: p.id, detalle: { incluirInternos } });
      return new Response(new Uint8Array(buffer), {
        headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": disposicion(nombre), "Cache-Control": "private, no-store" },
      });
    }
    if (formato === "ics") {
      const hitos = (await listarRegistros(a, "hitos")).map((h) => ({ codigo: h.codigo, hito: String(h.data.hito ?? ""), fecha: String(h.data.fecha ?? ""), hora: String(h.data.hora ?? ""), regla: String(h.data.regla ?? ""), critico: Boolean(h.data.critico) }));
      return new Response(hitosAIcs({ proceso: p.nombre, empresa: c.razonSocial, hitos }), {
        headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": disposicion(`Calendario_${p.nombre}.ics`), "Cache-Control": "private, no-store" },
      });
    }
    throw new ErrorHttp(400, "Formato no admitido.");
  } catch (e) {
    return errorJson(e);
  }
}
