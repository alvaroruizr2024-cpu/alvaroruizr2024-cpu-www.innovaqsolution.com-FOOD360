"use client";

import { useState } from "react";
import { Download, Eye, Pencil, Trash2 } from "lucide-react";
import { CATEGORIAS_DOC, VERSIONES_DOC, categoriaDoc } from "@/lib/catalogos";
import { clasificarDocumentoAccion, eliminarDocumentoAccion } from "@/app/app/acciones";
import { Enviar, Formulario } from "./formulario";
import { Modal } from "./modal";
import { Area, Boton, Campo, Insignia, Selector, Vacio } from "./ui";

export type Doc = { id: string; nombre: string; categoria: string; version: string; descripcion: string; mime: string; tamano: number; paginas: number | null; textoEstado: string; origen: string; corporativo: boolean; fecha: string; sha: string };

const TEXTO: Record<string, { n: string; tono: "ok" | "alerta" | "mal" | "neutro" }> = {
  listo: { n: "con texto", tono: "ok" },
  sin_texto: { n: "solo visual", tono: "alerta" },
  no_soportado: { n: "sin lectura", tono: "neutro" },
  error: { n: "error al leer", tono: "mal" },
  pendiente: { n: "pendiente", tono: "neutro" },
};

export function DocumentosLista({ docs, puedeEditar }: { docs: Doc[]; puedeEditar: boolean }) {
  const [edit, setEdit] = useState<Doc | null>(null);
  if (!docs.length) return <Vacio titulo="Sin documentos">Suba las bases, la invitación o el cuestionario, y los documentos de la empresa. El agente solo analiza lo que está aquí.</Vacio>;
  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-borde bg-superficie shadow-tarjeta">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-borde bg-fondo text-[12px] text-tinta-2">
              <th className="px-3 py-2 font-semibold">Documento</th>
              <th className="px-3 py-2 font-semibold">Categoría</th>
              <th className="px-3 py-2 font-semibold">Versión</th>
              <th className="px-3 py-2 font-semibold">Lectura</th>
              <th className="px-3 py-2 text-right font-semibold">Tamaño</th>
              <th className="px-3 py-2 font-semibold">Subido</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => {
              const t = TEXTO[d.textoEstado] ?? TEXTO.pendiente;
              const visible = d.mime === "application/pdf" || d.mime.startsWith("image/");
              return (
                <tr key={d.id} className="border-b border-borde/70 align-top last:border-0">
                  <td className="max-w-sm px-3 py-2">
                    <p className="font-medium break-words">{d.nombre}</p>
                    <p className="mt-0.5 text-[11.5px] text-tinta-3">
                      {d.corporativo ? "Expediente corporativo · " : ""}
                      {d.paginas ? `${d.paginas} pág. · ` : ""}SHA-256 {d.sha}…{d.descripcion ? ` · ${d.descripcion}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-2">{categoriaDoc(d.categoria)}</td>
                  <td className="px-3 py-2">
                    <Insignia tono={d.version === "presentado" || d.version === "aprobado" ? "ok" : d.version === "original" ? "neutro" : "info"}>{d.version}</Insignia>
                  </td>
                  <td className="px-3 py-2">
                    <Insignia tono={t.tono}>{t.n}</Insignia>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">{(d.tamano / 1_048_576).toFixed(2)} MB</td>
                  <td className="px-3 py-2 whitespace-nowrap text-tinta-3">{d.fecha}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {visible ? (
                        <a href={`/api/documentos/${d.id}?ver=1`} target="_blank" rel="noopener" className="rounded-md p-1.5 text-tinta-3 hover:bg-fondo hover:text-tinta" aria-label={`Ver ${d.nombre}`} title="Ver">
                          <Eye size={15} />
                        </a>
                      ) : null}
                      <a href={`/api/documentos/${d.id}`} className="rounded-md p-1.5 text-tinta-3 hover:bg-fondo hover:text-tinta" aria-label={`Descargar ${d.nombre}`} title="Descargar">
                        <Download size={15} />
                      </a>
                      {puedeEditar ? (
                        <button type="button" onClick={() => setEdit(d)} className="rounded-md p-1.5 text-tinta-3 hover:bg-fondo hover:text-tinta" aria-label={`Clasificar ${d.nombre}`} title="Clasificar">
                          <Pencil size={15} />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Modal abierto={edit !== null} alCerrar={() => setEdit(null)} titulo="Clasificar documento" ancho="max-w-lg">
        {edit ? (
          <>
            <p className="mb-4 text-[13px] break-words text-tinta-2">{edit.nombre}</p>
            <Formulario accion={clasificarDocumentoAccion} alExito={() => setEdit(null)} className="space-y-3">
              <input type="hidden" name="id" value={edit.id} />
              <Campo etiqueta="Categoría">
                <Selector name="categoria" defaultValue={edit.categoria}>
                  {CATEGORIAS_DOC.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </Selector>
              </Campo>
              <Campo etiqueta="Versión" ayuda="original, borrador, revisado, aprobado o presentado">
                <Selector name="version" defaultValue={edit.version}>
                  {VERSIONES_DOC.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </Selector>
              </Campo>
              <Campo etiqueta="Descripción">
                <Area name="descripcion" rows={2} maxLength={500} defaultValue={edit.descripcion} />
              </Campo>
              <div className="flex justify-end gap-2 pt-1">
                <Boton type="button" variante="fantasma" onClick={() => setEdit(null)}>
                  Cancelar
                </Boton>
                <Enviar>Guardar</Enviar>
              </div>
            </Formulario>
            <form
              action={async (fd) => {
                await eliminarDocumentoAccion(fd);
                setEdit(null);
              }}
              onSubmit={(e) => {
                if (!window.confirm(`¿Eliminar "${edit.nombre}"? El archivo se borra del almacenamiento y no se puede recuperar.`)) e.preventDefault();
              }}
              className="mt-4 border-t border-borde pt-3"
            >
              <input type="hidden" name="id" value={edit.id} />
              <button type="submit" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-mal hover:underline">
                <Trash2 size={14} aria-hidden /> Eliminar documento
              </button>
            </form>
          </>
        ) : null}
      </Modal>
    </>
  );
}
