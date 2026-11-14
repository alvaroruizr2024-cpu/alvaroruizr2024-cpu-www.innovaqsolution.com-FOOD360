"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import type { Campo, TablaDef } from "@/lib/registros";
import { eliminarFilaAccion, guardarFilaAccion } from "@/app/app/acciones";
import { Enviar, Formulario } from "./formulario";
import { Modal } from "./modal";
import { Area, Boton, Entrada, Etiqueta, Insignia, Selector, tonoDeEstado, Vacio } from "./ui";

export type Fila = { codigo: string; data: Record<string, unknown>; ambito: "proceso" | "empresa"; actualizadoPor: string };

const fechaCorta = (v: unknown) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v ?? ""));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v ?? "");
};
const numero = (v: unknown) => (typeof v === "number" ? v.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");

function Celda({ campo, valor }: { campo: Campo; valor: unknown }) {
  if (valor === undefined || valor === null || valor === "") return <span className="text-tinta-3/60">—</span>;
  if (campo.tipo === "enum") return <Insignia tono={tonoDeEstado(valor)}>{String(valor)}</Insignia>;
  if (campo.tipo === "bool") return valor ? <Insignia tono="acento">Sí</Insignia> : <span className="text-tinta-3">No</span>;
  if (campo.tipo === "fecha") return <span className="whitespace-nowrap tabular-nums">{fechaCorta(valor)}</span>;
  if (campo.tipo === "numero") return <span className="tabular-nums">{numero(valor)}</span>;
  return <span className="line-clamp-3 whitespace-pre-line">{String(valor)}</span>;
}

function CampoForm({ campo, valor }: { campo: Campo; valor: unknown }) {
  const nombre = `c_${campo.k}`;
  const base = { id: nombre, name: nombre, required: campo.requerido };
  let control;
  if (campo.tipo === "largo") control = <Area {...base} rows={3} defaultValue={String(valor ?? "")} />;
  else if (campo.tipo === "enum")
    control = (
      <Selector {...base} defaultValue={String(valor ?? campo.defecto ?? "")}>
        {!campo.requerido ? <option value="">—</option> : null}
        {campo.opciones!.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Selector>
    );
  else if (campo.tipo === "fecha") control = <Entrada {...base} type="date" defaultValue={String(valor ?? "")} />;
  else if (campo.tipo === "numero") control = <Entrada {...base} type="number" step="any" defaultValue={typeof valor === "number" ? String(valor) : ""} />;
  else if (campo.tipo === "bool")
    return (
      <label className="flex items-center gap-2 pt-6 text-[13px] font-medium text-tinta-2">
        <input type="checkbox" name={nombre} defaultChecked={Boolean(valor)} className="h-4 w-4 accent-primario" /> {campo.label}
      </label>
    );
  else control = <Entrada {...base} defaultValue={String(valor ?? "")} />;
  return (
    <div className={campo.tipo === "largo" ? "sm:col-span-2" : ""}>
      <Etiqueta htmlFor={nombre} ayuda={campo.interno ? "dato interno" : undefined}>
        {campo.label}
        {campo.requerido ? " *" : ""}
      </Etiqueta>
      {control}
    </div>
  );
}

export function TablaRegistros({ def, filas, processId, companyId, puedeEditar }: { def: TablaDef; filas: Fila[]; processId: string | null; companyId: string; puedeEditar: boolean }) {
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("");
  const [edit, setEdit] = useState<Fila | "nueva" | null>(null);
  const columnas = def.campos.filter((c) => c.columna);
  const estados = useMemo(() => {
    if (!def.campoEstado) return [];
    const cuenta = new Map<string, number>();
    for (const f of filas) cuenta.set(String(f.data[def.campoEstado] ?? ""), (cuenta.get(String(f.data[def.campoEstado] ?? "")) ?? 0) + 1);
    return [...cuenta.entries()].filter(([k]) => k);
  }, [filas, def.campoEstado]);

  const visibles = filas.filter((f) => {
    if (filtro && String(f.data[def.campoEstado!] ?? "") !== filtro) return false;
    if (!q.trim()) return true;
    const aguja = q.toLowerCase();
    return f.codigo.toLowerCase().includes(aguja) || Object.values(f.data).some((v) => String(v ?? "").toLowerCase().includes(aguja));
  });

  // Totales del presupuesto por moneda (no se suman monedas distintas).
  const totales = useMemo(() => {
    if (def.id !== "presupuesto") return [];
    const t = new Map<string, number>();
    for (const f of visibles) {
      const { cantidad, precio_unitario, moneda } = f.data;
      if (typeof cantidad === "number" && typeof precio_unitario === "number") t.set(String(moneda || "sin moneda"), (t.get(String(moneda || "sin moneda")) ?? 0) + cantidad * precio_unitario);
    }
    return [...t.entries()];
  }, [visibles, def.id]);

  const actual = edit && edit !== "nueva" ? edit : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-tinta-3" aria-hidden />
          <Entrada value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en la tabla…" aria-label="Buscar" className="pl-9" />
        </div>
        {estados.length > 1 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={() => setFiltro("")} className={`rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${filtro === "" ? "border-tinta bg-tinta text-white" : "border-borde-fuerte text-tinta-2 hover:bg-fondo"}`}>
              Todos · {filas.length}
            </button>
            {estados.map(([e, n]) => (
              <button key={e} type="button" onClick={() => setFiltro(filtro === e ? "" : e)} className={`rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${filtro === e ? "border-tinta bg-tinta text-white" : "border-borde-fuerte text-tinta-2 hover:bg-fondo"}`}>
                {e} · {n}
              </button>
            ))}
          </div>
        ) : null}
        {puedeEditar ? (
          <Boton tam="s" variante="secundario" className="ml-auto" onClick={() => setEdit("nueva")}>
            <Plus size={15} aria-hidden /> Agregar {def.singular}
          </Boton>
        ) : null}
      </div>

      {!filas.length ? (
        <Vacio titulo={`Sin ${def.nombre.toLowerCase()} todavía`}>{def.descripcion} Pídasela al agente o agréguela a mano.</Vacio>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-borde bg-superficie shadow-tarjeta">
          <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-borde bg-fondo text-[12px] text-tinta-2">
                <th className="px-3 py-2 font-semibold">Código</th>
                {columnas.map((c) => (
                  <th key={c.k} className={`px-3 py-2 font-semibold ${c.tipo === "numero" ? "text-right" : ""}`}>
                    {c.label}
                  </th>
                ))}
                {def.id === "presupuesto" ? <th className="px-3 py-2 text-right font-semibold">Subtotal</th> : null}
              </tr>
            </thead>
            <tbody>
              {visibles.map((f) => (
                <tr key={`${f.ambito}-${f.codigo}`} onClick={() => setEdit(f)} className="cursor-pointer border-b border-borde/70 align-top transition-colors last:border-0 hover:bg-primario-suave/40">
                  <td className="px-3 py-2 font-medium whitespace-nowrap text-tinta-2">
                    <button type="button" className="text-left hover:underline" aria-label={`Abrir ${f.codigo}`}>
                      {f.codigo}
                    </button>
                    {f.ambito === "empresa" && def.ambitos.length > 1 ? <span className="mt-0.5 block text-[11px] font-normal text-tinta-3">corporativo</span> : null}
                  </td>
                  {columnas.map((c) => (
                    <td key={c.k} className={`px-3 py-2 ${c.tipo === "largo" ? "max-w-md min-w-52" : ""} ${c.tipo === "numero" ? "text-right" : ""}`}>
                      <Celda campo={c} valor={f.data[c.k]} />
                    </td>
                  ))}
                  {def.id === "presupuesto" ? (
                    <td className="px-3 py-2 text-right tabular-nums">{typeof f.data.cantidad === "number" && typeof f.data.precio_unitario === "number" ? numero(f.data.cantidad * f.data.precio_unitario) : "—"}</td>
                  ) : null}
                </tr>
              ))}
              {!visibles.length ? (
                <tr>
                  <td colSpan={columnas.length + 2} className="px-3 py-6 text-center text-tinta-3">
                    Ninguna fila coincide con el filtro.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {totales.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px]">
          <span className="text-tinta-3">Totales de lo visible, sin impuestos:</span>
          {totales.map(([m, v]) => (
            <Insignia key={m} tono="info">
              {m}: {numero(v)}
            </Insignia>
          ))}
        </div>
      ) : null}

      <Modal abierto={edit !== null} alCerrar={() => setEdit(null)} titulo={actual ? `${def.nombre} · ${actual.codigo}` : `Agregar ${def.singular}`} ancho="max-w-3xl">
        {edit !== null ? (
          <>
            <Formulario accion={guardarFilaAccion} alExito={() => setEdit(null)} key={actual?.codigo ?? "nueva"}>
              <input type="hidden" name="tabla" value={def.id} />
              <input type="hidden" name="processId" value={processId ?? ""} />
              <input type="hidden" name="companyId" value={companyId} />
              {actual ? <input type="hidden" name="codigo" value={actual.codigo} /> : null}
              <input type="hidden" name="ambito" value={actual ? actual.ambito : processId && def.ambitos.includes("proceso") ? "proceso" : "empresa"} />
              <fieldset disabled={!puedeEditar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {def.campos.map((c) => (
                  <CampoForm key={c.k} campo={c} valor={actual?.data[c.k]} />
                ))}
              </fieldset>
              {actual?.actualizadoPor ? <p className="mt-3 text-[12px] text-tinta-3">Última modificación: {actual.actualizadoPor.startsWith("agente") ? "agente" : "una persona del equipo"}.</p> : null}
              {puedeEditar ? (
                <div className="mt-5 flex justify-end gap-2">
                  <Boton type="button" variante="fantasma" onClick={() => setEdit(null)}>
                    Cancelar
                  </Boton>
                  <Enviar>{actual ? "Guardar cambios" : "Agregar"}</Enviar>
                </div>
              ) : null}
            </Formulario>
            {actual && puedeEditar ? (
              <form
                action={async (fd) => {
                  await eliminarFilaAccion(fd);
                  setEdit(null);
                }}
                onSubmit={(e) => {
                  if (!window.confirm(`¿Eliminar ${actual.codigo}? No se puede deshacer.`)) e.preventDefault();
                }}
                className="mt-4 border-t border-borde pt-3"
              >
                <input type="hidden" name="tabla" value={def.id} />
                <input type="hidden" name="processId" value={processId ?? ""} />
                <input type="hidden" name="companyId" value={companyId} />
                <input type="hidden" name="codigo" value={actual.codigo} />
                <button type="submit" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-mal hover:underline">
                  <Trash2 size={14} aria-hidden /> Eliminar esta fila
                </button>
              </form>
            ) : null}
          </>
        ) : null}
      </Modal>
    </div>
  );
}
