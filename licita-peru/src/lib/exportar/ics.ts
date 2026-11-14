// Calendario del proceso en formato iCalendar (.ics), importable en Google Calendar u Outlook.
import crypto from "node:crypto";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const plegar = (linea: string) => linea.match(/.{1,73}/g)?.join("\r\n ") ?? linea;

export function hitosAIcs(d: { proceso: string; empresa: string; hitos: { codigo: string; hito: string; fecha: string; hora?: string; regla?: string; critico?: boolean }[] }): string {
  const sello = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lineas = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Licita Peru IA//Calendario//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const h of d.hitos) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(h.fecha)) continue;
    const inicio = h.fecha.replace(/-/g, "");
    const fin = new Date(Date.parse(h.fecha) + 86_400_000).toISOString().slice(0, 10).replace(/-/g, "");
    const uid = crypto.createHash("sha1").update(`${d.proceso}|${h.codigo}|${h.fecha}`).digest("hex");
    lineas.push(
      "BEGIN:VEVENT",
      `UID:${uid}@licita-peru-ia`,
      `DTSTAMP:${sello}`,
      `DTSTART;VALUE=DATE:${inicio}`,
      `DTEND;VALUE=DATE:${fin}`,
      plegar(`SUMMARY:${esc(`${h.critico ? "⚠ " : ""}${h.hito}${h.hora ? ` (${h.hora})` : ""} — ${d.proceso}`)}`),
      plegar(`DESCRIPTION:${esc(`${d.empresa} · ${d.proceso}\n${h.regla ?? ""}\nFecha de trabajo del expediente: verificar contra la comunicación oficial del proceso.`)}`),
      "END:VEVENT",
    );
  }
  lineas.push("END:VCALENDAR");
  return lineas.join("\r\n") + "\r\n";
}
