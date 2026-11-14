// Libro Excel del expediente: ficha, resumen con fórmulas y una hoja por matriz.
import ExcelJS from "exceljs";
import { TABLAS, type TablaDef } from "../registros";
import { listarRegistrosAmbos, proceso, type Ambito } from "../datos";
import { estadoProceso, tipoProceso } from "../catalogos";
import { ahoraEn, formatoFechaHora } from "../fechas";
import { env } from "../env";

const AZUL = "FF14305C";
const FUENTE = "Arial";
const TONOS: Record<string, string> = {
  "cumple verificado": "FFE2EFDA",
  "pendiente de validación": "FFFFF2CC",
  "pendiente de evidencia": "FFFCE4D6",
  "no cumple": "FFF8CBAD",
  "no aplica con fundamento": "FFEDEDED",
};

const letra = (n: number) => {
  let s = "";
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
};
const nombreHoja = (d: TablaDef) => d.nombre.replace(/[\\/*?:[\]]/g, " ").slice(0, 31);

function cabecera(ws: ExcelJS.Worksheet, fila: number, titulos: string[]) {
  const r = ws.getRow(fila);
  titulos.forEach((t, i) => {
    const c = r.getCell(i + 1);
    c.value = t;
    c.font = { name: FUENTE, size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL } };
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  r.height = 30;
}

export type OpcionesExcel = { incluirInternos: boolean };

export async function exportarExpedienteXlsx(a: Ambito & { processId: string }, op: OpcionesExcel = { incluirInternos: true }): Promise<{ buffer: Buffer; nombre: string }> {
  const { p, c } = await proceso(a.orgId, a.processId);
  const wb = new ExcelJS.Workbook();
  wb.creator = env.marca;
  wb.created = new Date();
  const hoy = ahoraEn(p.zonaHoraria);
  const aviso = op.incluirInternos
    ? "Documento interno de preparación. Contiene costos, márgenes y límites de negociación: no enviar al cliente ni a terceros sin autorización."
    : "Versión sin datos internos. Verificar contra el formato exigido por el comprador antes de usarla.";

  /* Ficha */
  const ficha = wb.addWorksheet("Ficha");
  ficha.columns = [{ width: 34 }, { width: 100 }];
  ficha.getCell("A1").value = `${c.razonSocial} — ${p.nombre}`;
  ficha.getCell("A1").font = { name: FUENTE, size: 14, bold: true, color: { argb: AZUL } };
  ficha.getCell("A2").value = aviso;
  ficha.getCell("A2").font = { name: FUENTE, size: 9, italic: true, color: { argb: "FF595959" } };
  const datos: [string, string][] = [
    ["Empresa", c.razonSocial],
    ["RUC", c.ruc],
    ["Modalidad", c.modalidad],
    ["Representante", c.representante],
    ["Proceso", p.nombre],
    ["Cliente o entidad", p.cliente],
    ["Código del proceso", p.codigo],
    ["Tipo", tipoProceso(p.tipo)],
    ["Sector", p.sector],
    ["Objeto", p.objeto],
    ["Lugar de ejecución", p.lugar],
    ["Etapa", p.etapa],
    ["Estado del expediente", estadoProceso(p.estado).nombre],
    ["Fecha y hora límite", p.fechaLimite ? `${formatoFechaHora(p.fechaLimite, p.zonaHoraria)} (${p.zonaHoraria})` : "Sin definir"],
    ["Portal o canal", p.portal],
    ["Generado", `${hoy.fecha} ${hoy.hora} (${hoy.zona})`],
  ];
  datos.forEach(([k, v], i) => {
    const r = ficha.getRow(4 + i);
    r.getCell(1).value = k;
    r.getCell(1).font = { name: FUENTE, size: 10, bold: true };
    r.getCell(2).value = v || "—";
    r.getCell(2).font = { name: FUENTE, size: 10 };
    r.getCell(2).alignment = { wrapText: true, vertical: "top" };
  });
  let filaExtra = 4 + datos.length + 1;
  for (const [k, v] of Object.entries(p.ficha)) {
    const r = ficha.getRow(filaExtra++);
    r.getCell(1).value = k;
    r.getCell(1).font = { name: FUENTE, size: 10, bold: true };
    r.getCell(2).value = typeof v === "string" ? v : JSON.stringify(v);
    r.getCell(2).font = { name: FUENTE, size: 10 };
    r.getCell(2).alignment = { wrapText: true, vertical: "top" };
  }

  /* Hojas por matriz */
  const resumen = wb.addWorksheet("Resumen");
  const rangos: Record<string, { hoja: string; estado?: string; filas: number; col: Record<string, string> }> = {};

  for (const def of TABLAS) {
    const filas = await listarRegistrosAmbos(a, def.id);
    const visibles = def.id === "presupuesto" && !op.incluirInternos ? filas.filter((f) => f.data.visibilidad === "cliente") : filas;
    if (!op.incluirInternos && ["brechas", "negociacion", "flujo_caja", "preguntas", "revisiones"].includes(def.id)) continue;
    const campos = def.campos.filter((x) => op.incluirInternos || !x.interno);
    const ws = wb.addWorksheet(nombreHoja(def));
    const extra = def.id === "presupuesto" ? ["Subtotal"] : [];
    ws.columns = [{ width: 10 }, ...campos.map((x) => ({ width: x.tipo === "largo" ? 48 : x.tipo === "numero" ? 14 : 22 })), ...extra.map(() => ({ width: 16 }))];
    ws.getCell("A1").value = `${def.nombre} — ${c.razonSocial} — ${p.nombre}`;
    ws.getCell("A1").font = { name: FUENTE, size: 12, bold: true, color: { argb: AZUL } };
    ws.getCell("A2").value = aviso;
    ws.getCell("A2").font = { name: FUENTE, size: 9, italic: true, color: { argb: "FF595959" } };
    cabecera(ws, 4, ["Código", ...campos.map((x) => x.label), ...extra]);
    const col: Record<string, string> = {};
    campos.forEach((x, i) => (col[x.k] = letra(i + 2)));
    visibles.forEach((f, i) => {
      const r = ws.getRow(5 + i);
      r.getCell(1).value = f.codigo;
      campos.forEach((x, j) => {
        const v = f.data[x.k];
        const cell = r.getCell(j + 2);
        cell.value = x.tipo === "bool" ? (v ? "Sí" : "No") : x.tipo === "numero" ? (typeof v === "number" ? v : null) : ((v as string) ?? "");
        if (x.tipo === "numero") cell.numFmt = "#,##0.00";
        if (x.tipo === "enum") cell.dataValidation = { type: "list", allowBlank: true, formulae: [`"${x.opciones!.join(",")}"`] };
      });
      if (def.id === "presupuesto") {
        const cell = r.getCell(campos.length + 2);
        cell.value = { formula: `IF(AND(ISNUMBER(${col.cantidad}${5 + i}),ISNUMBER(${col.precio_unitario}${5 + i})),${col.cantidad}${5 + i}*${col.precio_unitario}${5 + i},0)` };
        cell.numFmt = "#,##0.00";
      }
      r.eachCell((cell) => {
        cell.font = { name: FUENTE, size: 10 };
        cell.alignment = { wrapText: true, vertical: "top" };
      });
    });
    const ultima = 4 + Math.max(visibles.length, 1);
    ws.views = [{ state: "frozen", ySplit: 4, xSplit: 1 }];
    ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: ultima, column: campos.length + 1 + extra.length } };
    if (def.id === "requisitos" && col.estado) {
      ws.addConditionalFormatting({
        ref: `${col.estado}5:${col.estado}${ultima}`,
        rules: Object.entries(TONOS).map(([txt, argb], i) => ({ type: "cellIs" as const, operator: "equal" as const, priority: i + 1, formulae: [`"${txt}"`], style: { fill: { type: "pattern" as const, pattern: "solid" as const, bgColor: { argb } } } })),
      });
    }
    if (def.id === "presupuesto" && visibles.length) {
      // Totales por moneda con fórmula: no se mezclan monedas en una sola suma.
      const sub = letra(campos.length + 2);
      const monedas = [...new Set(visibles.map((f) => String(f.data.moneda ?? "").trim() || "(sin moneda)"))];
      let fila = ultima + 2;
      ws.getCell(`A${fila}`).value = "Totales por moneda (suma de subtotales, sin impuestos)";
      ws.getCell(`A${fila}`).font = { name: FUENTE, size: 10, bold: true };
      for (const m of monedas) {
        fila++;
        ws.getCell(`A${fila}`).value = m;
        const cell = ws.getCell(`B${fila}`);
        cell.value = { formula: `SUMIF(${col.moneda}5:${col.moneda}${ultima},"${m === "(sin moneda)" ? "" : m}",${sub}5:${sub}${ultima})` };
        cell.numFmt = "#,##0.00";
        cell.font = { name: FUENTE, size: 10, bold: true };
      }
    }
    rangos[def.id] = { hoja: nombreHoja(def), estado: def.campoEstado ? col[def.campoEstado] : undefined, filas: visibles.length, col };
  }

  /* Resumen con fórmulas */
  resumen.columns = [{ width: 46 }, { width: 18 }, { width: 60 }];
  resumen.getCell("A1").value = "Resumen de estados";
  resumen.getCell("A1").font = { name: FUENTE, size: 14, bold: true, color: { argb: AZUL } };
  resumen.getCell("A2").value =
    "Conteo interno con fórmulas. No es un puntaje oficial ni una probabilidad de adjudicación. Denominador: filas de la matriz maestra. Un porcentaje alto no compensa un requisito eliminatorio incumplido.";
  resumen.getCell("A2").font = { name: FUENTE, size: 9, italic: true, color: { argb: "FF595959" } };
  resumen.getCell("A2").alignment = { wrapText: true };
  resumen.mergeCells("A2:C2");
  resumen.getRow(2).height = 30;
  cabecera(resumen, 4, ["Estado de requisitos", "Cantidad", "Nota"]);
  const rq = rangos.requisitos;
  let f = 5;
  if (rq?.estado) {
    const rango = `'${rq.hoja}'!$${rq.estado}$5:$${rq.estado}$${4 + Math.max(rq.filas, 1)}`;
    for (const estado of Object.keys(TONOS)) {
      resumen.getCell(`A${f}`).value = estado;
      resumen.getCell(`B${f}`).value = { formula: `COUNTIF(${rango},"${estado}")` };
      f++;
    }
    resumen.getCell(`A${f}`).value = "Total de requisitos";
    resumen.getCell(`B${f}`).value = { formula: `SUM(B5:B${f - 1})` };
    resumen.getCell(`A${f}`).font = { name: FUENTE, size: 10, bold: true };
    f++;
    if (rq.col.caracter) {
      const car = `'${rq.hoja}'!$${rq.col.caracter}$5:$${rq.col.caracter}$${4 + Math.max(rq.filas, 1)}`;
      resumen.getCell(`A${f}`).value = "Eliminatorios u obligatorios sin cumplir";
      resumen.getCell(`B${f}`).value = {
        formula: ["eliminatorio", "obligatorio"]
          .flatMap((car2) => ["no cumple", "pendiente de evidencia", "pendiente de validación"].map((e) => `COUNTIFS(${car},"${car2}",${rango},"${e}")`))
          .join("+"),
      };
      resumen.getCell(`C${f}`).value = "Debe ser 0 para declarar el expediente listo.";
      f++;
    }
  }
  for (let i = 5; i < f; i++) for (const colL of ["A", "B", "C"]) resumen.getCell(`${colL}${i}`).font ??= { name: FUENTE, size: 10 };

  // Orden: Ficha, Resumen, luego matrices.
  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
  return { buffer, nombre: `${slug(c.razonSocial)}_${slug(p.nombre)}_Matriz_${hoy.fecha}${op.incluirInternos ? "" : "_sin_internos"}.xlsx` };
}
