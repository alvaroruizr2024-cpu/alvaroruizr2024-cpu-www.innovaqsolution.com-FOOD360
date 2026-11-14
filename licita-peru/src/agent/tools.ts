// Herramientas del agente. Cada una recibe el ámbito (organización, empresa, proceso) desde la
// sesión del servidor: el modelo nunca elige a qué empresa accede.
import type { BetaImageBlockParam, BetaRequestDocumentBlock, BetaTextBlockParam, BetaToolInputSchema, BetaToolUnion } from "./tipos";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import type { Actor } from "@/lib/audit";
import { auditar } from "@/lib/audit";
import {
  actualizarDocumento,
  actualizarEmpresa,
  actualizarProceso,
  buscarTexto,
  contenidoDocumento,
  crearEntregable,
  documentoEnAmbito,
  eliminarRegistros,
  guardarRegistros,
  leerPaginas,
  listarAprobaciones,
  listarDocumentos,
  listarEntregables,
  listarRegistros,
  listarRegistrosAmbos,
  proceso,
  type Ambito,
} from "@/lib/datos";
import { describirTablas, TABLA_IDS, TABLAS, tablaDef } from "@/lib/registros";
import { ACCION_IDS, CATEGORIA_IDS, ENTREGABLE_IDS, ESTADOS_DEL_AGENTE, VERSIONES_DOC, accionAprobacion, categoriaDoc, estadoProceso, tipoEntregable, tipoProceso, TIPOS_PROCESO } from "@/lib/catalogos";
import { ahoraEn, calcularPlazo, diasEntre, formatoFechaHora, localAUtc } from "@/lib/fechas";
import { evaluar } from "@/lib/calculo";
import { cambiarEstado } from "@/lib/estados";
import { esImagen, esPdf, recortarPdf } from "@/lib/extraccion";
import { env } from "@/lib/env";
import { ROL_IDS, ROLES_ESPECIALISTA, type RolEspecialista } from "./prompt";

export type BloqueResultado = BetaTextBlockParam | BetaImageBlockParam | BetaRequestDocumentBlock;
export type ResultadoHerramienta = { contenido: string | BloqueResultado[]; esError?: boolean; cambios?: string[] };

export type CtxHerramienta = Ambito & {
  processId: string;
  userId: string;
  actor: Actor;
  /** Pasada de especialista: solo lectura. */
  soloLectura: boolean;
  /** Nombres de documentos leídos en esta pasada (para el registro de la revisión). */
  leidos: Set<string>;
  consultarEspecialista?: (rol: RolEspecialista, encargo: string) => Promise<string>;
};

type Herramienta<S extends z.ZodType = z.ZodType> = {
  nombre: string;
  descripcion: string;
  esquema: S;
  escribe: boolean;
  etiqueta: (entrada: z.infer<S>) => string;
  ejecutar: (ctx: CtxHerramienta, entrada: z.infer<S>) => Promise<ResultadoHerramienta>;
};
const definir = <S extends z.ZodType>(h: Herramienta<S>) => h as unknown as Herramienta;

const json = (v: unknown) => JSON.stringify(v, null, 1);
const MAX_TEXTO = 60_000;
const MAX_PAG_VISUAL = 20;
const MAX_MB_VISUAL = 20;

const tablasEscribibles = TABLAS.filter((t) => !t.soloHerramientaEspecifica).map((t) => t.id) as [string, ...string[]];

/* ─────────────────────────── Lectura ─────────────────────────── */

