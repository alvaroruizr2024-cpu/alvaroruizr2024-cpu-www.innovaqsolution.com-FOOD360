import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { db, schema } from "@/db/client";
import { eq } from "drizzle-orm";
import { ctxDe, mensaje, ModeloGuion, nuevaOrg, pdfDePrueba, texto, usar } from "./ayudas";
import { buscarTexto, crearEmpresa, crearProceso, documento, guardarDocumento, guardarRegistros, listarDocumentos, listarRegistros, mensajes, proceso } from "@/lib/datos";
import { ejecutarHerramienta } from "@/agent/tools";
import { crearConversacion, ejecutarTurno, type EventoUI } from "@/agent/run";
import { cambiarEstado } from "@/lib/estados";
import { exportarExpedienteXlsx } from "@/lib/exportar/xlsx";
import { markdownADocx, markdownAPdf } from "@/lib/exportar/documento";
import { hitosAIcs } from "@/lib/exportar/ics";
import { usoDe, verificarLimite, ErrorLimite, costoUsd } from "@/lib/planes";
import { aceptarInvitacion, crearInvitacion, crearSesion, sesionDesdeToken, validarCredenciales, registrar } from "@/lib/cuentas";

const USUARIO = { tipo: "usuario" as const, id: "prueba" };
const sesionDe = (o: Awaited<ReturnType<typeof nuevaOrg>>) => ({ orgId: o.org.id, userId: o.user.id, usuarioNombre: "Persona de Prueba", rol: "propietario" });

describe("tenencia: aislamiento entre organizaciones y entre empresas", () => {
  it("una organización no ve procesos, documentos ni registros de otra", async () => {
    const a = await nuevaOrg("A");
    const b = await nuevaOrg("B");
    const { doc } = await guardarDocumento(a.org.id, { companyId: a.empresa.id, processId: a.proceso.id, buffer: await pdfDePrueba(["Bases confidenciales de A, clave ZAFIRO"]), nombre: "bases-A.pdf", mime: "application/pdf", categoria: "bases" });
    await guardarRegistros(ctxDe(a), "requisitos", [{ requisito: "Requisito secreto de A", estado: "no cumple" }], USUARIO);

    await expect(proceso(b.org.id, a.proceso.id)).rejects.toThrow(/no encontrado/);
    await expect(documento(b.org.id, doc.id)).rejects.toThrow(/no encontrado/);
    expect(await listarRegistros(ctxDe(b), "requisitos")).toHaveLength(0);
    expect(await buscarTexto(b.org.id, ctxDe(b), "ZAFIRO")).toHaveLength(0);

    // Aunque el modelo "adivine" el id de un documento ajeno, la herramienta no lo entrega.
    const r = await ejecutarHerramienta(ctxDe(b), "leer_documento", { documento_id: doc.id });
    expect(r.esError).toBe(true);
    expect(JSON.stringify(r.contenido)).not.toMatch(/ZAFIRO/);
    // Y un ámbito forjado (proceso de A con organización de B) tampoco devuelve nada.
    expect(await listarRegistros({ orgId: b.org.id, companyId: a.empresa.id, processId: a.proceso.id }, "requisitos")).toHaveLength(0);
  });

  it("dentro de una organización, un proceso no alcanza documentos de otra empresa", async () => {
    const a = await nuevaOrg("Consultora");
    const otra = await crearEmpresa(a.org.id, { razonSocial: "Cliente Dos S.A." });
    const procOtra = await crearProceso(a.org.id, otra.id, { nombre: "Proceso de Cliente Dos" });
    const { doc: corporativo } = await guardarDocumento(a.org.id, { companyId: a.empresa.id, processId: null, buffer: await pdfDePrueba(["Ficha RUC de la empresa uno, clave AMBAR"]), nombre: "ficha.pdf", mime: "application/pdf" });
    const { doc: deOtra } = await guardarDocumento(a.org.id, { companyId: otra.id, processId: procOtra.id, buffer: await pdfDePrueba(["Oferta de Cliente Dos, clave RUBI"]), nombre: "oferta-dos.pdf", mime: "application/pdf" });

    const visibles = (await listarDocumentos(a.org.id, ctxDe(a))).map((d) => d.id);
    expect(visibles).toContain(corporativo.id); // el expediente corporativo de SU empresa sí
    expect(visibles).not.toContain(deOtra.id);
    expect((await ejecutarHerramienta(ctxDe(a), "leer_documento", { documento_id: deOtra.id })).esError).toBe(true);
    expect(await buscarTexto(a.org.id, ctxDe(a), "RUBI")).toHaveLength(0);
    expect(await buscarTexto(a.org.id, ctxDe(a), "AMBAR")).toHaveLength(1);
  });

  it("un proceso no puede crearse sobre la empresa de otra organización", async () => {
    const a = await nuevaOrg();
    const b = await nuevaOrg();
    await expect(crearProceso(b.org.id, a.empresa.id, { nombre: "Intrusión" })).rejects.toThrow(/no encontrada|no encontrado/);
  });
});

