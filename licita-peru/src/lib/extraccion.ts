// Extracción de texto de los documentos subidos. El texto es una transcripción auxiliar
// (§6 del prompt): para importes, fechas, firmas y campos críticos el agente dispone
// además de la lectura visual del original.

export type Extraccion = {
  estado: "listo" | "sin_texto" | "no_soportado" | "error";
  paginas: string[];
  totalPaginas: number | null;
  detalle?: string;
};

const MAX_PAGINAS = 800;
const TROZO = 4000;

/** Parte texto corrido en "páginas" lógicas respetando párrafos, para poder leerlo por tramos. */
export function trocear(texto: string, tam = TROZO): string[] {
  const limpio = texto.replace(/\r\n/g, "\n").replace(/\u0000/g, "");
  if (limpio.length <= tam) return limpio.trim() ? [limpio] : [];
  const partes: string[] = [];
  let actual = "";
  for (const parrafo of limpio.split(/\n{2,}/)) {
    if (actual.length + parrafo.length + 2 > tam && actual) {
      partes.push(actual);
      actual = "";
    }
    if (parrafo.length > tam) {
      for (let i = 0; i < parrafo.length; i += tam) partes.push(parrafo.slice(i, i + tam));
    } else {
      actual += (actual ? "\n\n" : "") + parrafo;
    }
  }
  if (actual.trim()) partes.push(actual);
  return partes;
}

const EXT = (nombre: string) => (/\.([a-z0-9]+)$/i.exec(nombre)?.[1] ?? "").toLowerCase();

export function esPdf(mime: string, nombre: string) {
  return mime === "application/pdf" || EXT(nombre) === "pdf";
}
export function esImagen(mime: string) {
  return ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(mime);
}

export async function extraerTexto(buffer: Buffer, mime: string, nombre: string): Promise<Extraccion> {
  const ext = EXT(nombre);
  try {
    if (esPdf(mime, nombre)) {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { totalPages, text } = await extractText(pdf, { mergePages: false });
      const paginas = (text as string[]).slice(0, MAX_PAGINAS).map((p) => p.replace(/\u0000/g, ""));
      const caracteres = paginas.reduce((n, p) => n + p.trim().length, 0);
      // Menos de ~30 caracteres por página: es un escaneo sin capa de texto.
      const estado = caracteres < 30 * Math.max(1, paginas.length) ? "sin_texto" : "listo";
      return { estado, paginas, totalPaginas: totalPages };
    }
    if (ext === "docx" || mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const mammoth = await import("mammoth");
      const { value } = await mammoth.extractRawText({ buffer });
      const paginas = trocear(value);
      return { estado: paginas.length ? "listo" : "sin_texto", paginas, totalPaginas: paginas.length };
    }
    if (ext === "xlsx" || mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as unknown as ArrayBuffer);
      const paginas: string[] = [];
      wb.eachSheet((ws) => {
        const filas: string[] = [];
        ws.eachRow({ includeEmpty: false }, (row, n) => {
          const celdas: string[] = [];
          row.eachCell({ includeEmpty: true }, (cell) => {
            const v = cell.value as unknown;
            let s = "";
            if (v === null || v === undefined) s = "";
            else if (v instanceof Date) s = v.toISOString().slice(0, 10);
            else if (typeof v === "object") {
              const o = v as { result?: unknown; formula?: string; text?: string; richText?: { text: string }[] };
              if (o.formula !== undefined) s = `${o.result ?? ""} [=${o.formula}]`;
              else if (o.richText) s = o.richText.map((r) => r.text).join("");
              else s = String(o.text ?? o.result ?? "");
            } else s = String(v);
            celdas.push(s.replace(/\s+/g, " ").trim());
          });
          filas.push(`${n}\t${celdas.join("\t")}`);
        });
        for (const [i, parte] of trocear(filas.join("\n"), 6000).entries()) paginas.push(`[Hoja: ${ws.name}${i ? `, continuación ${i + 1}` : ""}]\n${parte}`);
      });
      return { estado: paginas.length ? "listo" : "sin_texto", paginas: paginas.slice(0, MAX_PAGINAS), totalPaginas: paginas.length };
    }
    if (mime.startsWith("text/") || ["txt", "md", "csv", "json", "xml", "html"].includes(ext)) {
      const paginas = trocear(buffer.toString("utf8"));
      return { estado: paginas.length ? "listo" : "sin_texto", paginas: paginas.slice(0, MAX_PAGINAS), totalPaginas: paginas.length };
    }
    if (esImagen(mime)) return { estado: "sin_texto", paginas: [], totalPaginas: 1, detalle: "Imagen: solo lectura visual." };
    return { estado: "no_soportado", paginas: [], totalPaginas: null, detalle: `Tipo de archivo sin extractor de texto (${mime || ext}).` };
  } catch (e) {
    return { estado: "error", paginas: [], totalPaginas: null, detalle: e instanceof Error ? e.message : String(e) };
  }
}

/** Devuelve un PDF con solo las páginas pedidas (1-indexadas, inclusivas). */
export async function recortarPdf(buffer: Buffer, desde: number, hasta: number): Promise<Buffer> {
  const { PDFDocument } = await import("pdf-lib");
  const origen = await PDFDocument.load(buffer, { ignoreEncryption: true, updateMetadata: false });
  const total = origen.getPageCount();
  const a = Math.max(1, desde);
  const b = Math.min(total, hasta);
  if (a === 1 && b === total) return buffer;
  const destino = await PDFDocument.create();
  const indices = Array.from({ length: b - a + 1 }, (_, i) => a - 1 + i);
  for (const p of await destino.copyPages(origen, indices)) destino.addPage(p);
  return Buffer.from(await destino.save());
}
