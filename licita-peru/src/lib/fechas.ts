// Cálculo de plazos en días hábiles y calendario. Todo se opera sobre fechas civiles
// "AAAA-MM-DD" (sin hora) para que la zona horaria del servidor no altere el resultado.

export type Feriado = { fecha: string; nombre: string };

const pad = (n: number) => String(n).padStart(2, "0");
const aISO = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const deISO = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) throw new Error(`fecha no válida: "${s}" (use AAAA-MM-DD)`);
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (aISO(d) !== s) throw new Error(`fecha inexistente: "${s}"`);
  return d;
};

export const esFechaISO = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/** Domingo de Pascua (algoritmo gregoriano anónimo). */
function pascua(anio: number): Date {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(anio, mes - 1, dia));
}

/**
 * Feriados nacionales del Perú usados como referencia. No incluye días no laborables
 * decretados para el sector público ni feriados regionales: deben verificarse en El Peruano
 * y añadirse como feriados adicionales cuando el proceso lo requiera.
 */
export function feriadosPeru(anio: number): Feriado[] {
  const p = pascua(anio);
  const mover = (d: Date, dias: number) => new Date(d.getTime() + dias * 86_400_000);
  const f = (mes: number, dia: number, nombre: string): Feriado => ({ fecha: `${anio}-${pad(mes)}-${pad(dia)}`, nombre });
  return [
    f(1, 1, "Año Nuevo"),
    { fecha: aISO(mover(p, -3)), nombre: "Jueves Santo" },
    { fecha: aISO(mover(p, -2)), nombre: "Viernes Santo" },
    f(5, 1, "Día del Trabajo"),
    f(6, 7, "Batalla de Arica y Día de la Bandera"),
    f(6, 29, "San Pedro y San Pablo"),
    f(7, 23, "Día de la Fuerza Aérea del Perú"),
    f(7, 28, "Fiestas Patrias"),
    f(7, 29, "Fiestas Patrias"),
    f(8, 6, "Batalla de Junín"),
    f(8, 30, "Santa Rosa de Lima"),
    f(10, 8, "Combate de Angamos"),
    f(11, 1, "Todos los Santos"),
    f(12, 8, "Inmaculada Concepción"),
    f(12, 9, "Batalla de Ayacucho"),
    f(12, 25, "Navidad"),
  ];
}

export type ResultadoPlazo = {
  desde: string;
  dias: number;
  tipo: "habiles" | "calendario";
  resultado: string;
  diaSemana: string;
  feriadosSaltados: Feriado[];
  advertencia: string;
};

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/**
 * Suma (o resta) días a una fecha. En días hábiles no cuenta sábados, domingos ni feriados;
 * el día de partida no se cuenta (el plazo corre desde el día siguiente).
 */
export function calcularPlazo(desde: string, dias: number, tipo: "habiles" | "calendario", feriadosExtra: string[] = []): ResultadoPlazo {
  if (!Number.isInteger(dias)) throw new Error("dias debe ser un número entero");
  let d = deISO(desde);
  const saltados: Feriado[] = [];
  if (tipo === "calendario") {
    d = new Date(d.getTime() + dias * 86_400_000);
  } else {
    const extra = new Set(feriadosExtra.map((x) => (deISO(x), x)));
    const cache = new Map<number, Map<string, string>>();
    const feriadoDe = (fecha: Date): string | null => {
      const iso = aISO(fecha);
      if (extra.has(iso)) return "Feriado adicional indicado";
      const anio = fecha.getUTCFullYear();
      if (!cache.has(anio)) cache.set(anio, new Map(feriadosPeru(anio).map((x) => [x.fecha, x.nombre])));
      return cache.get(anio)!.get(iso) ?? null;
    };
    const paso = dias >= 0 ? 1 : -1;
    let restantes = Math.abs(dias);
    while (restantes > 0) {
      d = new Date(d.getTime() + paso * 86_400_000);
      const dow = d.getUTCDay();
      if (dow === 0 || dow === 6) continue;
      const fer = feriadoDe(d);
      if (fer) {
        saltados.push({ fecha: aISO(d), nombre: fer });
        continue;
      }
      restantes--;
    }
  }
  return {
    desde,
    dias,
    tipo,
    resultado: aISO(d),
    diaSemana: DIAS[d.getUTCDay()],
    feriadosSaltados: saltados,
    advertencia:
      tipo === "habiles"
        ? "Cálculo con feriados nacionales de referencia. Verificar en El Peruano días no laborables y feriados regionales, y la regla de cómputo que fije el proceso."
        : "Días calendario: incluye sábados, domingos y feriados.",
  };
}

/** Fecha y hora actuales en una zona horaria IANA (por defecto America/Lima). */
export function ahoraEn(zona = "America/Lima", ahora = new Date()) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zona,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      weekday: "long",
    })
      .formatToParts(ahora)
      .map((p) => [p.type, p.value]),
  );
  const fecha = `${partes.year}-${partes.month}-${partes.day}`;
  return { fecha, hora: `${partes.hour === "24" ? "00" : partes.hour}:${partes.minute}`, diaSemana: DIAS[deISO(fecha).getUTCDay()], zona };
}

export function diasEntre(a: string, b: string): number {
  return Math.round((deISO(b).getTime() - deISO(a).getTime()) / 86_400_000);
}

export function formatoFecha(iso: string | null | undefined): string {
  if (!iso || !esFechaISO(iso)) return iso ?? "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function formatoFechaHora(d: Date | null | undefined, zona = "America/Lima"): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("es-PE", { timeZone: zona, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

/** Convierte "AAAA-MM-DD HH:mm" expresado en una zona IANA al instante UTC correspondiente. */
export function localAUtc(local: string, zona: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/.exec(local.trim());
  if (!m) throw new Error(`fecha y hora no válidas: "${local}" (use AAAA-MM-DD HH:mm)`);
  const supuesto = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: zona, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date(supuesto))
      .map((x) => [x.type, x.value]),
  );
  const comoUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
  return new Date(supuesto - (comoUtc - supuesto));
}

/** Inverso: instante UTC a "AAAA-MM-DDTHH:mm" en la zona dada (para campos datetime-local). */
export function utcALocal(d: Date, zona: string): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: zona, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${String(+p.hour % 24).padStart(2, "0")}:${p.minute}`;
}
