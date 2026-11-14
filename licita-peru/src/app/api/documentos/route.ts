import { NextResponse } from "next/server";
import { auditar } from "@/lib/audit";
import { CATEGORIA_IDS, VERSIONES_DOC } from "@/lib/catalogos";
import { empresa, guardarDocumento, proceso } from "@/lib/datos";
import { env } from "@/lib/env";
import { reabrirSiCorresponde } from "@/lib/estados";
import { errorJson, ErrorHttp, mismoOrigen, sesionApi } from "@/lib/http";
import { verificarLimite } from "@/lib/planes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const PERMITIDOS = /\.(pdf|docx|xlsx|png|jpe?g|webp|gif|txt|md|csv|json|xml)$/i;
const MIME_POR_EXT: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
  xml: "application/xml",
};

export async function POST(req: Request) {
  try {
    mismoOrigen(req);
    const s = await sesionApi("editar");
    const fd = await req.formData();
    const processId = String(fd.get("processId") ?? "") || null;
    let companyId = String(fd.get("companyId") ?? "");
    const corporativo = fd.get("ambito") === "empresa";
    if (processId) companyId = (await proceso(s.org.id, processId)).p.companyId;
    else await empresa(s.org.id, companyId);

    const categoria = String(fd.get("categoria") ?? "otro");
    const version = String(fd.get("version") ?? "original");
    if (!CATEGORIA_IDS.includes(categoria)) throw new ErrorHttp(400, "Categoría no válida.");
    if (!(VERSIONES_DOC as readonly string[]).includes(version)) throw new ErrorHttp(400, "Versión no válida.");

    const archivos = fd.getAll("archivo").filter((a): a is File => a instanceof File && a.size > 0);
    if (!archivos.length) throw new ErrorHttp(400, "Seleccione al menos un archivo.");
    if (archivos.length > 20) throw new ErrorHttp(400, "Suba como máximo 20 archivos por vez.");
    const totalMb = archivos.reduce((n, a) => n + a.size, 0) / 1_048_576;
    for (const a of archivos) {
      if (!PERMITIDOS.test(a.name)) throw new ErrorHttp(400, `"${a.name}": tipo no admitido. Use PDF, Word (.docx), Excel (.xlsx), imágenes o texto.`);
      if (a.size > env.maxArchivoMb * 1_048_576) throw new ErrorHttp(413, `"${a.name}" pesa ${(a.size / 1_048_576).toFixed(1)} MB; el máximo por archivo es ${env.maxArchivoMb} MB.`);
    }
    await verificarLimite(s.org.id, "almacenamientoMb", totalMb);

    const subidos = [];
    let reabierto = false;
    for (const a of archivos) {
      const ext = (/\.([a-z0-9]+)$/i.exec(a.name)?.[1] ?? "").toLowerCase();
      const destinoProceso = corporativo ? null : processId;
      const { doc, extraccion } = await guardarDocumento(s.org.id, {
        companyId,
        processId: destinoProceso,
        buffer: Buffer.from(await a.arrayBuffer()),
        nombre: a.name,
        mime: MIME_POR_EXT[ext] ?? (a.type || "application/octet-stream"), // el tipo se decide por extensión, no por lo que diga el navegador
        categoria: corporativo && categoria === "otro" ? "corporativo" : categoria,
        version,
        descripcion: String(fd.get("descripcion") ?? "").slice(0, 500),
        subidoPor: s.user.id,
      });
      await auditar(s.org.id, { tipo: "usuario", id: s.user.id }, "documento.subir", { processId: destinoProceso, entidad: "documento", entidadId: doc.id, detalle: { nombre: doc.nombre, categoria: doc.categoria, sha256: doc.sha256, tamano: doc.tamano } });
      if (destinoProceso) reabierto = (await reabrirSiCorresponde({ orgId: s.org.id, companyId, processId: destinoProceso }, doc.categoria, doc.nombre)) || reabierto;
      subidos.push({ id: doc.id, nombre: doc.nombre, paginas: doc.paginas, texto: extraccion.estado });
    }
    return NextResponse.json({ subidos, reabierto });
  } catch (e) {
    return errorJson(e);
  }
}
