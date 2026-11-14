// Convierte el Markdown de un entregable a Word (.docx) y PDF. Mismo contenido en ambos.
import { createRequire } from "node:module";
import { marked, type Token, type Tokens } from "marked";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

export type MetaDocumento = {
  titulo: string;
  empresa: string;
  proceso: string;
  version: number;
  estado: string; // borrador | revisado | aprobado
  destino: string; // interno | cliente
  fecha: string;
};

const leyenda = (m: MetaDocumento) =>
  m.estado === "aprobado"
    ? `Versión ${m.version} aprobada · ${m.fecha}`
    : `BORRADOR v${m.version} para revisión · ${m.fecha} · No es un documento firmado ni emitido por terceros${m.destino === "interno" ? " · USO INTERNO" : ""}`;

type Estilo = { bold?: boolean; italics?: boolean; code?: boolean; strike?: boolean };

/* ─────────────── Word ─────────────── */

function runs(tokens: Token[] | undefined, estilo: Estilo = {}): TextRun[] {
  const out: TextRun[] = [];
  for (const t of tokens ?? []) {
    switch (t.type) {
      case "strong":
        out.push(...runs((t as Tokens.Strong).tokens, { ...estilo, bold: true }));
        break;
      case "em":
        out.push(...runs((t as Tokens.Em).tokens, { ...estilo, italics: true }));
        break;
      case "del":
        out.push(...runs((t as Tokens.Del).tokens, { ...estilo, strike: true }));
        break;
      case "codespan":
        out.push(new TextRun({ text: (t as Tokens.Codespan).text, font: "Consolas", ...estilo }));
        break;
      case "br":
        out.push(new TextRun({ break: 1 }));
        break;
      case "link":
        out.push(...runs((t as Tokens.Link).tokens, estilo), new TextRun({ text: ` (${(t as Tokens.Link).href})`, ...estilo }));
        break;
      case "text": {
        const tt = t as Tokens.Text;
        if (tt.tokens?.length) out.push(...runs(tt.tokens, estilo));
        else out.push(new TextRun({ text: desescapar(tt.text), bold: estilo.bold, italics: estilo.italics, strike: estilo.strike }));
        break;
      }
      case "escape":
        out.push(new TextRun({ text: (t as Tokens.Escape).text, ...estilo }));
        break;
      default:
        if ("text" in t && typeof t.text === "string") out.push(new TextRun({ text: desescapar(t.text), ...estilo }));
    }
  }
  return out;
}

const desescapar = (s: string) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const NIVELES = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6];

function bloquesDocx(tokens: Token[], nivelLista = 0): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  for (const t of tokens) {
    switch (t.type) {
      case "heading": {
        const h = t as Tokens.Heading;
        out.push(new Paragraph({ heading: NIVELES[Math.min(h.depth, 6) - 1], children: runs(h.tokens), spacing: { before: 240, after: 120 } }));
        break;
      }
      case "paragraph":
        out.push(new Paragraph({ children: runs((t as Tokens.Paragraph).tokens), spacing: { after: 140 }, alignment: AlignmentType.JUSTIFIED }));
        break;
      case "list": {
        const l = t as Tokens.List;
        for (const item of l.items) {
          const inline = item.tokens.filter((x) => x.type !== "list");
          const anidadas = item.tokens.filter((x) => x.type === "list");
          const hijos = inline.flatMap((x) => (x.type === "text" ? runs((x as Tokens.Text).tokens ?? [x]) : x.type === "paragraph" ? runs((x as Tokens.Paragraph).tokens) : runs([x])));
          out.push(
            new Paragraph({
              children: item.task ? [new TextRun({ text: item.checked ? "☑ " : "☐ " }), ...hijos] : hijos,
              ...(l.ordered ? { numbering: { reference: "numerada", level: Math.min(nivelLista, 2) } } : { bullet: { level: Math.min(nivelLista, 2) } }),
              spacing: { after: 60 },
            }),
          );
          out.push(...bloquesDocx(anidadas, nivelLista + 1));
        }
        break;
      }
      case "table": {
        const tb = t as Tokens.Table;
        const celda = (c: Tokens.TableCell, cab: boolean) =>
          new TableCell({
            children: [new Paragraph({ children: runs(c.tokens, cab ? { bold: true } : {}) })],
            shading: cab ? { type: ShadingType.CLEAR, fill: "DCE6F4", color: "auto" } : undefined,
            margins: { top: 60, bottom: 60, left: 90, right: 90 },
          });
        out.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [new TableRow({ tableHeader: true, children: tb.header.map((c) => celda(c, true)) }), ...tb.rows.map((r) => new TableRow({ children: r.map((c) => celda(c, false)) }))],
          }),
          new Paragraph({ children: [], spacing: { after: 140 } }),
        );
        break;
      }
      case "blockquote":
        for (const b of bloquesDocx((t as Tokens.Blockquote).tokens)) out.push(b);
        break;
      case "code":
        for (const linea of (t as Tokens.Code).text.split("\n")) out.push(new Paragraph({ children: [new TextRun({ text: linea, font: "Consolas", size: 18 })] }));
        break;
      case "hr":
        out.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999" } }, children: [] }));
        break;
      case "space":
        break;
      default:
        if ("text" in t && typeof t.text === "string" && t.text.trim()) out.push(new Paragraph({ children: [new TextRun({ text: desescapar(t.text) })] }));
    }
  }
  return out;
}

