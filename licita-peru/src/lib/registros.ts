// Definición única de las matrices del expediente. De aquí salen la validación de lo que
// escribe el agente, las tablas editables de la interfaz y las hojas del Excel exportado.

export type TipoCampo = "texto" | "largo" | "enum" | "fecha" | "numero" | "bool";

export type Campo = {
  k: string;
  label: string;
  tipo: TipoCampo;
  opciones?: readonly string[];
  requerido?: boolean;
  /** Se muestra como columna en la tabla (el resto queda en el detalle). */
  columna?: boolean;
  /** Dato interno: no debe salir en paquetes destinados al cliente. */
  interno?: boolean;
  defecto?: string | number | boolean;
};

export type TablaDef = {
  id: string;
  nombre: string;
  singular: string;
  descripcion: string;
  prefijo: string;
  /** "proceso": filas del proceso. "empresa": filas del expediente corporativo reutilizable. */
  ambitos: readonly ("proceso" | "empresa")[];
  campoTitulo: string;
  campoEstado?: string;
  /** El agente no escribe aquí con la herramienta genérica (tiene una específica con reglas). */
  soloHerramientaEspecifica?: boolean;
  campos: Campo[];
};

export const ESTADOS_REQUISITO = ["cumple verificado", "no cumple", "pendiente de evidencia", "pendiente de validación", "no aplica con fundamento"] as const;
export const PRIORIDADES = ["alta", "media", "baja"] as const;
export const CARACTER = ["eliminatorio", "puntuable", "obligatorio", "informativo", "regla de proceso"] as const;

const t = (k: string, label: string, extra: Partial<Campo> = {}): Campo => ({ k, label, tipo: "texto", ...extra });
const largo = (k: string, label: string, extra: Partial<Campo> = {}): Campo => ({ k, label, tipo: "largo", ...extra });
const en = (k: string, label: string, opciones: readonly string[], extra: Partial<Campo> = {}): Campo => ({ k, label, tipo: "enum", opciones, ...extra });
const fecha = (k: string, label: string, extra: Partial<Campo> = {}): Campo => ({ k, label, tipo: "fecha", ...extra });
const num = (k: string, label: string, extra: Partial<Campo> = {}): Campo => ({ k, label, tipo: "numero", ...extra });