describe("documentos", () => {
  it("extrae texto por página, busca y entrega lectura visual recortada", async () => {
    const o = await nuevaOrg();
    const { doc, extraccion } = await guardarDocumento(o.org.id, {
      companyId: o.empresa.id,
      processId: o.proceso.id,
      buffer: await pdfDePrueba(["Pagina uno: objeto del servicio", "Pagina dos: plazo de 10 dias habiles", "Pagina tres: garantia de fiel cumplimiento"]),
      nombre: "bases.pdf",
      mime: "application/pdf",
    });
    expect(extraccion.estado).toBe("listo");
    expect(doc.paginas).toBe(3);
    const ctx = ctxDe(o);
    const hallazgos = await buscarTexto(o.org.id, ctx, "garantia");
    expect(hallazgos[0]).toMatchObject({ pagina: 3, documento: "bases.pdf" });

    const t = await ejecutarHerramienta(ctx, "leer_documento", { documento_id: doc.id, pagina_desde: 2, pagina_hasta: 2 });
    expect(String(t.contenido)).toMatch(/Página 2/);
    expect(String(t.contenido)).not.toMatch(/Pagina tres/);

    const v = await ejecutarHerramienta(ctx, "leer_documento", { documento_id: doc.id, pagina_desde: 2, pagina_hasta: 3, modo: "visual" });
    const bloques = v.contenido as { type: string; source?: { data: string } }[];
    expect(bloques[1].type).toBe("document");
    const { PDFDocument } = await import("pdf-lib");
    expect((await PDFDocument.load(Buffer.from(bloques[1].source!.data, "base64"))).getPageCount()).toBe(2);
    expect(ctx.leidos.has("bases.pdf")).toBe(true);
  });

  it("marca como sin texto un PDF sin capa de texto y orienta a la lectura visual", async () => {
    const o = await nuevaOrg();
    const { doc } = await guardarDocumento(o.org.id, { companyId: o.empresa.id, processId: o.proceso.id, buffer: await pdfDePrueba([""]), nombre: "escaneo.pdf", mime: "application/pdf" });
    expect(doc.textoEstado).toBe("sin_texto");
    const r = await ejecutarHerramienta(ctxDe(o), "leer_documento", { documento_id: doc.id });
    expect(String(r.contenido)).toMatch(/visual/);
  });
});

