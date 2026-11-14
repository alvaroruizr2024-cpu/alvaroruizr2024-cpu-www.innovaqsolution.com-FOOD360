// Catálogos de la plataforma: estados del proceso, tipos, categorías de documento y módulos.

export const ESTADOS_PROCESO = [
  { id: "en_preparacion", nombre: "En preparación", tono: "neutro" },
  { id: "listo_aprobacion_firma", nombre: "Listo para aprobación y firma", tono: "info" },
  { id: "listo_presentar", nombre: "Listo para presentar", tono: "info" },
  { id: "presentado", nombre: "Presentado", tono: "ok" },
  { id: "adjudicado", nombre: "Adjudicado / aprobado", tono: "ok" },
  { id: "no_adjudicado", nombre: "No adjudicado", tono: "mal" },
  { id: "desistido", nombre: "Desistido", tono: "neutro" },
  { id: "cerrado", nombre: "Cerrado", tono: "neutro" },
] as const;
export type EstadoProceso = (typeof ESTADOS_PROCESO)[number]["id"];
export const ESTADOS_ACTIVOS: EstadoProceso[] = ["en_preparacion", "listo_aprobacion_firma", "listo_presentar", "presentado"];
/** Estados que el agente puede proponer; los demás los fija una persona. */
export const ESTADOS_DEL_AGENTE: EstadoProceso[] = ["en_preparacion", "listo_aprobacion_firma", "listo_presentar", "presentado"];
export const estadoProceso = (id: string) => ESTADOS_PROCESO.find((e) => e.id === id) ?? { id, nombre: id, tono: "neutro" as const };

export const TIPOS_PROCESO = [
  { id: "por_determinar", nombre: "Por determinar" },
  { id: "privada_registro", nombre: "Privada: registro de proveedor" },
  { id: "privada_precalificacion", nombre: "Privada: precalificación" },
  { id: "privada_homologacion", nombre: "Privada: homologación" },
  { id: "privada_concurso", nombre: "Privada: concurso o licitación" },
  { id: "publica", nombre: "Contratación pública" },
  { id: "corporativo", nombre: "Expediente corporativo (sin convocatoria)" },
  { id: "otro", nombre: "Otra modalidad" },
] as const;
export const tipoProceso = (id: string) => TIPOS_PROCESO.find((e) => e.id === id)?.nombre ?? id;

export const CATEGORIAS_DOC = [
  { id: "bases", nombre: "Bases / invitación" },
  { id: "tdr", nombre: "Términos de referencia / especificaciones" },
  { id: "cuestionario", nombre: "Cuestionario de precalificación" },
  { id: "anexo", nombre: "Anexo o formato del proceso" },
  { id: "contrato", nombre: "Contrato / proforma" },
  { id: "adenda", nombre: "Adenda / modificación" },
  { id: "aclaracion", nombre: "Aclaración / absolución de consultas" },
  { id: "comunicacion", nombre: "Comunicación del cliente o evaluador" },
  { id: "evidencia", nombre: "Evidencia de la empresa" },
  { id: "corporativo", nombre: "Documento corporativo" },
  { id: "constancia", nombre: "Constancia de presentación" },
  { id: "entregable", nombre: "Entregable generado" },
  { id: "otro", nombre: "Otro" },
] as const;
export const CATEGORIA_IDS = CATEGORIAS_DOC.map((c) => c.id) as [string, ...string[]];
export const categoriaDoc = (id: string) => CATEGORIAS_DOC.find((c) => c.id === id)?.nombre ?? id;

export const VERSIONES_DOC = ["original", "borrador", "revisado", "aprobado", "presentado"] as const;

export const TIPOS_ENTREGABLE = [
  { id: "diagnostico", nombre: "Diagnóstico ejecutivo y ficha del proceso" },
  { id: "expediente_corporativo", nombre: "Expediente corporativo" },
  { id: "precalificacion", nombre: "Expediente de precalificación u homologación" },
  { id: "plan", nombre: "Plan de trabajo" },
  { id: "consultas", nombre: "Consultas y respuestas" },
  { id: "oferta_tecnica", nombre: "Oferta técnica" },
  { id: "oferta_economica", nombre: "Presupuesto y oferta económica" },
  { id: "anexos", nombre: "Anexos y declaraciones para firma" },
  { id: "control_final", nombre: "Informe de control final" },
  { id: "negociacion", nombre: "Matriz de negociación" },
  { id: "formalizacion", nombre: "Documentos de formalización" },
  { id: "obligaciones", nombre: "Registro de obligaciones" },
  { id: "otro", nombre: "Otro documento" },
] as const;
export const ENTREGABLE_IDS = TIPOS_ENTREGABLE.map((c) => c.id) as [string, ...string[]];
export const tipoEntregable = (id: string) => TIPOS_ENTREGABLE.find((c) => c.id === id)?.nombre ?? id;

export const ACCIONES_APROBACION = [
  { id: "enviar", nombre: "Enviar información o documentos a un tercero" },
  { id: "presentar", nombre: "Presentar el expediente u oferta" },
  { id: "aceptar_condiciones", nombre: "Aceptar declaraciones o condiciones" },
  { id: "registrar_compromiso", nombre: "Registrar un compromiso" },
  { id: "emitir_oferta", nombre: "Emitir una oferta vinculante" },
  { id: "firmar", nombre: "Firmar un documento" },
  { id: "contratar_evaluacion", nombre: "Contratar una evaluación o servicio" },
  { id: "pagar", nombre: "Realizar un pago" },
  { id: "otro", nombre: "Otra acción externa" },
] as const;
export const ACCION_IDS = ACCIONES_APROBACION.map((c) => c.id) as [string, ...string[]];
export const accionAprobacion = (id: string) => ACCIONES_APROBACION.find((c) => c.id === id)?.nombre ?? id;
/** Aprobaciones que habilitan pasar a «listo para presentar». */
export const ACCIONES_DE_PRESENTACION = ["presentar", "enviar", "emitir_oferta"];

export const SECTORES = [
  "Construcción, infraestructura e inmobiliario",
  "Minería, energía e hidrocarburos",
  "Industria y manufactura",
  "Transporte, logística y comercio exterior",
  "Salud, farmacia y dispositivos médicos",
  "Alimentos, agroindustria, pesca y acuicultura",
  "Tecnología, telecomunicaciones y ciberseguridad",
  "Educación, investigación y capacitación",
  "Limpieza, mantenimiento y servicios generales",
  "Seguridad privada y vigilancia",
  "Ambiente, agua, saneamiento y residuos",
  "Finanzas, seguros y servicios regulados",
  "Consultoría, auditoría y servicios profesionales",
  "Turismo, hotelería, eventos, cultura y publicidad",
  "Comercio y suministro de bienes",
  "Otro sector o combinación",
] as const;