export const TABLAS: TablaDef[] = [
  {
    id: "requisitos",
    nombre: "Matriz maestra",
    singular: "requisito",
    descripcion: "Cada requisito descompuesto en una obligación verificable, con su evidencia, estado y brecha.",
    prefijo: "REQ",
    ambitos: ["proceso"],
    campoTitulo: "requisito",
    campoEstado: "estado",
    campos: [
      t("etapa", "Etapa", { columna: true }),
      t("lote", "Lote"),
      t("fuente", "Fuente y numeral", { columna: true }),
      largo("requisito", "Requisito", { requerido: true, columna: true }),
      t("aplicabilidad", "Aplicabilidad"),
      en("caracter", "Carácter", CARACTER, { columna: true }),
      t("evidencia_admitida", "Evidencia admitida"),
      largo("evidencia_disponible", "Evidencia disponible y ubicación"),
      t("documento_respuesta", "Documento de respuesta"),
      t("responsable", "Responsable", { columna: true }),
      t("vencimiento", "Vencimiento", { columna: true }),
      en("estado", "Estado", ESTADOS_REQUISITO, { requerido: true, columna: true }),
      largo("brecha", "Brecha"),
      largo("accion", "Acción"),
      t("puntaje", "Puntaje y método"),
      t("bloque", "Bloque"),
      t("base_estado", "Base del estado (quién y cuándo lo verificó)"),
      en("prioridad", "Prioridad", PRIORIDADES, { columna: true }),
    ],
  },
  {
    id: "brechas",
    nombre: "Brechas",
    singular: "brecha",
    descripcion: "Qué falta, qué acción la cierra, quién responde, costo, plazo y dependencia.",
    prefijo: "BR",
    ambitos: ["proceso"],
    campoTitulo: "brecha",
    campoEstado: "estado",
    campos: [
      en("prioridad", "Prioridad", PRIORIDADES, { requerido: true, columna: true }),
      t("requisito_ref", "Requisito (ref.)", { columna: true }),
      largo("brecha", "Brecha / hecho verificado", { requerido: true, columna: true }),
      largo("evidencia_faltante", "Evidencia faltante"),
      largo("accion", "Acción", { columna: true }),
      en("tipo", "Tipo", ["redactable por el agente", "debe existir realmente", "decisión de la empresa", "verificación externa"], { columna: true }),
      t("responsable", "Responsable", { columna: true }),
      t("costo_estimado", "Costo estimado"),
      t("plazo", "Plazo", { columna: true }),
      t("dependencia", "Dependencia"),
      en("estado", "Estado", ["abierta", "en curso", "cerrada"], { columna: true, defecto: "abierta" }),
      t("origen", "Origen"),
    ],
  },
  {
    id: "evidencias",
    nombre: "Evidencias",
    singular: "evidencia",
    descripcion: "Registro de evidencias: titular, emisor, vigencia, alcance, archivo, ubicación exacta y verificación.",
    prefijo: "EV",
    ambitos: ["empresa", "proceso"],
    campoTitulo: "descripcion",
    campoEstado: "estado_verificacion",
    campos: [
      largo("descripcion", "Evidencia", { requerido: true, columna: true }),
      t("titular", "Empresa titular", { columna: true }),
      t("emisor", "Emisor", { columna: true }),
      fecha("fecha_emision", "Fecha de emisión", { columna: true }),
      fecha("vigencia_hasta", "Vigencia hasta", { columna: true }),
      largo("alcance", "Alcance (sede, actividad, producto, periodo)"),
      t("documento", "Archivo original"),
      t("documento_id", "ID del documento en la plataforma"),
      t("ubicacion", "Ubicación exacta (página, sección)"),
      en("estado_verificacion", "Verificación", ["verificado", "pendiente de validación", "observado", "no verificable"], { columna: true, defecto: "pendiente de validación" }),
      t("requisitos_respaldados", "Requisitos que respalda"),
      largo("notas", "Notas"),
    ],
  },
  {
    id: "regimen",
    nombre: "Régimen y fuentes",
    singular: "entrada de régimen",
    descripcion: "Régimen aplicable, normas, versión de bases y fuente de cada conclusión.",
    prefijo: "RG",
    ambitos: ["proceso"],
    campoTitulo: "tema",
    campoEstado: "estado_verificacion",
    campos: [
      t("tema", "Tema", { requerido: true, columna: true }),
      largo("conclusion", "Conclusión", { requerido: true, columna: true }),
      t("fuente", "Fuente o norma", { columna: true }),
      t("numeral", "Artículo o numeral", { columna: true }),
      t("enlace", "Enlace"),
      fecha("fecha_consulta", "Fecha de consulta", { columna: true }),
      en("estado_verificacion", "Verificación", ["verificado en fuente oficial", "verificado en documento del proceso", "fuente secundaria", "pendiente"], { columna: true, defecto: "pendiente" }),
    ],
  },
  {
    id: "hitos",
    nombre: "Calendario",
    singular: "hito",
    descripcion: "Fechas críticas del proceso, con la regla o fuente de cada una.",
    prefijo: "H",
    ambitos: ["proceso"],
    campoTitulo: "hito",
    campoEstado: "estado",
    campos: [
      t("hito", "Hito", { requerido: true, columna: true }),
      fecha("fecha", "Fecha", { columna: true }),
      t("hora", "Hora (zona del proceso)", { columna: true }),
      largo("regla", "Regla o fuente", { columna: true }),
      en("tipo", "Tipo", ["dato", "calculado", "estimado"], { columna: true, defecto: "dato" }),
      { k: "critico", label: "Crítico", tipo: "bool", columna: true, defecto: false },
      en("estado", "Estado", ["pendiente", "cumplido", "vencido", "no aplica"], { columna: true, defecto: "pendiente" }),
    ],
  },
  {
    id: "preguntas",
    nombre: "Datos críticos faltantes",
    singular: "pregunta",
    descripcion: "Preguntas del agente a la empresa. Máximo cinco abiertas por ronda.",
    prefijo: "Q",
    ambitos: ["proceso"],
    campoTitulo: "pregunta",
    campoEstado: "estado",
    soloHerramientaEspecifica: true,
    campos: [
      num("ronda", "Ronda", { columna: true }),
      largo("pregunta", "Pregunta", { requerido: true, columna: true }),
      largo("motivo", "Por qué es crítica", { columna: true }),
      largo("respuesta", "Respuesta", { columna: true }),
      en("estado", "Estado", ["abierta", "respondida", "descartada"], { columna: true, defecto: "abierta" }),
    ],
  },
  {
    id: "consultas",
    nombre: "Consultas y observaciones",
    singular: "consulta",
    descripcion: "Consultas al comprador o entidad: referencia, problema, impacto y aclaración solicitada.",
    prefijo: "C",
    ambitos: ["proceso"],
    campoTitulo: "problema",
    campoEstado: "estado",
    campos: [
      t("referencia", "Referencia (documento y numeral)", { requerido: true, columna: true }),
      largo("problema", "Problema", { requerido: true, columna: true }),
      largo("impacto", "Impacto", { columna: true }),
      largo("aclaracion_solicitada", "Aclaración solicitada", { columna: true }),
      en("estado", "Estado", ["borrador", "aprobada", "enviada", "respondida"], { columna: true, defecto: "borrador" }),
      largo("respuesta", "Respuesta recibida"),
    ],
  },
  {
    id: "presupuesto",
    nombre: "Presupuesto",
    singular: "partida",
    descripcion: "Partidas con cantidad, unidad, precio unitario, moneda y fuente del precio.",
    prefijo: "P",
    ambitos: ["proceso"],
    campoTitulo: "partida",
    campos: [
      t("partida", "Partida", { requerido: true, columna: true }),
      largo("descripcion", "Descripción"),
      en("categoria", "Categoría", ["personal", "materiales", "equipos", "transporte", "subcontratos", "seguros", "garantías", "costos financieros", "gastos generales", "contingencias", "utilidad", "otros"], { columna: true }),
      t("unidad", "Unidad", { columna: true }),
      num("cantidad", "Cantidad", { columna: true }),
      num("precio_unitario", "Precio unitario", { columna: true }),
      t("moneda", "Moneda", { columna: true }),
      t("fuente_precio", "Fuente del precio", { columna: true }),
      fecha("fecha_precio", "Fecha del precio"),
      en("visibilidad", "Visibilidad", ["interno", "cliente"], { columna: true, defecto: "interno" }),
      largo("notas", "Supuestos y notas"),
    ],
  },
  {
    id: "flujo_caja",
    nombre: "Flujo de caja",
    singular: "movimiento",
    descripcion: "Ingresos y egresos por periodo y escenario, con su supuesto.",
    prefijo: "FC",
    ambitos: ["proceso"],
    campoTitulo: "concepto",
    campos: [
      en("escenario", "Escenario", ["base", "adverso", "otro"], { requerido: true, columna: true }),
      t("periodo", "Periodo", { requerido: true, columna: true }),
      t("concepto", "Concepto", { requerido: true, columna: true }),
      en("tipo", "Tipo", ["ingreso", "egreso"], { requerido: true, columna: true }),
      num("monto", "Monto", { requerido: true, columna: true }),
      t("moneda", "Moneda", { columna: true }),
      largo("supuesto", "Supuesto", { columna: true }),
    ],
  },
  {
    id: "negociacion",
    nombre: "Negociación",
    singular: "posición",
    descripcion: "Matriz de posiciones: lo propuesto, lo aceptado y los límites internos.",
    prefijo: "N",
    ambitos: ["proceso"],
    campoTitulo: "tema",
    campoEstado: "estado",
    campos: [
      t("tema", "Tema", { requerido: true, columna: true }),
      largo("posicion_propia", "Posición propia", { columna: true }),
      largo("posicion_contraparte", "Posición de la contraparte", { columna: true }),
      en("estado", "Estado", ["propuesta", "aceptada", "rechazada", "pendiente"], { columna: true, defecto: "pendiente" }),
      largo("limite_interno", "Límite interno de negociación", { interno: true }),
      largo("notas", "Notas"),
    ],
  },
  {
    id: "obligaciones",
    nombre: "Obligaciones",
    singular: "obligación",
    descripcion: "Registro de obligaciones para la formalización y la transferencia a ejecución.",
    prefijo: "OB",
    ambitos: ["proceso"],
    campoTitulo: "obligacion",
    campoEstado: "estado",
    campos: [
      largo("obligacion", "Obligación", { requerido: true, columna: true }),
      t("fuente", "Fuente (contrato, cláusula)", { columna: true }),
      t("responsable", "Responsable", { columna: true }),
      t("entregable", "Entregable", { columna: true }),
      t("vencimiento", "Vencimiento", { columna: true }),
      t("garantia", "Garantía asociada"),
      en("estado", "Estado", ["pendiente", "en curso", "cumplida", "vencida"], { columna: true, defecto: "pendiente" }),
    ],
  },
  {
    id: "revisiones",
    nombre: "Revisiones",
    singular: "revisión",
    descripcion: "Quién revisó, cuándo, con qué evidencia y qué observaciones quedaron.",
    prefijo: "RV",
    ambitos: ["proceso"],
    campoTitulo: "tipo",
    campoEstado: "resultado",
    campos: [
      en("tipo", "Tipo de revisión", ["técnica", "legal documental", "económica", "crítica final"], { requerido: true, columna: true }),
      t("revisor", "Revisor", { requerido: true, columna: true }),
      fecha("fecha", "Fecha", { columna: true }),
      largo("evidencia_usada", "Evidencia utilizada", { columna: true }),
      largo("observaciones", "Observaciones", { columna: true }),
      en("resultado", "Resultado", ["conforme", "con observaciones", "bloqueante"], { columna: true }),
    ],
  },
];