const obtenerContexto = definir({
  nombre: "obtener_contexto",
  descripcion:
    "Devuelve el estado actual del expediente: ficha de la empresa y del proceso, fecha de hoy y días al plazo, conteos de cada matriz, preguntas abiertas y respuestas recibidas de la empresa, hitos, aprobaciones, entregables e inventario de documentos. Llámala al empezar cada sesión y antes de preguntar algo que ya podría constar.",
  esquema: z.object({}),
  escribe: false,
  etiqueta: () => "Revisando el estado del expediente",
  async ejecutar(ctx) {
    const { p, c } = await proceso(ctx.orgId, ctx.processId);
    const hoy = ahoraEn(p.zonaHoraria);
    const [docs, aprob, entreg] = await Promise.all([listarDocumentos(ctx.orgId, ctx), listarAprobaciones(ctx.orgId, ctx.processId), listarEntregables(ctx.orgId, ctx.processId)]);
    const matrices: Record<string, unknown> = {};
    for (const t of TABLAS) {
      const filas = await listarRegistrosAmbos(ctx, t.id);
      const porEstado: Record<string, number> = Object.create(null);
      if (t.campoEstado) for (const f of filas) porEstado[String(f.data[t.campoEstado] ?? "(sin estado)")] = (porEstado[String(f.data[t.campoEstado] ?? "(sin estado)")] ?? 0) + 1;
      matrices[t.id] = { filas: filas.length, ...(t.campoEstado ? { por_estado: porEstado } : {}) };
      if (t.id === "preguntas") {
        (matrices[t.id] as Record<string, unknown>).detalle = filas.map((f) => ({ codigo: f.codigo, ...f.data }));
      }
      if (t.id === "hitos") {
        (matrices[t.id] as Record<string, unknown>).detalle = filas.map((f) => ({ codigo: f.codigo, hito: f.data.hito, fecha: f.data.fecha, hora: f.data.hora, critico: f.data.critico, estado: f.data.estado }));
      }
      if (t.id === "brechas") {
        (matrices[t.id] as Record<string, unknown>).abiertas_alta = filas.filter((f) => f.data.prioridad === "alta" && f.data.estado !== "cerrada").map((f) => ({ codigo: f.codigo, brecha: f.data.brecha }));
      }
    }
    const fechaLimiteLocal = p.fechaLimite ? ahoraEn(p.zonaHoraria, p.fechaLimite) : null;
    const versiones = new Map<string, (typeof entreg)[number]>();
    for (const e of entreg) if (!versiones.has(`${e.tipo}|${e.titulo}`)) versiones.set(`${e.tipo}|${e.titulo}`, e);
    return {
      contenido: json({
        hoy,
        empresa: { razon_social: c.razonSocial, ruc: c.ruc, modalidad: c.modalidad, sector: c.sector, representante: c.representante, perfil: c.perfil },
        proceso: {
          nombre: p.nombre,
          cliente: p.cliente,
          codigo: p.codigo,
          tipo: `${p.tipo} (${tipoProceso(p.tipo)})`,
          sector: p.sector,
          objeto: p.objeto,
          lugar: p.lugar,
          etapa: p.etapa,
          estado: `${p.estado} (${estadoProceso(p.estado).nombre})`,
          fecha_limite: fechaLimiteLocal ? `${fechaLimiteLocal.fecha} ${fechaLimiteLocal.hora} ${p.zonaHoraria}` : null,
          dias_calendario_al_limite: fechaLimiteLocal ? diasEntre(hoy.fecha, fechaLimiteLocal.fecha) : null,
          zona_horaria: p.zonaHoraria,
          portal: p.portal,
          ficha: p.ficha,
        },
        matrices,
        aprobaciones: aprob.slice(0, 20).map((x) => ({ accion: x.accion, descripcion: x.descripcion, estado: x.estado, comentario: x.comentario, fecha: formatoFechaHora(x.createdAt, p.zonaHoraria) })),
        entregables: [...versiones.values()].map((e) => ({ tipo: e.tipo, titulo: e.titulo, version: e.version, estado: e.estado, destino: e.destino })),
        documentos: {
          total: docs.length,
          lista: docs.slice(0, 80).map((d) => ({
            id: d.id,
            nombre: d.nombre,
            categoria: d.categoria,
            version: d.version,
            ambito: d.processId ? "proceso" : "corporativo",
            paginas: d.paginas,
            texto: d.textoEstado,
          })),
          nota: docs.length > 80 ? "Lista recortada a 80; use listar_documentos para el inventario completo." : undefined,
        },
        herramientas: { web: env.busquedaWeb, portales: false, correo: false, calendario_externo: false, firma: false },
      }),
    };
  },
});

const listarDocs = definir({
  nombre: "listar_documentos",
  descripcion: "Inventario completo de documentos del proceso y del expediente corporativo de la empresa, con id, categoría, versión, páginas, tamaño, huella SHA-256 y si tienen capa de texto.",
  esquema: z.object({}),
  escribe: false,
  etiqueta: () => "Listando documentos",
  async ejecutar(ctx) {
    const docs = await listarDocumentos(ctx.orgId, ctx);
    return {
      contenido: json(
        docs.map((d) => ({
          id: d.id,
          nombre: d.nombre,
          categoria: `${d.categoria} (${categoriaDoc(d.categoria)})`,
          version: d.version,
          ambito: d.processId ? "proceso" : "corporativo",
          descripcion: d.descripcion,
          tipo: d.mime,
          tamano_mb: Math.round((d.tamano / 1_048_576) * 100) / 100,
          paginas: d.paginas,
          texto: d.textoEstado,
          sha256: d.sha256.slice(0, 16),
          origen: d.origen,
          subido: d.createdAt.toISOString().slice(0, 10),
        })),
      ),
    };
  },
});