describe("herramientas y compuertas", () => {
  it("guarda, actualiza por código y devuelve errores útiles sin guardar filas inválidas", async () => {
    const o = await nuevaOrg();
    const ctx = ctxDe(o);
    const r1 = await ejecutarHerramienta(ctx, "guardar_registros", { tabla: "requisitos", registros: [{ requisito: "Ficha RUC", estado: "cumple verificado", caracter: "obligatorio" }, { requisito: "Sin estado" }] });
    const j1 = JSON.parse(String(r1.contenido));
    expect(j1.creados).toEqual(["REQ-01"]);
    expect(j1.errores[0].errores.join(" ")).toMatch(/estado/);
    await ejecutarHerramienta(ctx, "guardar_registros", { tabla: "requisitos", registros: [{ codigo: "REQ-01", estado: "no cumple", brecha: "RUC no habido" }] });
    const [fila] = await listarRegistros(ctx, "requisitos");
    expect(fila.data).toMatchObject({ requisito: "Ficha RUC", estado: "no cumple", brecha: "RUC no habido", caracter: "obligatorio" });
    expect((await ejecutarHerramienta(ctx, "guardar_registros", { tabla: "preguntas", registros: [{ pregunta: "¿?" }] })).esError).toBe(true);
    expect((await ejecutarHerramienta(ctx, "guardar_registros", { tabla: "requisitos" })).esError).toBe(true); // entrada incompleta
  });

  it("limita a cinco las preguntas abiertas", async () => {
    const o = await nuevaOrg();
    const ctx = ctxDe(o);
    const q = (n: number) => Array.from({ length: n }, (_, i) => ({ pregunta: `¿Dato crítico ${i}?`, motivo: "bloquea la matriz" }));
    expect((await ejecutarHerramienta(ctx, "plantear_preguntas", { preguntas: q(4) })).esError).toBeFalsy();
    const r = await ejecutarHerramienta(ctx, "plantear_preguntas", { preguntas: q(2) });
    expect(r.esError).toBe(true);
    expect(await listarRegistros(ctx, "preguntas")).toHaveLength(4);
  });

  it("no deja declarar listo, listo para presentar ni presentado sin lo que exige cada compuerta", async () => {
    const o = await nuevaOrg();
    const ctx = ctxDe(o);
    const vacio = await cambiarEstado(ctx, "listo_aprobacion_firma", ctx.actor);
    expect(vacio.ok).toBe(false);

    await guardarRegistros(ctx, "requisitos", [
      { codigo: "R1", requisito: "Vigencia de poder", caracter: "eliminatorio", estado: "pendiente de evidencia" },
      { codigo: "R2", requisito: "Declaración jurada firmada", caracter: "obligatorio", estado: "pendiente de validación" },
      { codigo: "R3", requisito: "Brochure", caracter: "informativo", estado: "pendiente de validación" },
    ], USUARIO);
    const r = await cambiarEstado(ctx, "listo_aprobacion_firma", ctx.actor);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivos.join(" ")).toMatch(/R1.*R2/);

    await guardarRegistros(ctx, "requisitos", [{ codigo: "R1", estado: "cumple verificado" }], USUARIO);
    // R2 solo espera firma: se identifica expresamente.
    expect((await cambiarEstado(ctx, "listo_aprobacion_firma", ctx.actor, { pendientesDeFirma: ["R2"] })).ok).toBe(true);

    const sinAprob = await cambiarEstado(ctx, "listo_presentar", ctx.actor);
    expect(sinAprob.ok).toBe(false);
    await ejecutarHerramienta(ctx, "solicitar_aprobacion", { accion: "presentar", descripcion: "Presentar el expediente v1 en el portal", destinatario: "Cliente", version: "v1", contenido: "Paquete completo", efecto: "Presentación irreversible" });
    expect((await cambiarEstado(ctx, "listo_presentar", ctx.actor)).ok).toBe(false); // pendiente no basta
    await db.update(schema.aprobaciones).set({ estado: "aprobada" }).where(eq(schema.aprobaciones.processId, o.proceso.id));
    const conFirmaPendiente = await cambiarEstado(ctx, "listo_presentar", ctx.actor);
    expect(conFirmaPendiente.ok).toBe(false); // R2 sigue sin firma
    await guardarRegistros(ctx, "requisitos", [{ codigo: "R2", estado: "cumple verificado" }], USUARIO);
    expect((await cambiarEstado(ctx, "listo_presentar", ctx.actor)).ok).toBe(true);

    const sinConstancia = await cambiarEstado(ctx, "presentado", ctx.actor);
    expect(sinConstancia.ok).toBe(false);
    await guardarDocumento(o.org.id, { companyId: o.empresa.id, processId: o.proceso.id, buffer: await pdfDePrueba(["Constancia de registro"]), nombre: "constancia.pdf", mime: "application/pdf", categoria: "constancia" });
    expect((await cambiarEstado(ctx, "presentado", ctx.actor)).ok).toBe(true);
    // Los resultados externos no los fija el agente.
    expect((await cambiarEstado(ctx, "adjudicado", ctx.actor)).ok).toBe(false);
    expect((await cambiarEstado(ctx, "adjudicado", USUARIO)).ok).toBe(true);
  });
});