export const TABLA_IDS = TABLAS.map((x) => x.id) as [string, ...string[]];
const POR_ID = new Map(TABLAS.map((x) => [x.id, x]));

export function tablaDef(id: string): TablaDef {
  const d = POR_ID.get(id);
  if (!d) throw new Error(`tabla desconocida: "${id}". Tablas válidas: ${TABLA_IDS.join(", ")}`);
  return d;
}

const sinAcentos = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export type Validacion = { ok: true; data: Record<string, unknown> } | { ok: false; errores: string[] };

/**
 * Valida y normaliza una fila. Con `parcial` solo se exige lo que viene (actualización);
 * sin él se exigen los campos requeridos y se aplican valores por defecto (alta).
 */
export function validarFila(tabla: string, entrada: Record<string, unknown>, opciones: { parcial: boolean }): Validacion {
  const def = tablaDef(tabla);
  const errores: string[] = [];
  const data: Record<string, unknown> = {};
  const campos = new Map(def.campos.map((c) => [c.k, c]));

  for (const [k, v] of Object.entries(entrada)) {
    if (k === "codigo") continue;
    const c = campos.get(k);
    if (!c) {
      errores.push(`campo desconocido "${k}". Campos válidos de ${tabla}: ${def.campos.map((x) => x.k).join(", ")}`);
      continue;
    }
    if (v === null || v === undefined || v === "") {
      data[k] = c.tipo === "bool" ? false : c.tipo === "numero" ? null : "";
      continue;
    }
    switch (c.tipo) {
      case "texto":
      case "largo":
        if (typeof v === "string" || typeof v === "number") data[k] = String(v).trim();
        else errores.push(`"${k}" debe ser texto`);
        break;
      case "enum": {
        const op = c.opciones!.find((o) => sinAcentos(o) === sinAcentos(String(v)));
        if (op) data[k] = op;
        else errores.push(`"${k}" debe ser uno de: ${c.opciones!.join(" | ")} (recibido: "${String(v)}")`);
        break;
      }
      case "fecha":
        if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))) data[k] = v;
        else errores.push(`"${k}" debe ser una fecha AAAA-MM-DD (recibido: "${String(v)}")`);
        break;
      case "numero": {
        const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, ""));
        if (Number.isFinite(n)) data[k] = n;
        else errores.push(`"${k}" debe ser un número (recibido: "${String(v)}")`);
        break;
      }
      case "bool":
        if (typeof v === "boolean") data[k] = v;
        else if (["si", "sí", "true", "1"].includes(sinAcentos(String(v)))) data[k] = true;
        else if (["no", "false", "0"].includes(sinAcentos(String(v)))) data[k] = false;
        else errores.push(`"${k}" debe ser verdadero o falso`);
        break;
    }
  }

  if (!opciones.parcial) {
    for (const c of def.campos) {
      const vacio = data[c.k] === undefined || data[c.k] === "" || data[c.k] === null;
      if (vacio && c.defecto !== undefined) data[c.k] = c.defecto;
      else if (vacio && c.requerido) errores.push(`falta el campo obligatorio "${c.k}" (${c.label})`);
    }
  } else {
    for (const c of def.campos) {
      if (c.requerido && c.k in data && (data[c.k] === "" || data[c.k] === null)) errores.push(`"${c.k}" es obligatorio y no puede quedar vacío`);
    }
  }
  return errores.length ? { ok: false, errores } : { ok: true, data };
}

/** Texto compacto para describir las tablas al agente dentro de la definición de herramientas. */
export function describirTablas(): string {
  return TABLAS.filter((x) => !x.soloHerramientaEspecifica)
    .map((d) => {
      const campos = d.campos
        .map((c) => {
          const tipo = c.tipo === "enum" ? `uno de [${c.opciones!.join(" | ")}]` : c.tipo === "fecha" ? "AAAA-MM-DD" : c.tipo === "numero" ? "número" : c.tipo === "bool" ? "booleano" : "texto";
          return `${c.k}${c.requerido ? "*" : ""}: ${tipo}`;
        })
        .join("; ");
      return `- ${d.id} (${d.nombre}; ámbito ${d.ambitos.join(" o ")}): ${campos}`;
    })
    .join("\n");
}