const leerDocumento = definir({
  nombre: "leer_documento",
  descripcion: `Lee un documento por páginas. modo "texto": transcripción extraída (rápida y barata; auxiliar). modo "visual": entrega las páginas originales del PDF o la imagen para que las veas tal cual (sirve como OCR y para verificar importes, fechas, firmas, sellos y tablas). En visual, hasta ${MAX_PAG_VISUAL} páginas por llamada. Si la lectura se corta, el resultado indica en qué página continuar.`,
  esquema: z.object({
    documento_id: z.string().describe("id del documento (de obtener_contexto o listar_documentos)"),
    pagina_desde: z.number().int().min(1).optional().describe("Primera página (1 por defecto)"),
    pagina_hasta: z.number().int().min(1).optional().describe("Última página, inclusive"),
    modo: z.enum(["texto", "visual"]).optional().describe('"texto" por defecto'),
  }),
  escribe: false,
  etiqueta: (e) => `Leyendo documento (${e.modo ?? "texto"}${e.pagina_desde ? `, pág. ${e.pagina_desde}${e.pagina_hasta ? `–${e.pagina_hasta}` : ""}` : ""})`,
  async ejecutar(ctx, e) {
    const doc = await documentoEnAmbito(ctx.orgId, ctx, e.documento_id);
    ctx.leidos.add(doc.nombre);
    const desde = e.pagina_desde ?? 1;
    const total = doc.paginas ?? 1;
    if (desde > total) return { esError: true, contenido: `El documento tiene ${total} página(s); no existe la página ${desde}.` };

    if ((e.modo ?? "texto") === "visual") {
      const { buffer } = await contenidoDocumento(ctx.orgId, doc.id);
      if (esImagen(doc.mime)) {
        return {
          contenido: [
            { type: "text", text: `Imagen original: ${doc.nombre}` },
            { type: "image", source: { type: "base64", media_type: doc.mime as "image/png" | "image/jpeg" | "image/webp" | "image/gif", data: buffer.toString("base64") } },
          ],
        };
      }
      if (!esPdf(doc.mime, doc.nombre)) return { esError: true, contenido: `La lectura visual solo aplica a PDF e imágenes; "${doc.nombre}" es ${doc.mime}. Use modo "texto".` };
      const hasta = Math.min(total, e.pagina_hasta ?? desde + MAX_PAG_VISUAL - 1, desde + MAX_PAG_VISUAL - 1);
      const recorte = await recortarPdf(buffer, desde, hasta);
      if (recorte.length > MAX_MB_VISUAL * 1_048_576) {
        return { esError: true, contenido: `Las páginas ${desde}–${hasta} pesan ${(recorte.length / 1_048_576).toFixed(1)} MB (máximo ${MAX_MB_VISUAL} MB por lectura). Pida menos páginas por llamada.` };
      }
      return {
        contenido: [
          { type: "text", text: `Páginas ${desde}–${hasta} de ${total} de "${doc.nombre}" (original).${hasta < total ? ` Continúa en la página ${hasta + 1}.` : " Fin del documento."}` },
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: recorte.toString("base64") }, title: `${doc.nombre} — pág. ${desde}-${hasta}` },
        ],
      };
    }

    if (doc.textoEstado === "sin_texto") {
      return { contenido: `"${doc.nombre}" no tiene capa de texto (escaneo o imagen). Use modo "visual" para leerlo. Páginas: ${total}.` };
    }
    if (doc.textoEstado !== "listo") {
      return { esError: true, contenido: `No hay texto extraído de "${doc.nombre}" (estado: ${doc.textoEstado}).${esPdf(doc.mime, doc.nombre) || esImagen(doc.mime) ? ' Pruebe modo "visual".' : " Pida a la empresa una versión en PDF, Word o Excel."}` };
    }
    const hastaPedida = e.pagina_hasta ?? total;
    const paginas = await leerPaginas(doc.id, desde, hastaPedida);
    let usados = 0;
    const partes: string[] = [];
    let ultima = desde - 1;
    for (const pg of paginas) {
      if (usados + pg.texto.length > MAX_TEXTO && partes.length) break;
      partes.push(`--- Página ${pg.pagina} ---\n${pg.texto}`);
      usados += pg.texto.length;
      ultima = pg.pagina;
    }
    const finPedido = Math.min(hastaPedida, total);
    const pie = ultima < finPedido ? `\n\n[Lectura cortada por tamaño en la página ${ultima}. Continúe con pagina_desde=${ultima + 1}. Total de páginas: ${total}.]` : `\n\n[Fin de lo pedido: páginas ${desde}–${ultima} de ${total}.]`;
    return { contenido: `Documento: ${doc.nombre} (transcripción auxiliar; contraste los datos críticos en modo visual)\n\n${partes.join("\n\n")}${pie}` };
  },
});

const buscarDocs = definir({
  nombre: "buscar_en_documentos",
  descripcion: "Busca una palabra, frase o código dentro del texto de los documentos del proceso y de la empresa. Devuelve documento, página y fragmento. No encuentra texto en documentos escaneados sin capa de texto.",
  esquema: z.object({
    consulta: z.string().min(2).describe("Texto a buscar"),
    documento_ids: z.array(z.string()).optional().describe("Limitar a estos documentos"),
  }),
  escribe: false,
  etiqueta: (e) => `Buscando «${e.consulta}» en los documentos`,
  async ejecutar(ctx, e) {
    const r = await buscarTexto(ctx.orgId, ctx, e.consulta, e.documento_ids);
    return { contenido: r.length ? json(r) : `Sin coincidencias para "${e.consulta}" en los documentos con texto. Los documentos escaneados requieren lectura visual.` };
  },
});

const listarReg = definir({
  nombre: "listar_registros",
  descripcion: `Lista las filas guardadas de una matriz del expediente. Tablas: ${TABLA_IDS.join(", ")}.`,
  esquema: z.object({
    tabla: z.enum(TABLA_IDS),
    codigos: z.array(z.string()).optional().describe("Solo estas filas"),
    filtro: z.object({ campo: z.string(), valor: z.string() }).optional().describe("Filtra por valor exacto de un campo, p. ej. estado"),
  }),
  escribe: false,
  etiqueta: (e) => `Consultando ${tablaDef(e.tabla).nombre.toLowerCase()}`,
  async ejecutar(ctx, e) {
    const def = tablaDef(e.tabla);
    let filas = await listarRegistrosAmbos(ctx, e.tabla);
    if (e.codigos?.length) filas = filas.filter((f) => e.codigos!.includes(f.codigo));
    if (e.filtro) filas = filas.filter((f) => String(f.data[e.filtro!.campo] ?? "").toLowerCase() === e.filtro!.valor.toLowerCase());
    const completo = filas.map((f) => ({ codigo: f.codigo, ambito: f.processId ? "proceso" : "empresa", ...f.data }));
    const texto = json(completo);
    if (texto.length <= 90_000) return { contenido: filas.length ? texto : `La tabla ${e.tabla} no tiene filas${e.filtro || e.codigos ? " con ese filtro" : ""}.` };
    const breve = filas.map((f) => ({ codigo: f.codigo, [def.campoTitulo]: String(f.data[def.campoTitulo] ?? "").slice(0, 160), ...(def.campoEstado ? { [def.campoEstado]: f.data[def.campoEstado] } : {}) }));
    return { contenido: `La tabla tiene ${filas.length} filas y no cabe completa. Vista resumida; pida el detalle con "codigos" o "filtro":\n${json(breve)}` };
  },
});