describe("bucle del agente (modelo con guion)", () => {
  it("ejecuta herramientas, persiste el historial y lo reproduce idéntico, incluidas lecturas visuales", async () => {
    const o = await nuevaOrg();
    const { doc } = await guardarDocumento(o.org.id, { companyId: o.empresa.id, processId: o.proceso.id, buffer: await pdfDePrueba(["Uno", "Dos"]), nombre: "bases.pdf", mime: "application/pdf" });
    const conv = await crearConversacion(o.org.id, o.proceso.id, o.user.id);
    const eventos: EventoUI[] = [];
    const modelo = new ModeloGuion([
      () => mensaje([texto("Reviso."), usar("obtener_contexto", {}), usar("leer_documento", { documento_id: doc.id, modo: "visual", pagina_desde: 1, pagina_hasta: 1 })], "tool_use"),
      () => mensaje([usar("guardar_registros", { tabla: "requisitos", registros: [{ requisito: "Objeto", estado: "pendiente de evidencia" }] }), usar("guardar_registros", { tabla: "inexistente", registros: [{}] })], "tool_use"),
      () => mensaje([texto("Listo: una fila guardada.")], "end_turn"),
    ]);
    await ejecutarTurno({ sesion: sesionDe(o), conversationId: conv.id, texto: "Inicia el diagnóstico", emitir: (e) => eventos.push(e), modelo });

    expect(modelo.llamadas).toHaveLength(3);
    // Los dos resultados del primer mensaje viajan juntos en un solo mensaje de usuario.
    const segundo = modelo.llamadas[1].messages;
    const resultados = (segundo[2].content as { type: string; is_error?: boolean; content: unknown }[]).filter((b) => b.type === "tool_result");
    expect(resultados).toHaveLength(2);
    // La entrada inválida vuelve al modelo como error, sin tumbar el turno.
    const tercero = modelo.llamadas[2].messages[4].content as { is_error?: boolean }[];
    expect(tercero.map((b) => Boolean(b.is_error))).toEqual([false, true]);
    expect(await listarRegistros(ctxDe(o), "requisitos")).toHaveLength(1);

    const fin = eventos.find((e) => e.t === "fin") as Extract<EventoUI, { t: "fin" }>;
    expect(fin.cambios).toEqual(["requisitos"]);
    expect(fin.costoUsd).toBeGreaterThan(0);
    expect(eventos.filter((e) => e.t === "herramienta")).toHaveLength(4);

    // En la base no queda el PDF en base64: queda una referencia al almacén.
    const filas = await mensajes(o.org.id, conv.id);
    expect(filas.map((f) => f.contenido).join("")).toMatch(/__almacen/);
    expect(filas.map((f) => f.contenido).join("").length).toBeLessThan(20000);

    // Segundo turno: el historial que recibe el modelo es idéntico al del primer turno.
    const modelo2 = new ModeloGuion([() => mensaje([texto("Continuo.")], "end_turn")]);
    await ejecutarTurno({ sesion: sesionDe(o), conversationId: conv.id, texto: "Continúa", emitir: () => {}, modelo: modelo2 });
    const reproducido = modelo2.llamadas[0].messages.slice(0, 5);
    expect(JSON.stringify(reproducido)).toBe(JSON.stringify(modelo.llamadas[2].messages));
    // El uso quedó medido por organización.
    expect((await usoDe(o.org.id)).llamadasIaMes).toBe(4);
  });

  it("retoma pause_turn sin añadir mensajes y no guarda respuestas rechazadas", async () => {
    const o = await nuevaOrg();
    const conv = await crearConversacion(o.org.id, o.proceso.id, o.user.id);
    const modelo = new ModeloGuion([
      () => mensaje([{ type: "server_tool_use", id: "srv_1", name: "web_search", input: { query: "Ley 32069" } }], "pause_turn"),
      (p) => {
        expect(p.messages[p.messages.length - 1].role).toBe("assistant"); // se reenvía tal cual, sin "continúa"
        return mensaje([texto("Parcial")], "refusal");
      },
    ]);
    const eventos: EventoUI[] = [];
    await ejecutarTurno({ sesion: sesionDe(o), conversationId: conv.id, texto: "Verifica el régimen", emitir: (e) => eventos.push(e), modelo });
    expect(eventos.some((e) => e.t === "aviso")).toBe(true);
    const filas = await mensajes(o.org.id, conv.id);
    expect(filas.map((f) => f.rol)).toEqual(["user", "assistant"]); // la respuesta rechazada no se guardó
  });

  it("el especialista solo lee, y la auditoría final deja registro de revisión", async () => {
    const o = await nuevaOrg();
    const conv = await crearConversacion(o.org.id, o.proceso.id, o.user.id);
    const modelo = new ModeloGuion([
      () => mensaje([usar("consultar_especialista", { rol: "auditoria_final", encargo: "Revisa críticamente la matriz de requisitos y busca causas de rechazo." })], "tool_use"),
      // ── pasada del especialista ──
      (p) => {
        expect(JSON.stringify(p.messages[0].content)).toMatch(/pasada independiente/);
        expect(p.messages).toHaveLength(1); // no ve la conversación del coordinador
        return mensaje([usar("guardar_registros", { tabla: "brechas", registros: [{ prioridad: "alta", brecha: "intento de escritura" }] }), usar("listar_registros", { tabla: "requisitos" })], "tool_use");
      },
      (p) => {
        const res = p.messages[2].content as { is_error?: boolean }[];
        expect(res.map((b) => Boolean(b.is_error))).toEqual([true, false]);
        return mensaje([texto("La matriz está vacía; no hay base para declarar listo.\nRESULTADO: bloqueante")], "end_turn");
      },
      // ── vuelve el coordinador ──
      (p) => {
        expect(JSON.stringify(p.messages[p.messages.length - 1].content)).toMatch(/Informe del especialista/);
        return mensaje([texto("La auditoría final resultó bloqueante.")], "end_turn");
      },
    ]);
    await ejecutarTurno({ sesion: sesionDe(o), conversationId: conv.id, texto: "Haz la revisión final", emitir: () => {}, modelo });
    expect(await listarRegistros(ctxDe(o), "brechas")).toHaveLength(0);
    const [rev] = await listarRegistros(ctxDe(o), "revisiones");
    expect(rev.data).toMatchObject({ tipo: "crítica final", resultado: "bloqueante" });
    expect(String(rev.data.revisor)).toMatch(/pasada independiente/);
  });

  it("bloquea el agente cuando la organización agotó su presupuesto mensual de IA", async () => {
    const o = await nuevaOrg();
    await db.insert(schema.usageEvents).values({ orgId: o.org.id, modelo: "claude-opus-5-5", tipo: "agente", costoUsd: "25" });
    await expect(verificarLimite(o.org.id, "presupuestoIaUsdMes", 0)).rejects.toBeInstanceOf(ErrorLimite);
    const conv = await crearConversacion(o.org.id, o.proceso.id, o.user.id);
    const eventos: EventoUI[] = [];
    const modelo = new ModeloGuion([]);
    await ejecutarTurno({ sesion: sesionDe(o), conversationId: conv.id, texto: "Hola", emitir: (e) => eventos.push(e), modelo });
    expect(modelo.llamadas).toHaveLength(0);
    expect((eventos.find((e) => e.t === "error") as { mensaje: string }).mensaje).toMatch(/plan/i);
  });
});

