import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true });
const creado = () => ts("created_at").notNull().defaultNow();

export type PlanLimites = {
  empresas: number | null;
  procesosActivos: number | null;
  miembros: number | null;
  almacenamientoMb: number | null;
  presupuestoIaUsdMes: number | null;
};

/* ───────────────────────────── Identidad y tenencia ───────────────────────────── */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  nombre: text("nombre").notNull(),
  passwordHash: text("password_hash").notNull(),
  esAdminPlataforma: boolean("es_admin_plataforma").notNull().default(false),
  intentosFallidos: integer("intentos_fallidos").notNull().default(0),
  bloqueadoHasta: ts("bloqueado_hasta"),
  createdAt: creado(),
});

export const plans = pgTable("plans", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion").notNull().default(""),
  // Texto libre que define el operador (p. ej. "S/ 000 al mes"). La plataforma no fija precios.
  precioEtiqueta: text("precio_etiqueta").notNull().default("Por definir"),
  limites: jsonb("limites").$type<PlanLimites>().notNull(),
  publico: boolean("publico").notNull().default(true),
  orden: integer("orden").notNull().default(0),
});

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  planId: text("plan_id")
    .notNull()
    .references(() => plans.id),
  estado: text("estado").notNull().default("activa"), // activa | suspendida
  createdAt: creado(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha256 del token; el token solo vive en la cookie
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "set null" }),
    expiresAt: ts("expires_at").notNull(),
    createdAt: creado(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const memberships = pgTable(
  "memberships",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rol: text("rol").notNull(), // propietario | admin | editor | revisor | lector
    createdAt: creado(),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.userId] })],
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    rol: text("rol").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: ts("expires_at").notNull(),
    aceptadaAt: ts("aceptada_at"),
    creadaPor: uuid("creada_por").references(() => users.id, { onDelete: "set null" }),
    createdAt: creado(),
  },
  (t) => [index("invitations_org_idx").on(t.orgId)],
);

export const usageEvents = pgTable(
  "usage_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id"),
    processId: uuid("process_id"),
    modelo: text("modelo").notNull(),
    tipo: text("tipo").notNull(), // agente | especialista
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
    cacheWriteTokens: integer("cache_write_tokens").notNull().default(0),
    busquedasWeb: integer("busquedas_web").notNull().default(0),
    costoUsd: numeric("costo_usd", { precision: 12, scale: 6 }).notNull().default("0"),
    createdAt: creado(),
  },
  (t) => [index("usage_org_fecha_idx").on(t.orgId, t.createdAt)],
);

/* ───────────────────────────── Empresas y procesos ───────────────────────────── */

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    razonSocial: text("razon_social").notNull(),
    ruc: text("ruc").notNull().default(""),
    modalidad: text("modalidad").notNull().default("individual"), // individual | consorcio
    sector: text("sector").notNull().default(""),
    representante: text("representante").notNull().default(""),
    // Ficha corporativa reutilizable (§6 del prompt): secciones libres con fuente.
    perfil: jsonb("perfil").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: creado(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("companies_org_idx").on(t.orgId)],
);

export const processes = pgTable(
  "processes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    nombre: text("nombre").notNull(),
    cliente: text("cliente").notNull().default(""),
    codigo: text("codigo").notNull().default(""),
    tipo: text("tipo").notNull().default("por_determinar"),
    sector: text("sector").notNull().default(""),
    objeto: text("objeto").notNull().default(""),
    lugar: text("lugar").notNull().default(""),
    etapa: text("etapa").notNull().default(""),
    estado: text("estado").notNull().default("en_preparacion"),
    fechaLimite: ts("fecha_limite"),
    zonaHoraria: text("zona_horaria").notNull().default("America/Lima"),
    portal: text("portal").notNull().default(""),
    ficha: jsonb("ficha").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: creado(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("processes_org_idx").on(t.orgId), index("processes_company_idx").on(t.companyId)],
);

/* ───────────────────────────── Documentos ───────────────────────────── */

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    // null = expediente corporativo reutilizable de la empresa
    processId: uuid("process_id").references(() => processes.id, { onDelete: "cascade" }),
    nombre: text("nombre").notNull(),
    categoria: text("categoria").notNull().default("otro"),
    version: text("version").notNull().default("original"), // original | borrador | revisado | aprobado | presentado
    descripcion: text("descripcion").notNull().default(""),
    mime: text("mime").notNull(),
    tamano: integer("tamano").notNull(),
    sha256: text("sha256").notNull(),
    storageKey: text("storage_key").notNull(),
    paginas: integer("paginas"),
    textoEstado: text("texto_estado").notNull().default("pendiente"), // pendiente | listo | sin_texto | no_soportado | error
    origen: text("origen").notNull().default("usuario"), // usuario | agente
    subidoPor: uuid("subido_por"),
    createdAt: creado(),
  },
  (t) => [index("documents_org_idx").on(t.orgId), index("documents_process_idx").on(t.processId), index("documents_company_idx").on(t.companyId)],
);

