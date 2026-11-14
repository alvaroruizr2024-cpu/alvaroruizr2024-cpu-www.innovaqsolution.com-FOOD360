// Prueba en vivo del agente contra el modelo real. Úsela después de configurar
// ANTHROPIC_API_KEY para confirmar que la clave, el modelo y las herramientas funcionan.
// Crea una organización temporal con unas bases de ejemplo, ejecuta dos turnos y la borra.
// Gasta tokens reales (normalmente menos de 2 USD con la configuración por defecto).
//
//   npm run prueba:modelo
import { eq } from "drizzle-orm";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { db, migrar, schema, sql } from "../src/db/client";
import { crearConversacion, ejecutarTurno, type EventoUI } from "../src/agent/run";
import { registrar } from "../src/lib/cuentas";
import { crearEmpresa, crearProceso, guardarDocumento, listarEntregables, todosLosRegistros } from "../src/lib/datos";
import { env } from "../src/lib/env";

const BASES = [
  [
    "INVITACION A PRECALIFICACION DE PROVEEDORES N. 014-2026",
    "Cliente: Minera Ejemplo S.A.     Portal: correo del area de compras",
    "Objeto: servicio de movimiento de tierras con maquinaria pesada",
    "Lugar de ejecucion: provincia de Espinar, Cusco",
    "",
    "1. PLAZO",
    "Las solicitudes se presentan dentro de los 8 dias habiles siguientes",
    "a la fecha de esta invitacion, 12 de noviembre de 2026.",
    "",
    "2. REQUISITOS ELIMINATORIOS",
    "2.1 Ficha RUC con estado ACTIVO y condicion HABIDO.",
    "2.2 Vigencia de poder del representante legal con antiguedad",
    "    no mayor a 30 dias calendario.",
    "2.3 Tres servicios similares concluidos en los ultimos 5 anios,",
    "    cada uno con su conformidad.",
  ],
  [
    "3. REQUISITOS PUNTUABLES (100 puntos)",
    "3.1 Certificacion ISO 45001 vigente: 20 puntos.",
    "3.2 Equipos propios (excavadora y volquete): 30 puntos.",
    "3.3 Experiencia adicional: 10 puntos por servicio, maximo 50.",
    "",
    "4. DECLARACIONES",
    "Anexo 1: declaracion jurada de no tener conflicto de interes,",
    "firmada por el representante legal.",
    "",
    "5. CONSULTAS",
    "Solo por escrito al correo de compras hasta 3 dias habiles antes",
    "del cierre. No se aceptan comunicaciones informales.",
  ],
];

async function pdf(paginas: string[][]) {
  const doc = await PDFDocument.create();
  const fuente = await doc.embedFont(StandardFonts.Helvetica);
  for (const lineas of paginas) {
    const pg = doc.addPage([595, 842]);
    lineas.forEach((l, i) => pg.drawText(l, { x: 50, y: 790 - i * 19, size: 11.5, font: fuente }));
  }
  return Buffer.from(await doc.save());
}