describe("planes y cuentas", () => {
  it("aplica el límite de empresas del plan y calcula costos", async () => {
    const o = await nuevaOrg();
    await expect(verificarLimite(o.org.id, "empresas")).rejects.toThrow(/plan Inicial/);
    expect(costoUsd("claude-opus-5-5", { input_tokens: 1_000_000, output_tokens: 1_000_000 })).toBeCloseTo(24, 6);
    expect(costoUsd("claude-opus-5-5", { cache_read_input_tokens: 1_000_000, busquedasWeb: 3 })).toBeCloseTo(0.23, 6);
  });

  it("inicia sesión, bloquea tras intentos fallidos y acepta invitaciones", async () => {
    const o = await nuevaOrg();
    const { token } = await crearSesion(o.user.id, o.org.id);
    expect((await sesionDesdeToken(token))?.org.id).toBe(o.org.id);
    expect(await sesionDesdeToken("token-inventado")).toBeNull();

    const email = `bloqueo${Date.now()}@prueba.pe`;
    await registrar({ email, nombre: "X", password: "clave-segura-123", organizacion: "Org bloqueo" });
    for (let i = 0; i < 6; i++) await expect(validarCredenciales(email, "mala-clave-000")).rejects.toThrow();
    await expect(validarCredenciales(email, "clave-segura-123")).rejects.toThrow(/bloqueada/);

    const invitado = `invitado${Date.now()}@prueba.pe`;
    const tokenInv = await crearInvitacion(o.org.id, invitado, "revisor", o.user.id);
    const { user } = await aceptarInvitacion(tokenInv, { nombre: "Revisora", password: "otra-clave-segura-9" });
    const s = await sesionDesdeToken((await crearSesion(user.id, o.org.id)).token);
    expect(s?.rol).toBe("revisor");
    await expect(aceptarInvitacion(tokenInv, { nombre: "Otra", password: "otra-clave-segura-9" })).rejects.toThrow(/venció|no existe/);
  });
});