/* ─────────────────────────── Escritura ─────────────────────────── */

const guardarReg = definir({
  nombre: "guardar_registros",
  descripcion: `Crea o actualiza filas de una matriz del expediente. Si envía "codigo" de una fila existente, la actualiza fusionando solo los campos enviados; si no, la crea (el código se genera solo, o use uno propio y estable). Campos con * son obligatorios al crear. Hasta 60 filas por llamada. Tablas y campos:\n${describirTablas()}\nPara "evidencias", ambito "empresa" las guarda en el expediente corporativo reutilizable; "proceso" las deja solo en este proceso.`,
  esquema: z.object({
    tabla: z.enum(tablasEscribibles),
    ambito: z.enum(["proceso", "empresa"]).optional(),
    registros: z.array(z.record(z.string(), z.unknown())).min(1).max(60),
  }),
  escribe: true,
  etiqueta: (e) => `Guardando ${e.registros?.length ?? ""} fila(s) en ${tablaDef(e.tabla).nombre.toLowerCase()}`,
  async ejecutar(ctx, e) {
    const r = await guardarRegistros(ctx, e.tabla, e.registros, ctx.actor, e.ambito);
    return {
      esError: r.errores.length > 0 && !r.creados.length && !r.actualizados.length,
      cambios: r.creados.length || r.actualizados.length ? [e.tabla] : [],
      contenido: json({ creados: r.creados, actualizados: r.actualizados, ...(r.errores.length ? { errores: r.errores, nota: "Las filas con error NO se guardaron; corríjalas y reenvíe solo esas." } : {}) }),
    };
  },
});

const eliminarReg = definir({
  nombre: "eliminar_registros",
  descripcion: "Elimina filas de una matriz por código. Úsela para duplicados o filas erradas; para cerrar una brecha o resolver un requisito, actualice su estado en lugar de borrar.",
  esquema: z.object({ tabla: z.enum(tablasEscribibles), codigos: z.array(z.string()).min(1).max(100) }),
  escribe: true,
  etiqueta: (e) => `Eliminando ${e.codigos?.length ?? ""} fila(s) de ${tablaDef(e.tabla).nombre.toLowerCase()}`,
  async ejecutar(ctx, e) {
    const borrados = await eliminarRegistros(ctx, e.tabla, e.codigos, ctx.actor);
    return { cambios: borrados.length ? [e.tabla] : [], contenido: json({ eliminados: borrados, no_encontrados: e.codigos.filter((c) => !borrados.includes(c)) }) };
  },
});

const actualizarProc = definir({
  nombre: "actualizar_proceso",
  descripcion:
    'Actualiza la ficha del proceso con datos verificados en los documentos. "ficha" fusiona claves libres (p. ej. modulos_sectoriales, prelacion_documental, decision_participar, fundamento_decision, moneda, supuestos). No rellene campos con suposiciones: lo desconocido queda vacío y se registra como pregunta o pendiente.',
  esquema: z.object({
    nombre: z.string().optional(),
    cliente: z.string().optional(),
    codigo: z.string().optional(),
    tipo: z.enum(TIPOS_PROCESO.map((t) => t.id) as [string, ...string[]]).optional(),
    sector: z.string().optional(),
    objeto: z.string().optional(),
    lugar: z.string().optional(),
    etapa: z.string().optional(),
    fecha_limite: z.string().optional().describe('Fecha y hora límite en la zona del proceso, "AAAA-MM-DD HH:mm". Cadena vacía para borrarla.'),
    zona_horaria: z.string().optional().describe("Zona IANA del portal o del proceso, p. ej. America/Lima"),
    portal: z.string().optional(),
    ficha: z.record(z.string(), z.unknown()).optional(),
  }),
  escribe: true,
  etiqueta: () => "Actualizando la ficha del proceso",
  async ejecutar(ctx, e) {
    const { p } = await proceso(ctx.orgId, ctx.processId);
    const zona = e.zona_horaria ?? p.zonaHoraria;
    try {
      new Intl.DateTimeFormat("es", { timeZone: zona });
    } catch {
      return { esError: true, contenido: `Zona horaria no válida: "${zona}". Use un identificador IANA como America/Lima.` };
    }
    const patch: Parameters<typeof actualizarProceso>[2] = {};
    for (const k of ["nombre", "cliente", "codigo", "tipo", "sector", "objeto", "lugar", "etapa", "portal"] as const) if (e[k] !== undefined) patch[k] = e[k];
    if (e.zona_horaria) patch.zonaHoraria = zona;
    if (e.fecha_limite !== undefined) patch.fechaLimite = e.fecha_limite.trim() ? localAUtc(e.fecha_limite, zona) : null;
    if (e.ficha) patch.ficha = { ...p.ficha, ...e.ficha };
    if (patch.nombre !== undefined && !patch.nombre.trim()) return { esError: true, contenido: "El nombre del proceso no puede quedar vacío." };
    await actualizarProceso(ctx.orgId, ctx.processId, patch);
    await auditar(ctx.orgId, ctx.actor, "proceso.actualizar", { processId: ctx.processId, entidad: "proceso", entidadId: ctx.processId, detalle: { campos: Object.keys(e) } });
    return { cambios: ["proceso"], contenido: `Ficha del proceso actualizada: ${Object.keys(e).join(", ")}.` };
  },
});