export async function markdownADocx(md: string, m: MetaDocumento): Promise<Buffer> {
  const tokens = marked.lexer(md);
  const doc = new Document({
    creator: m.empresa,
    title: m.titulo,
    styles: { default: { document: { run: { font: "Arial", size: 21 } } } },
    numbering: {
      config: [
        {
          reference: "numerada",
          levels: [0, 1, 2].map((level) => ({ level, format: LevelFormat.DECIMAL, text: `%${level + 1}.`, alignment: AlignmentType.START, style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } } })),
        },
      ],
    },
    sections: [
      {
        properties: { page: { margin: { top: 1300, bottom: 1200, left: 1300, right: 1300 } } },
        headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${m.empresa} · ${m.proceso}`, size: 16, color: "666666" })] })] }) },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `${leyenda(m)} · Página `, size: 15, color: "666666" }), new TextRun({ children: [PageNumber.CURRENT], size: 15, color: "666666" })],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({ children: [new TextRun({ text: m.titulo, bold: true, size: 34, color: "14305C" })], spacing: { after: 80 } }),
          new Paragraph({ children: [new TextRun({ text: `${m.empresa} — ${m.proceso}`, size: 20, color: "444444" })], spacing: { after: 60 } }),
          new Paragraph({ children: [new TextRun({ text: leyenda(m), size: 17, italics: true, color: m.estado === "aprobado" ? "2E7D32" : "B45309" })], spacing: { after: 300 } }),
          ...bloquesDocx(tokens),
        ],
      },
    ],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

/* ─────────────── PDF ─────────────── */

type Nodo = Record<string, unknown> | string;

function inlinePdf(tokens: Token[] | undefined, estilo: Estilo = {}): Nodo[] {
  const out: Nodo[] = [];
  const base = () => ({ ...(estilo.bold ? { bold: true } : {}), ...(estilo.italics ? { italics: true } : {}), ...(estilo.strike ? { decoration: "lineThrough" } : {}) });
  for (const t of tokens ?? []) {
    if (t.type === "strong") out.push(...inlinePdf((t as Tokens.Strong).tokens, { ...estilo, bold: true }));
    else if (t.type === "em") out.push(...inlinePdf((t as Tokens.Em).tokens, { ...estilo, italics: true }));
    else if (t.type === "del") out.push(...inlinePdf((t as Tokens.Del).tokens, { ...estilo, strike: true }));
    else if (t.type === "br") out.push({ text: "\n" });
    else if (t.type === "link") out.push(...inlinePdf((t as Tokens.Link).tokens, estilo), { text: ` (${(t as Tokens.Link).href})`, ...base() });
    else if (t.type === "text" && (t as Tokens.Text).tokens?.length) out.push(...inlinePdf((t as Tokens.Text).tokens, estilo));
    else if ("text" in t && typeof t.text === "string") out.push({ text: desescapar(t.text), ...base() });
  }
  return out;
}

function bloquesPdf(tokens: Token[]): Nodo[] {
  const out: Nodo[] = [];
  for (const t of tokens) {
    if (t.type === "heading") {
      const h = t as Tokens.Heading;
      out.push({ text: inlinePdf(h.tokens), style: `h${Math.min(h.depth, 4)}` });
    } else if (t.type === "paragraph") out.push({ text: inlinePdf((t as Tokens.Paragraph).tokens), style: "p" });
    else if (t.type === "list") {
      const l = t as Tokens.List;
      const items = l.items.map((item) => {
        const inline = item.tokens.filter((x) => x.type !== "list");
        const anidadas = item.tokens.filter((x) => x.type === "list");
        const texto = { text: inline.flatMap((x) => inlinePdf(x.type === "text" ? ((x as Tokens.Text).tokens ?? [x]) : "tokens" in x ? (x.tokens as Token[]) : [x])) };
        return anidadas.length ? { stack: [texto, ...bloquesPdf(anidadas)] } : texto;
      });
      out.push({ [l.ordered ? "ol" : "ul"]: items, margin: [0, 0, 0, 8] });
    } else if (t.type === "table") {
      const tb = t as Tokens.Table;
      out.push({
        table: {
          headerRows: 1,
          widths: tb.header.map(() => "*"),
          body: [tb.header.map((c) => ({ text: inlinePdf(c.tokens, { bold: true }), fillColor: "#DCE6F4" })), ...tb.rows.map((r) => r.map((c) => ({ text: inlinePdf(c.tokens) })))],
        },
        layout: { hLineColor: () => "#BBBBBB", vLineColor: () => "#BBBBBB", hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
        margin: [0, 2, 0, 10],
        fontSize: 9,
      });
    } else if (t.type === "blockquote") out.push({ stack: bloquesPdf((t as Tokens.Blockquote).tokens), margin: [14, 0, 0, 6], italics: true });
    else if (t.type === "code") out.push({ text: (t as Tokens.Code).text, fontSize: 8.5, margin: [0, 0, 0, 8], preserveLeadingSpaces: true });
    else if (t.type === "hr") out.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 480, y2: 0, lineWidth: 0.6, lineColor: "#999999" }], margin: [0, 6, 0, 8] });
    else if (t.type !== "space" && "text" in t && typeof t.text === "string" && t.text.trim()) out.push({ text: desescapar(t.text), style: "p" });
  }
  return out;
}

type PdfMake = {
  setFonts(f: unknown): void;
  setUrlAccessPolicy(cb: (url: string) => boolean): void;
  setLocalAccessPolicy(cb: (path: string) => boolean): void;
  sharedVirtualfs: { existsSync(n: string): boolean; writeFileSync(n: string, d: Buffer): void };
  createPdf(dd: unknown): { getBuffer(): Promise<Buffer> };
};
let pdfmake: PdfMake | null = null;

function motorPdf(): PdfMake {
  if (pdfmake) return pdfmake;
  const req = createRequire(import.meta.url);
  const pm = req("pdfmake") as PdfMake;
  // Fuentes embebidas en el paquete (sin leer rutas del disco ni descargar nada).
  const vfs = req("pdfmake/build/vfs_fonts.js") as Record<string, string> & { pdfMake?: { vfs: Record<string, string> }; default?: Record<string, string> };
  const archivos = vfs.pdfMake?.vfs ?? vfs.default ?? vfs;
  for (const [nombre, b64] of Object.entries(archivos)) {
    if (typeof b64 === "string" && nombre.endsWith(".ttf") && !pm.sharedVirtualfs.existsSync(nombre)) pm.sharedVirtualfs.writeFileSync(nombre, Buffer.from(b64, "base64"));
  }
  pm.setFonts({ Roboto: { normal: "Roboto-Regular.ttf", bold: "Roboto-Medium.ttf", italics: "Roboto-Italic.ttf", bolditalics: "Roboto-MediumItalic.ttf" } });
  pm.setUrlAccessPolicy(() => false); // el contenido viene del modelo: nunca descargar recursos externos
  pm.setLocalAccessPolicy(() => false);
  return (pdfmake = pm);
}

export async function markdownAPdf(md: string, m: MetaDocumento): Promise<Buffer> {
  const dd = {
    pageSize: "A4",
    pageMargins: [56, 64, 56, 56],
    info: { title: m.titulo, author: m.empresa },
    header: { text: `${m.empresa} · ${m.proceso}`, alignment: "right", fontSize: 8, color: "#666666", margin: [56, 28, 56, 0] },
    footer: (pagina: number, total: number) => ({ text: `${leyenda(m)} · Página ${pagina} de ${total}`, alignment: "center", fontSize: 7.5, color: "#666666", margin: [56, 16, 56, 0] }),
    watermark: m.estado === "aprobado" ? undefined : { text: "BORRADOR", color: "#B45309", opacity: 0.07, bold: true },
    defaultStyle: { font: "Roboto", fontSize: 10.5, lineHeight: 1.25 },
    styles: {
      h1: { fontSize: 15, bold: true, color: "#14305C", margin: [0, 14, 0, 6] },
      h2: { fontSize: 13, bold: true, color: "#14305C", margin: [0, 12, 0, 5] },
      h3: { fontSize: 11.5, bold: true, margin: [0, 10, 0, 4] },
      h4: { fontSize: 10.5, bold: true, margin: [0, 8, 0, 3] },
      p: { margin: [0, 0, 0, 7], alignment: "justify" },
    },
    content: [
      { text: m.titulo, fontSize: 18, bold: true, color: "#14305C", margin: [0, 0, 0, 4] },
      { text: `${m.empresa} — ${m.proceso}`, fontSize: 10, color: "#444444", margin: [0, 0, 0, 3] },
      { text: leyenda(m), fontSize: 8.5, italics: true, color: m.estado === "aprobado" ? "#2E7D32" : "#B45309", margin: [0, 0, 0, 16] },
      ...bloquesPdf(marked.lexer(md)),
    ],
  };
  return motorPdf().createPdf(dd).getBuffer();
}
