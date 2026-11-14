import { contenidoDocumento } from "@/lib/datos";
import { disposicion, errorJson, sesionApi } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const s = await sesionApi();
    const { id } = await params;
    const { doc, buffer } = await contenidoDocumento(s.org.id, id);
    // Solo PDF e imágenes se muestran en línea; el resto siempre se descarga.
    const enLinea = new URL(req.url).searchParams.get("ver") === "1" && (doc.mime === "application/pdf" || doc.mime.startsWith("image/"));
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": doc.mime,
        "Content-Length": String(buffer.length),
        "Content-Disposition": disposicion(doc.nombre, enLinea),
        "Cache-Control": "private, no-store",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; object-src 'self'; sandbox",
      },
    });
  } catch (e) {
    return errorJson(e);
  }
}