export const documentPages = pgTable(
  "document_pages",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    pagina: integer("pagina").notNull(),
    texto: text("texto").notNull(),
  },
  (t) => [primaryKey({ columns: [t.documentId, t.pagina] })],
);

/* ───────────────────────────── Espacio de trabajo del expediente ───────────────────────────── */

// Tabla genérica para todas las matrices del expediente (requisitos, brechas, evidencias,
// régimen, hitos, preguntas, presupuesto, etc.). La forma de cada fila la valida
// src/lib/registros.ts; así un sector nuevo no exige migraciones.
export const registros = pgTable(
  "registros",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    processId: uuid("process_id").references(() => processes.id, { onDelete: "cascade" }),
    // process_id cuando la fila es del proceso; company_id cuando es del expediente corporativo.
    ambitoId: uuid("ambito_id").notNull(),
    tabla: text("tabla").notNull(),
    codigo: text("codigo").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
    orden: integer("orden").notNull().default(0),
    actualizadoPor: text("actualizado_por").notNull().default(""),
    createdAt: creado(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("registros_ambito_tabla_codigo").on(t.ambitoId, t.tabla, t.codigo), index("registros_org_idx").on(t.orgId)],
);

export const entregables = pgTable(
  "entregables",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    processId: uuid("process_id")
      .notNull()
      .references(() => processes.id, { onDelete: "cascade" }),
    tipo: text("tipo").notNull(),
    titulo: text("titulo").notNull(),
    contenidoMd: text("contenido_md").notNull(),
    version: integer("version").notNull().default(1),
    estado: text("estado").notNull().default("borrador"), // borrador | revisado | aprobado
    destino: text("destino").notNull().default("interno"), // interno | cliente
    creadoPor: text("creado_por").notNull().default("agente"),
    createdAt: creado(),
  },
  (t) => [index("entregables_process_idx").on(t.processId)],
);

export const aprobaciones = pgTable(
  "aprobaciones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    processId: uuid("process_id")
      .notNull()
      .references(() => processes.id, { onDelete: "cascade" }),
    accion: text("accion").notNull(),
    descripcion: text("descripcion").notNull(),
    destinatario: text("destinatario").notNull().default(""),
    versionRef: text("version_ref").notNull().default(""),
    contenido: text("contenido").notNull().default(""),
    precio: text("precio").notNull().default(""),
    efecto: text("efecto").notNull().default(""),
    estado: text("estado").notNull().default("pendiente"), // pendiente | aprobada | rechazada
    solicitadaPor: text("solicitada_por").notNull().default("agente"),
    resueltaPor: uuid("resuelta_por"),
    resueltaAt: ts("resuelta_at"),
    comentario: text("comentario").notNull().default(""),
    createdAt: creado(),
  },
  (t) => [index("aprobaciones_process_idx").on(t.processId)],
);

/* ───────────────────────────── Agente ───────────────────────────── */

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    processId: uuid("process_id")
      .notNull()
      .references(() => processes.id, { onDelete: "cascade" }),
    titulo: text("titulo").notNull().default("Sesión de trabajo"),
    creadaPor: uuid("creada_por"),
    enCursoDesde: ts("en_curso_desde"),
    createdAt: creado(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("conversations_process_idx").on(t.processId)],
);

export const messages = pgTable(
  "messages",
  {
    seq: bigserial("seq", { mode: "number" }).primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    orgId: uuid("org_id").notNull(),
    rol: text("rol").notNull(), // user | assistant
    // Bloques exactamente como se enviaron o recibieron de la API (historial de solo anexar).
    // Se guarda como texto JSON y no como jsonb: jsonb reordena las claves, y el historial debe
    // reproducirse byte a byte para conservar la caché y los bloques de razonamiento.
    contenido: text("contenido").notNull(),
    createdAt: creado(),
  },
  (t) => [index("messages_conv_idx").on(t.conversationId, t.seq)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    processId: uuid("process_id"),
    actorTipo: text("actor_tipo").notNull(), // usuario | agente | sistema
    actorId: text("actor_id").notNull().default(""),
    accion: text("accion").notNull(),
    entidad: text("entidad").notNull().default(""),
    entidadId: text("entidad_id").notNull().default(""),
    detalle: jsonb("detalle").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: creado(),
  },
  (t) => [index("audit_org_fecha_idx").on(t.orgId, t.createdAt), index("audit_process_idx").on(t.processId)],
);
