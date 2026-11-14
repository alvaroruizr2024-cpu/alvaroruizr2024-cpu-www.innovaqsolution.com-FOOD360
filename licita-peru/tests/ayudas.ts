import { PDFDocument, StandardFonts } from "pdf-lib";
import { registrar } from "@/lib/cuentas";
import { crearEmpresa, crearProceso } from "@/lib/datos";
import type { Modelo, ParamsTurno, RespuestaApi } from "@/agent/modelo";
import type { CtxHerramienta } from "@/agent/tools";

let n = 0;
export const unico = (p = "x") => `${p}${Date.now().toString(36)}${++n}`;

export async function nuevaOrg(nombre = "Org") {
  const { user, org } = await registrar({ email: `${unico("u")}@prueba.pe`, nombre: "Persona de Prueba", password: "clave-segura-123", organizacion: `${nombre} ${unico()}` });
  const empresa = await crearEmpresa(org.id, { razonSocial: `Empresa ${unico()} S.A.C.`, ruc: "20123456789" });
  const proceso = await crearProceso(org.id, empresa.id, { nombre: `Proceso ${unico()}`, cliente: "Cliente de prueba" });
  return { user, org, empresa, proceso };
}

export function ctxDe(o: Awaited<ReturnType<typeof nuevaOrg>>, extra: Partial<CtxHerramienta> = {}): CtxHerramienta {
  return { orgId: o.org.id, companyId: o.empresa.id, processId: o.proceso.id, userId: o.user.id, actor: { tipo: "agente", id: "prueba" }, soloLectura: false, leidos: new Set(), ...extra };
}

export async function pdfDePrueba(paginas: string[]): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const fuente = await doc.embedFont(StandardFonts.Helvetica);
  for (const texto of paginas) {
    const page = doc.addPage([595, 842]);
    texto.split("\n").forEach((linea, i) => page.drawText(linea, { x: 50, y: 780 - i * 18, size: 12, font: fuente }));
  }
  return Buffer.from(await doc.save());
}

let k = 0;
export function mensaje(contenido: unknown[], stop: string): RespuestaApi {
  return { id: `msg_${++k}`, type: "message", role: "assistant", model: "guion", content: contenido, stop_reason: stop, stop_sequence: null, usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } as unknown as RespuestaApi;
}
export const usar = (name: string, input: unknown) => ({ type: "tool_use", id: `toolu_${++k}`, name, input });
export const texto = (text: string) => ({ type: "text", text });

/** Modelo con guion: cada paso recibe los parámetros reales del turno y devuelve la respuesta. */
export class ModeloGuion implements Modelo {
  llamadas: ParamsTurno[] = [];
  constructor(private pasos: ((p: ParamsTurno) => RespuestaApi)[]) {}
  async turno(p: ParamsTurno) {
    this.llamadas.push({ ...p, messages: structuredClone(p.messages) });
    const paso = this.pasos.shift();
    if (!paso) throw new Error("guion agotado");
    return paso(p);
  }
}