async function main() {
  if (process.env.AGENT_FAKE === "1") throw new Error("Quite AGENT_FAKE: esta prueba debe llamar al modelo real.");
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) throw new Error("Falta ANTHROPIC_API_KEY.");
  await migrar();
  const marca = Date.now().toString(36);
  const { user, org } = await registrar({ email: `prueba-${marca}@prueba.invalid`, nombre: "Prueba en vivo", password: `clave-${marca}-temporal`, organizacion: `PRUEBA EN VIVO ${marca}` });
  // Sin tope de plan durante la prueba.
  await db.update(schema.organizations).set({ planId: "corporativo" }).where(eq(schema.organizations.id, org.id));
  try {
    const empresa = await crearEmpresa(org.id, { razonSocial: "Constructora de Prueba S.A.C.", ruc: "20123456789" });
    const proc = await crearProceso(org.id, empresa.id, { nombre: "Precalificación de prueba — Minera Ejemplo" });
    await guardarDocumento(org.id, { companyId: empresa.id, processId: proc.id, buffer: await pdf(BASES), nombre: "Invitacion_precalificacion_014-2026.pdf", mime: "application/pdf", categoria: "bases" });
    const conv = await crearConversacion(org.id, proc.id, user.id);
    const sesion = { orgId: org.id, userId: user.id, usuarioNombre: "Prueba en vivo", rol: "propietario" };

    console.log(`Modelo: ${env.modeloAgente} · esfuerzo: ${env.esfuerzo} · web: ${env.busquedaWeb ? "sí" : "no"} · respaldo: ${env.fallbacks}\n`);
    const turno = async (n: number, texto: string) => {
      console.log(`──────── Turno ${n} ────────\n> ${texto}\n`);
      let salida = "";
      const errores: string[] = [];
      const t0 = Date.now();
      await ejecutarTurno({
        sesion,
        conversationId: conv.id,
        texto,
        emitir: (e: EventoUI) => {
          if (e.t === "texto") salida += e.d;
          else if (e.t === "herramienta") console.log(`  · ${e.etiqueta}`);
          else if (e.t === "herramienta_fin" && !e.ok) console.log("    ✗ no completado");
          else if (e.t === "paso") console.log(`    (${e.d})`);
          else if (e.t === "aviso") console.log(`  ! ${e.mensaje}`);
          else if (e.t === "error") errores.push(e.mensaje);
          else if (e.t === "fin") console.log(`\n  ${((Date.now() - t0) / 1000).toFixed(0)} s · USD ${e.costoUsd} · tokens ${e.tokens.entrada} entrada / ${e.tokens.salida} salida`);
        },
      });
      console.log(`\n${salida.trim()}\n`);
      if (errores.length) throw new Error(`El turno ${n} terminó con error: ${errores.join(" | ")}`);
    };

    await turno(1, "Inicia el diagnóstico: lee las bases, registra los requisitos en la matriz con su fuente y numeral, calcula la fecha de cierre y regístrala en el calendario. Sé breve en el chat.");
    await turno(2, "Pide al especialista de auditoría final una revisión crítica de la matriz que registraste y dime su resultado en dos líneas.");

    const a = { orgId: org.id, companyId: empresa.id, processId: proc.id };
    const registros = await todosLosRegistros(a);
    const cuenta: Record<string, number> = {};
    for (const r of registros) cuenta[r.tabla] = (cuenta[r.tabla] ?? 0) + 1;
    console.log("──────── Lo que quedó guardado ────────");
    console.log("Filas por tabla:", cuenta);
    for (const r of registros.filter((x) => x.tabla === "requisitos").slice(0, 12)) console.log(`  ${r.codigo} · ${String(r.data.fuente ?? "").slice(0, 28).padEnd(28)} · ${String(r.data.caracter ?? "").padEnd(12)} · ${r.data.estado} · ${String(r.data.requisito).slice(0, 70)}`);
    for (const r of registros.filter((x) => x.tabla === "hitos")) console.log(`  HITO ${r.codigo}: ${r.data.hito} → ${r.data.fecha} (${r.data.tipo})`);
    console.log("Entregables:", (await listarEntregables(org.id, proc.id)).map((e) => `${e.titulo} v${e.version}`));

    const uso = await db.select().from(schema.usageEvents).where(eq(schema.usageEvents.orgId, org.id));
    const suma = (k: "inputTokens" | "outputTokens" | "cacheReadTokens" | "cacheWriteTokens" | "busquedasWeb") => uso.reduce((n, u) => n + u[k], 0);
    console.log("\n──────── Consumo ────────");
    console.log(`Llamadas al modelo: ${uso.length} (agente ${uso.filter((u) => u.tipo === "agente").length}, especialista ${uso.filter((u) => u.tipo === "especialista").length})`);
    console.log(`Tokens: ${suma("inputTokens")} entrada sin caché · ${suma("cacheWriteTokens")} escritos en caché · ${suma("cacheReadTokens")} leídos de caché · ${suma("outputTokens")} salida · ${suma("busquedasWeb")} búsquedas web`);
    console.log(`Costo estimado: USD ${uso.reduce((n, u) => n + Number(u.costoUsd), 0).toFixed(4)}`);

    const fallos: string[] = [];
    if (!cuenta.requisitos) fallos.push("no se guardó ningún requisito");
    if (!cuenta.hitos) fallos.push("no se guardó ningún hito");
    if (!cuenta.revisiones) fallos.push("la auditoría final no dejó registro de revisión");
    if (suma("cacheReadTokens") === 0) fallos.push("la caché de prompts no se leyó en ninguna llamada");
    if (fallos.length) throw new Error(`Comprobaciones fallidas: ${fallos.join("; ")}`);
    console.log("\nPRUEBA EN VIVO OK");
  } finally {
    // Borra todo lo creado (la organización arrastra sus datos) y el usuario temporal.
    await db.delete(schema.organizations).where(eq(schema.organizations.id, org.id));
    await db.delete(schema.users).where(eq(schema.users.id, user.id));
  }
}

main()
  .catch((e) => {
    console.error(`\nFALLÓ: ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
