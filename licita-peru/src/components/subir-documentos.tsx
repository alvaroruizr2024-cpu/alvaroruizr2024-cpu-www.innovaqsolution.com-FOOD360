"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { CATEGORIAS_DOC, VERSIONES_DOC } from "@/lib/catalogos";
import { Aviso, Boton, Etiqueta, Selector } from "./ui";

export function SubirDocumentos({ processId, companyId, maxMb }: { processId: string | null; companyId: string; maxMb: number }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [msg, setMsg] = useState<{ tono: "ok" | "mal" | "alerta"; texto: string } | null>(null);
  const [nombres, setNombres] = useState<string[]>([]);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSubiendo(true);
    setMsg(null);
    try {
      const res = await fetch("/api/documentos", { method: "POST", body: fd });
      const j = (await res.json().catch(() => null)) as { error?: string; subidos?: { nombre: string; texto: string }[]; reabierto?: boolean } | null;
      if (!res.ok) {
        setMsg({ tono: "mal", texto: j?.error ?? (res.status === 413 ? "El archivo supera el tamaño que acepta el servidor." : `No se pudo subir (HTTP ${res.status}).`) });
        return;
      }
      const sinTexto = (j?.subidos ?? []).filter((d) => d.texto === "sin_texto").length;
      setMsg({
        tono: j?.reabierto ? "alerta" : "ok",
        texto:
          `${j?.subidos?.length ?? 0} archivo(s) subido(s).` +
          (sinTexto ? ` ${sinTexto} no tiene(n) capa de texto: el agente los leerá en modo visual.` : "") +
          (j?.reabierto ? " El expediente estaba declarado listo y se reabrió: hay un documento nuevo del proceso que obliga a rehacer las revisiones afectadas." : ""),
      });
      form.current?.reset();
      setNombres([]);
      router.refresh();
    } catch {
      setMsg({ tono: "mal", texto: "Se perdió la conexión durante la carga. Intente de nuevo." });
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <form ref={form} onSubmit={enviar} className="rounded-xl border border-dashed border-borde-fuerte bg-superficie p-4">
      <input type="hidden" name="processId" value={processId ?? ""} />
      <input type="hidden" name="companyId" value={companyId} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_1fr_0.8fr_auto] md:items-end">
        <div>
          <Etiqueta htmlFor="archivo" ayuda={`PDF, Word, Excel, imágenes o texto · hasta ${maxMb} MB c/u`}>
            Archivos
          </Etiqueta>
          <input
            id="archivo"
            name="archivo"
            type="file"
            multiple
            required
            accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.webp,.gif,.txt,.md,.csv,.json,.xml"
            onChange={(e) => setNombres([...(e.target.files ?? [])].map((f) => f.name))}
            className="block w-full cursor-pointer rounded-lg border border-borde-fuerte bg-superficie text-[13px] file:mr-3 file:h-9 file:cursor-pointer file:border-0 file:bg-fondo file:px-3 file:text-[13px] file:font-medium file:text-tinta"
          />
        </div>
        <div>
          <Etiqueta htmlFor="categoria">Categoría</Etiqueta>
          <Selector id="categoria" name="categoria" defaultValue={processId ? "bases" : "corporativo"}>
            {CATEGORIAS_DOC.filter((c) => c.id !== "entregable").map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Selector>
        </div>
        <div>
          <Etiqueta htmlFor="version">Versión</Etiqueta>
          <Selector id="version" name="version" defaultValue="original">
            {VERSIONES_DOC.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Selector>
        </div>
        <Boton type="submit" disabled={subiendo}>
          <Upload size={15} aria-hidden /> {subiendo ? "Subiendo…" : "Subir"}
        </Boton>
      </div>
      {processId ? (
        <label className="mt-3 flex items-start gap-2 text-[13px] text-tinta-2">
          <input type="checkbox" name="ambito" value="empresa" className="mt-0.5 h-4 w-4 accent-primario" />
          <span>Guardar en el expediente corporativo de la empresa, para reutilizarlo en otros procesos (ficha RUC, poderes, estados financieros, certificados).</span>
        </label>
      ) : null}
      {nombres.length > 1 ? <p className="mt-2 text-[12px] text-tinta-3">{nombres.length} archivos seleccionados; todos tomarán la misma categoría (puede corregirla después).</p> : null}
      {msg ? (
        <Aviso tono={msg.tono} className="mt-3">
          <span role={msg.tono === "mal" ? "alert" : "status"}>{msg.texto}</span>
        </Aviso>
      ) : null}
    </form>
  );
}