const actualizarEmp = definir({
  nombre: "actualizar_empresa",
  descripcion:
    'Actualiza la ficha corporativa reutilizable de la empresa con datos tomados de sus documentos. "perfil" fusiona secciones libres (p. ej. datos_legales, poderes, situacion_tributaria, registros, experiencia, personal, equipos, capacidad_financiera, seguros, certificaciones, autorizaciones); en cada dato indique la fuente y su fecha.',
  esquema: z.object({
    razon_social: z.string().optional(),
    ruc: z.string().optional(),
    modalidad: z.enum(["individual", "consorcio"]).optional(),
    sector: z.string().optional(),
    representante: z.string().optional(),
    perfil: z.record(z.string(), z.unknown()).optional(),
  }),
  escribe: true,
  etiqueta: () => "Actualizando la ficha corporativa",
  async ejecutar(ctx, e) {
    const { c } = await proceso(ctx.orgId, ctx.processId);
    if (e.razon_social !== undefined && !e.razon_social.trim()) return { esError: true, contenido: "La razón social no puede quedar vacía." };
    await actualizarEmpresa(ctx.orgId, ctx.companyId, {
      ...(e.razon_social !== undefined ? { razonSocial: e.razon_social.trim() } : {}),
      ...(e.ruc !== undefined ? { ruc: e.ruc.trim() } : {}),
      ...(e.modalidad ? { modalidad: e.modalidad } : {}),
      ...(e.sector !== undefined ? { sector: e.sector } : {}),
      ...(e.representante !== undefined ? { representante: e.representante.trim() } : {}),
      ...(e.perfil ? { perfil: { ...c.perfil, ...e.perfil } } : {}),
    });
    await auditar(ctx.orgId, ctx.actor, "empresa.actualizar", { processId: ctx.processId, entidad: "empresa", entidadId: ctx.companyId, detalle: { campos: Object.keys(e) } });
    return { cambios: ["empresa"], contenido: `Ficha corporativa actualizada: ${Object.keys(e).join(", ")}.` };
  },
});

const clasificarDoc = definir({
  nombre: "clasificar_documento",
  descripcion: `Corrige la categoría, el tipo de versión o la descripción de un documento después de leerlo. Categorías: ${CATEGORIA_IDS.join(", ")}. Versiones: ${VERSIONES_DOC.join(", ")}. La categoría "constancia" es solo para la constancia verificable de presentación.`,
  esquema: z.object({
    documento_id: z.string(),
    categoria: z.enum(CATEGORIA_IDS).optional(),
    version: z.enum(VERSIONES_DOC).optional(),
    descripcion: z.string().max(500).optional(),
  }),
  escribe: true,
  etiqueta: () => "Clasificando documento",
  async ejecutar(ctx, e) {
    const doc = await documentoEnAmbito(ctx.orgId, ctx, e.documento_id);
    await actualizarDocumento(ctx.orgId, doc.id, { ...(e.categoria ? { categoria: e.categoria } : {}), ...(e.version ? { version: e.version } : {}), ...(e.descripcion !== undefined ? { descripcion: e.descripcion } : {}) });
    await auditar(ctx.orgId, ctx.actor, "documento.clasificar", { processId: ctx.processId, entidad: "documento", entidadId: doc.id, detalle: { nombre: doc.nombre, categoria: e.categoria, version: e.version } });
    return { cambios: ["documentos"], contenido: `"${doc.nombre}" clasificado.` };
  },
});

const plantearPreguntas = definir({
  nombre: "plantear_preguntas",
  descripcion: "Registra preguntas críticas para la empresa (máximo cinco abiertas a la vez). Solo para datos que no están en los documentos ni en el contexto y que bloquean una decisión o un requisito. La empresa responde en la pestaña «Datos críticos»; las respuestas aparecen en obtener_contexto.",
  esquema: z.object({ preguntas: z.array(z.object({ pregunta: z.string().min(5), motivo: z.string().min(3).describe("Por qué es crítica y qué desbloquea") })).min(1).max(5) }),
  escribe: true,
  etiqueta: (e) => `Planteando ${e.preguntas?.length ?? ""} pregunta(s) a la empresa`,
  async ejecutar(ctx, e) {
    const previas = await listarRegistros(ctx, "preguntas");
    const abiertas = previas.filter((q) => q.data.estado === "abierta");
    if (abiertas.length + e.preguntas.length > 5) {
      return {
        esError: true,
        contenido: `Ya hay ${abiertas.length} pregunta(s) abiertas y el máximo por ronda es cinco. Abiertas: ${json(abiertas.map((q) => ({ codigo: q.codigo, pregunta: q.data.pregunta })))}. Priorice, espere respuestas o avance con lo que no dependa de ellas.`,
      };
    }
    const ronda = previas.reduce((m, q) => Math.max(m, Number(q.data.ronda ?? 0)), 0) + (abiertas.length ? 0 : 1);
    const r = await guardarRegistros(ctx, "preguntas", e.preguntas.map((q) => ({ ...q, ronda, estado: "abierta" })), ctx.actor);
    return { cambios: ["preguntas"], contenido: json({ registradas: r.creados, ronda, errores: r.errores }) };
  },
});