describe("exportaciones", () => {
  it("genera Excel con fórmulas, Word, PDF y calendario válidos", async () => {
    const o = await nuevaOrg();
    const ctx = ctxDe(o);
    await guardarRegistros(ctx, "requisitos", [
      { requisito: "Ficha RUC", caracter: "obligatorio", estado: "cumple verificado" },
      { requisito: "Licencia", caracter: "eliminatorio", estado: "pendiente de evidencia" },
    ], USUARIO);
    await guardarRegistros(ctx, "presupuesto", [
      { partida: "Excavadora", cantidad: 10, precio_unitario: 350.5, moneda: "PEN", visibilidad: "cliente" },
      { partida: "Margen", cantidad: 1, precio_unitario: 900, moneda: "PEN", visibilidad: "interno" },
    ], USUARIO);
    const { buffer, nombre } = await exportarExpedienteXlsx(ctx);
    expect(nombre).toMatch(/\.xlsx$/);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(expect.arrayContaining(["Ficha", "Resumen", "Matriz maestra", "Presupuesto"]));
    const resumen = wb.getWorksheet("Resumen")!;
    expect((resumen.getCell("B5").value as { formula: string }).formula).toMatch(/^COUNTIF\('Matriz maestra'!/);
    const pres = wb.getWorksheet("Presupuesto")!;
    expect(JSON.stringify(pres.getRow(5).values)).toMatch(/IF\(AND\(ISNUMBER/);

    // La versión sin internos no lleva la partida interna ni las hojas de trabajo interno.
    const limpio = new ExcelJS.Workbook();
    await limpio.xlsx.load((await exportarExpedienteXlsx(ctx, { incluirInternos: false })).buffer as unknown as ArrayBuffer);
    expect(limpio.getWorksheet("Brechas")).toBeUndefined();
    expect(JSON.stringify(limpio.getWorksheet("Presupuesto")!.getSheetValues())).not.toMatch(/Margen/);

    const md = "# Propuesta técnica\n\nTexto con **negrita** y una lista:\n\n- Uno\n- Dos\n\n| Hito | Fecha |\n|---|---|\n| Entrega | 26/11/2026 |\n\n1. Primero\n2. Segundo\n";
    const meta = { titulo: "Propuesta técnica", empresa: "Empresa S.A.C.", proceso: "Proceso X", version: 1, estado: "borrador", destino: "cliente", fecha: "2026-11-14" };
    const docx = await markdownADocx(md, meta);
    const xml = await (await JSZip.loadAsync(docx)).file("word/document.xml")!.async("string");
    expect(xml).toMatch(/Propuesta técnica/);
    expect(xml).toMatch(/26\/11\/2026/);
    const pdf = await markdownAPdf(md, meta);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(5000);

    const ics = hitosAIcs({ proceso: "Proceso X", empresa: "Empresa", hitos: [{ codigo: "H-01", hito: "Límite de auditoría", fecha: "2026-11-26", critico: true }, { codigo: "H-02", hito: "Sin fecha", fecha: "" }] });
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toMatch(/DTSTART;VALUE=DATE:20261126/);
  });
});
