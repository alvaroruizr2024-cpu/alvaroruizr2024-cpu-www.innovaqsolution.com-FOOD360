// Configuración central. Todo lo que cambia entre entornos se lee aquí.

function lista(v: string | undefined): string[] {
  return (v ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const env = {
  get databaseUrl() {
    return process.env.DATABASE_URL ?? "";
  },
  get autoMigrate() {
    return (process.env.AUTO_MIGRATE ?? "1") !== "0";
  },
  get marca() {
    return process.env.NEXT_PUBLIC_MARCA ?? "LICITA PERÚ IA";
  },
  get operador() {
    return process.env.NEXT_PUBLIC_OPERADOR ?? "";
  },
  get contactoVentas() {
    return process.env.NEXT_PUBLIC_CONTACTO_VENTAS ?? "";
  },
  get adminsPlataforma() {
    return lista(process.env.PLATFORM_ADMIN_EMAILS);
  },
  get registroAbierto() {
    return (process.env.REGISTRO_ABIERTO ?? "1") !== "0";
  },
  get planInicial() {
    return process.env.PLAN_INICIAL ?? "inicial";
  },
  get diasSesion() {
    return Number(process.env.SESSION_DAYS ?? 14);
  },
  // Almacenamiento de archivos
  get storageDriver() {
    return (process.env.STORAGE_DRIVER ?? "local") as "local" | "s3";
  },
  get storageDir() {
    return process.env.STORAGE_DIR ?? "./storage";
  },
  get s3() {
    return {
      bucket: process.env.S3_BUCKET ?? "",
      region: process.env.S3_REGION ?? "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
      forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "1") !== "0",
    };
  },
  get maxArchivoMb() {
    return Number(process.env.MAX_ARCHIVO_MB ?? 40);
  },
  // Agente
  get agenteConfigurado() {
    return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) || process.env.AGENT_FAKE === "1";
  },
  get modeloAgente() {
    return process.env.AGENT_MODEL ?? "claude-opus-5-5";
  },
  get modeloEspecialista() {
    return process.env.SPECIALIST_MODEL ?? process.env.AGENT_MODEL ?? "claude-opus-5-5";
  },
  get esfuerzo() {
    return (process.env.AGENT_EFFORT ?? "high") as "low" | "medium" | "high" | "xhigh" | "max";
  },
  get esfuerzoEspecialista() {
    return (process.env.SPECIALIST_EFFORT ?? "medium") as "low" | "medium" | "high" | "xhigh" | "max";
  },
  // "default" activa el respaldo del lado del servidor ante rechazos del clasificador; "off" lo desactiva.
  get fallbacks() {
    return (process.env.AGENT_FALLBACKS ?? "default") as "default" | "off";
  },
  get busquedaWeb() {
    return (process.env.AGENT_WEB ?? "1") !== "0";
  },
  get maxIteraciones() {
    return Number(process.env.AGENT_MAX_ITER ?? 40);
  },
  get maxTokens() {
    return Number(process.env.AGENT_MAX_TOKENS ?? 64000);
  },
};