const crearEntreg = definir({
  nombre: "crear_entregable",
  descripcion: `Crea (o versiona, si repite tipo y título) un documento redactado del expediente. El contenido va en Markdown (títulos, listas, tablas); la plataforma lo entrega en Word y PDF, con la leyenda de borrador. Tipos: ${ENTREGABLE_IDS.join(", ")}. destino "cliente" es para lo que saldrá de la empresa: no incluya ahí costos internos, márgenes, límites de negociación ni comentarios internos. Un dato desconocido se escribe como [PENDIENTE: qué falta]; mientras existan marcas así el documento no puede aprobarse.`,
  esquema: z.object({
    tipo: z.enum(ENTREGABLE_IDS),
    titulo: z.string().min(3).max(200),
    contenido_markdown: z.string().min(20),
    destino: z.enum(["interno", "cliente"]).optional(),
  }),
  escribe: true,
  etiqueta: (e) => `Redactando «${e.titulo ?? "entregable"}»`,
  async ejecutar(ctx, e) {
    const ent = await crearEntregable(ctx.orgId, ctx.processId, { tipo: e.tipo, titulo: e.titulo.trim(), contenidoMd: e.contenido_markdown, destino: e.destino ?? "interno", creadoPor: ctx.actor.tipo === "agente" ? "agente" : `usuario:${ctx.actor.id}` });
    const pendientes = (e.contenido_markdown.match(/\[PENDIENTE/gi) ?? []).length;
    await auditar(ctx.orgId, ctx.actor, "entregable.crear", { processId: ctx.processId, entidad: "entregable", entidadId: ent.id, detalle: { tipo: e.tipo, titulo: ent.titulo, version: ent.version, pendientes } });
    return {
      cambios: ["entregables"],
      contenido: json({ entregable: ent.titulo, tipo: tipoEntregable(ent.tipo), version: ent.version, estado: "borrador", destino: ent.destino, pendientes_visibles: pendientes, nota: "Disponible en la pestaña Entregables para descarga en Word y PDF y para revisión humana." }),
    };
  },
});

const solicitarAprob = definir({
  nombre: "solicitar_aprobacion",
  descripcion: `Pide a una persona autorizada que apruebe una acción externa que usted no puede ni debe ejecutar. Acciones: ${ACCION_IDS.map((a) => `${a} (${accionAprobacion(a)})`).join("; ")}. Sea concreto: a quién, qué versión, qué contenido, qué precio y qué efecto produce. La aprobación no ejecuta nada: autoriza a la persona a hacerlo fuera de la plataforma.`,
  esquema: z.object({
    accion: z.enum(ACCION_IDS),
    descripcion: z.string().min(10),
    destinatario: z.string().describe("A quién se dirige la acción (cliente, entidad, portal, evaluador)"),
    version: z.string().describe("Versión exacta del paquete o documento"),
    contenido: z.string().describe("Qué incluye lo que se enviaría, presentaría o firmaría"),
    precio: z.string().optional().describe("Importe y moneda, si aplica"),
    efecto: z.string().describe("Consecuencia de ejecutar la acción (vinculante, irreversible, plazo, costo)"),
  }),
  escribe: true,
  etiqueta: (e) => `Solicitando aprobación: ${accionAprobacion(e.accion ?? "")}`,
  async ejecutar(ctx, e) {
    const [a] = await db
      .insert(schema.aprobaciones)
      .values({ orgId: ctx.orgId, processId: ctx.processId, accion: e.accion, descripcion: e.descripcion, destinatario: e.destinatario, versionRef: e.version, contenido: e.contenido, precio: e.precio ?? "", efecto: e.efecto, solicitadaPor: "agente" })
      .returning();
    await auditar(ctx.orgId, ctx.actor, "aprobacion.solicitar", { processId: ctx.processId, entidad: "aprobacion", entidadId: a.id, detalle: { accion: e.accion, destinatario: e.destinatario, version: e.version } });
    return { cambios: ["aprobaciones"], contenido: "Solicitud registrada como PENDIENTE. Una persona con rol de aprobador debe resolverla en la pestaña Aprobaciones. No dé la acción por autorizada hasta verla aprobada en obtener_contexto." };
  },
});

const cambiarEstadoProc = definir({
  nombre: "cambiar_estado_proceso",
  descripcion: `Propone el estado del expediente: ${ESTADOS_DEL_AGENTE.join(", ")}. La plataforma aplica compuertas y puede rechazarlo con motivos. En "listo_aprobacion_firma" puede indicar en pendientes_de_firma los códigos de requisitos que solo esperan firma o aprobación expresamente identificada.`,
  esquema: z.object({
    estado: z.enum(ESTADOS_DEL_AGENTE as [string, ...string[]]),
    fundamento: z.string().min(10),
    pendientes_de_firma: z.array(z.string()).optional(),
  }),
  escribe: true,
  etiqueta: (e) => `Proponiendo estado: ${estadoProceso(e.estado ?? "").nombre}`,
  async ejecutar(ctx, e) {
    const r = await cambiarEstado(ctx, e.estado, ctx.actor, { fundamento: e.fundamento, pendientesDeFirma: e.pendientes_de_firma });
    if (!r.ok) return { esError: true, contenido: `La compuerta rechazó el cambio a "${e.estado}". Motivos:\n- ${r.motivos.join("\n- ")}` };
    return { cambios: ["proceso"], contenido: `Estado del expediente: ${estadoProceso(e.estado).nombre}.${r.avisos.length ? ` Avisos: ${r.avisos.join(" ")}` : ""}` };
  },
});

/* ─────────────────────────── Cálculo ─────────────────────────── */

const calcPlazo = definir({
  nombre: "calcular_plazo",
  descripcion: "Suma o resta días a una fecha. En días hábiles excluye sábados, domingos y feriados nacionales del Perú de referencia; el día de partida no se cuenta. Devuelve los feriados saltados y una advertencia sobre lo que debe verificarse. Use dias negativo para contar hacia atrás.",
  esquema: z.object({
    desde: z.string().describe("AAAA-MM-DD"),
    dias: z.number().int(),
    tipo: z.enum(["habiles", "calendario"]),
    feriados_adicionales: z.array(z.string()).optional().describe("Fechas AAAA-MM-DD no laborables adicionales verificadas"),
  }),
  escribe: false,
  etiqueta: (e) => `Calculando plazo (${e.dias} días ${e.tipo})`,
  async ejecutar(_ctx, e) {
    try {
      return { contenido: json(calcularPlazo(e.desde, e.dias, e.tipo, e.feriados_adicionales)) };
    } catch (err) {
      return { esError: true, contenido: err instanceof Error ? err.message : String(err) };
    }
  },
});

const calcular = definir({
  nombre: "calcular",
  descripcion: "Evalúa operaciones aritméticas de forma exacta y reproducible. Operadores + - * / ^ % y paréntesis; funciones redondear(x, decimales), suma(...), min(...), max(...), abs(x). Decimales con punto, sin separador de miles. Úsela para todo total, porcentaje o conversión que vaya a un documento.",
  esquema: z.object({ operaciones: z.array(z.object({ etiqueta: z.string(), expresion: z.string() })).min(1).max(40) }),
  escribe: false,
  etiqueta: (e) => `Calculando ${e.operaciones?.length ?? ""} operación(es)`,
  async ejecutar(_ctx, e) {
    const res = e.operaciones.map((o) => {
      try {
        const v = evaluar(o.expresion);
        return { etiqueta: o.etiqueta, expresion: o.expresion, resultado: v, redondeado_2: Math.round((v + Number.EPSILON) * 100) / 100 };
      } catch (err) {
        return { etiqueta: o.etiqueta, expresion: o.expresion, error: err instanceof Error ? err.message : String(err) };
      }
    });
    return { contenido: json(res), esError: res.every((r) => "error" in r) };
  },
});

const resumenPresupuesto = definir({
  nombre: "resumen_presupuesto",
  descripcion: "Totaliza el presupuesto guardado (cantidad × precio unitario) por moneda, categoría y visibilidad, y el flujo de caja por escenario y periodo. No aplica impuestos ni convierte monedas: eso se decide y sustenta aparte.",
  esquema: z.object({}),
  escribe: false,
  etiqueta: () => "Totalizando presupuesto y flujo de caja",
  async ejecutar(ctx) {
    const [partidas, flujo] = await Promise.all([listarRegistros(ctx, "presupuesto"), listarRegistros(ctx, "flujo_caja")]);
    const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
    const porMoneda: Record<string, { total: number; cliente: number; interno: number; por_categoria: Record<string, number> }> = Object.create(null);
    const incompletas: string[] = [];
    for (const f of partidas) {
      const { cantidad, precio_unitario, moneda, categoria, visibilidad } = f.data as Record<string, unknown>;
      if (typeof cantidad !== "number" || typeof precio_unitario !== "number") {
        incompletas.push(f.codigo);
        continue;
      }
      const m = String(moneda || "(sin moneda)");
      const g = (porMoneda[m] ??= { total: 0, cliente: 0, interno: 0, por_categoria: Object.create(null) });
      const sub = cantidad * precio_unitario;
      g.total += sub;
      g[visibilidad === "cliente" ? "cliente" : "interno"] += sub;
      g.por_categoria[String(categoria || "(sin categoría)")] = (g.por_categoria[String(categoria || "(sin categoría)")] ?? 0) + sub;
    }
    for (const g of Object.values(porMoneda)) {
      g.total = r2(g.total);
      g.cliente = r2(g.cliente);
      g.interno = r2(g.interno);
      for (const k of Object.keys(g.por_categoria)) g.por_categoria[k] = r2(g.por_categoria[k]);
    }
    const caja: Record<string, Record<string, { ingresos: number; egresos: number; neto: number }>> = Object.create(null);
    for (const f of flujo) {
      const d = f.data as Record<string, unknown>;
      if (typeof d.monto !== "number") continue;
      const clave = `${d.escenario ?? "base"} · ${d.moneda || "(sin moneda)"}`;
      const per = ((caja[clave] ??= Object.create(null))[String(d.periodo)] ??= { ingresos: 0, egresos: 0, neto: 0 });
      if (d.tipo === "ingreso") per.ingresos = r2(per.ingresos + d.monto);
      else per.egresos = r2(per.egresos + d.monto);
      per.neto = r2(per.ingresos - per.egresos);
    }
    return { contenido: json({ partidas: partidas.length, presupuesto_por_moneda: porMoneda, partidas_sin_cantidad_o_precio: incompletas, flujo_de_caja: caja, nota: "Subtotales sin impuestos. No se suman monedas distintas." }) };
  },
});

/* ─────────────────────────── Delegación ─────────────────────────── */

const consultarEsp = definir({
  nombre: "consultar_especialista",
  descripcion: `Ejecuta una pasada independiente del modelo con un rol especializado y contexto propio (no ve esta conversación y solo puede leer). Roles: ${ROL_IDS.map((r) => `${r} (${ROLES_ESPECIALISTA[r].nombre})`).join("; ")}. Dé un encargo autosuficiente: qué revisar, en qué documentos o tablas y qué decisión depende de ello. El rol auditoria_final deja registro en la tabla revisiones.`,
  esquema: z.object({ rol: z.enum(ROL_IDS), encargo: z.string().min(30) }),
  escribe: false,
  etiqueta: (e) => `Consultando especialista: ${ROLES_ESPECIALISTA[e.rol as RolEspecialista]?.nombre ?? e.rol}`,
  async ejecutar(ctx, e) {
    if (!ctx.consultarEspecialista) return { esError: true, contenido: "Un especialista no puede delegar en otro especialista." };
    const informe = await ctx.consultarEspecialista(e.rol, e.encargo);
    return { contenido: informe, cambios: e.rol === "auditoria_final" ? ["revisiones"] : [] };
  },
});

export const HERRAMIENTAS: Herramienta[] = [
  obtenerContexto,
  listarDocs,
  leerDocumento,
  buscarDocs,
  listarReg,
  guardarReg,
  eliminarReg,
  actualizarProc,
  actualizarEmp,
  clasificarDoc,
  plantearPreguntas,
  crearEntreg,
  solicitarAprob,
  cambiarEstadoProc,
  calcPlazo,
  calcular,
  resumenPresupuesto,
  consultarEsp,
];
const POR_NOMBRE = new Map(HERRAMIENTAS.map((h) => [h.nombre, h]));

/** Deja el esquema en JSON Schema básico: sin metadatos ni cotas que solo añaden ruido. */
function limpiarEsquema(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(limpiarEsquema);
  if (!v || typeof v !== "object") return v;
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (k === "$schema" || k === "propertyNames") continue;
    if ((k === "maximum" || k === "minimum") && typeof val === "number" && Math.abs(val) >= Number.MAX_SAFE_INTEGER) continue;
    out[k] = limpiarEsquema(val);
  }
  return out;
}

export const esHerramientaWeb = (t: BetaToolUnion) => "type" in t && typeof t.type === "string" && /^web_(search|fetch)_/.test(t.type);

/** Definiciones para la API, en orden fijo (el prefijo de herramientas se cachea). */
export function definicionesApi(conWeb = env.busquedaWeb): BetaToolUnion[] {
  const propias: BetaToolUnion[] = HERRAMIENTAS.map((h) => {
    const input_schema = limpiarEsquema(z.toJSONSchema(h.esquema)) as BetaToolInputSchema;
    return { name: h.nombre, description: h.descripcion, input_schema, eager_input_streaming: true };
  });
  if (!conWeb) return propias;
  return [...propias, { type: "web_search_20260209", name: "web_search", max_uses: 8 }, { type: "web_fetch_20260209", name: "web_fetch", max_uses: 8 }];
}

export function etiquetaHerramienta(nombre: string, entrada: unknown): string {
  if (nombre === "web_search") return `Buscando en la web${typeof (entrada as { query?: string })?.query === "string" ? `: ${(entrada as { query: string }).query}` : ""}`;
  if (nombre === "web_fetch") return "Leyendo una página web";
  const h = POR_NOMBRE.get(nombre);
  if (!h) return nombre;
  try {
    return h.etiqueta((entrada ?? {}) as never);
  } catch {
    return nombre;
  }
}

/** Ejecuta una herramienta propia validando la entrada contra su esquema (con streaming ansioso la API no la valida). */
export async function ejecutarHerramienta(ctx: CtxHerramienta, nombre: string, entrada: unknown): Promise<ResultadoHerramienta> {
  const h = POR_NOMBRE.get(nombre);
  if (!h) return { esError: true, contenido: `Herramienta desconocida: ${nombre}` };
  if (h.escribe && ctx.soloLectura) return { esError: true, contenido: `"${nombre}" modifica el expediente y esta pasada es de solo lectura. Informe sus hallazgos; el coordinador decidirá qué registrar.` };
  const v = h.esquema.safeParse(entrada);
  if (!v.success) {
    return { esError: true, contenido: JSON.stringify({ ENTRADA_NO_VALIDA: z.prettifyError(v.error), entrada_recibida: JSON.stringify(entrada).slice(0, 2000) }) };
  }
  try {
    return await h.ejecutar(ctx, v.data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[herramienta ${nombre}]`, err);
    return { esError: true, contenido: `No se pudo completar ${nombre}: ${msg}` };
  }
}

export { and, eq };
