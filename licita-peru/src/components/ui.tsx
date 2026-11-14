import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

export const cx = clsx;

const BOTON = {
  primario: "bg-primario text-white hover:bg-primario-fuerte shadow-tarjeta",
  secundario: "bg-superficie text-tinta border border-borde-fuerte hover:bg-fondo",
  fantasma: "text-tinta-2 hover:bg-fondo",
  peligro: "bg-superficie text-mal border border-mal/40 hover:bg-mal-suave",
  oscuro: "bg-tinta text-white hover:bg-tinta/90",
} as const;
const TAM = { s: "h-8 px-3 text-[13px]", m: "h-9 px-4 text-sm", l: "h-11 px-6 text-[15px]" } as const;

export function claseBoton(variante: keyof typeof BOTON = "primario", tam: keyof typeof TAM = "m", extra?: string) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
    BOTON[variante],
    TAM[tam],
    extra,
  );
}

export function Boton({ variante = "primario", tam = "m", className, ...p }: ComponentProps<"button"> & { variante?: keyof typeof BOTON; tam?: keyof typeof TAM }) {
  return <button {...p} className={claseBoton(variante, tam, className)} />;
}

export function Enlace({ variante = "primario", tam = "m", className, ...p }: ComponentProps<typeof Link> & { variante?: keyof typeof BOTON; tam?: keyof typeof TAM }) {
  return <Link {...p} className={claseBoton(variante, tam, className)} />;
}

const CAMPO = "w-full rounded-lg border border-borde-fuerte bg-superficie px-3 text-sm text-tinta placeholder:text-tinta-3/70 transition-colors focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20 disabled:bg-fondo";

export function Etiqueta({ children, htmlFor, ayuda }: { children: ReactNode; htmlFor?: string; ayuda?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-[13px] font-medium text-tinta-2">
      {children}
      {ayuda ? <span className="ml-1 font-normal text-tinta-3">· {ayuda}</span> : null}
    </label>
  );
}

export function Entrada({ className, ...p }: ComponentProps<"input">) {
  return <input {...p} className={cx(CAMPO, "h-9", className)} />;
}
export function Area({ className, ...p }: ComponentProps<"textarea">) {
  return <textarea {...p} className={cx(CAMPO, "py-2 leading-relaxed", className)} />;
}
export function Selector({ className, children, ...p }: ComponentProps<"select">) {
  return (
    <select {...p} className={cx(CAMPO, "h-9 pr-8", className)}>
      {children}
    </select>
  );
}

export function Campo({ etiqueta, ayuda, children, className }: { etiqueta: string; ayuda?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Etiqueta ayuda={ayuda}>{etiqueta}</Etiqueta>
      {children}
    </div>
  );
}

const TONOS = {
  neutro: "bg-fondo text-tinta-2 border-borde-fuerte",
  info: "bg-info-suave text-info border-info/20",
  ok: "bg-ok-suave text-ok border-ok/20",
  alerta: "bg-alerta-suave text-alerta border-alerta/20",
  mal: "bg-mal-suave text-mal border-mal/20",
  acento: "bg-acento-suave text-alerta border-acento/30",
} as const;
export type Tono = keyof typeof TONOS;

export function Insignia({ tono = "neutro", children, className }: { tono?: Tono; children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-medium leading-5 whitespace-nowrap", TONOS[tono], className)}>{children}</span>;
}

/** Tono según el valor de estado de cualquier matriz. */
export function tonoDeEstado(v: unknown): Tono {
  const s = String(v ?? "").toLowerCase();
  if (["cumple verificado", "verificado", "cerrada", "cumplido", "cumplida", "respondida", "aceptada", "aprobada", "aprobado", "conforme", "verificado en fuente oficial", "verificado en documento del proceso"].includes(s)) return "ok";
  if (["no cumple", "bloqueante", "vencido", "vencida", "rechazada", "observado", "alta"].includes(s)) return "mal";
  if (["pendiente de evidencia", "abierta", "con observaciones", "fuente secundaria", "media", "no verificable"].includes(s)) return "alerta";
  if (["pendiente de validación", "en curso", "pendiente", "borrador", "propuesta", "enviada", "revisado"].includes(s)) return "info";
  return "neutro";
}

export function Tarjeta({ className, children, ...p }: ComponentProps<"section">) {
  return (
    <section {...p} className={cx("rounded-xl border border-borde bg-superficie shadow-tarjeta", className)}>
      {children}
    </section>
  );
}

export function TituloSeccion({ titulo, descripcion, acciones }: { titulo: string; descripcion?: string; acciones?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-tinta">{titulo}</h2>
        {descripcion ? <p className="mt-0.5 max-w-3xl text-[13px] text-tinta-3">{descripcion}</p> : null}
      </div>
      {acciones ? <div className="flex flex-wrap items-center gap-2">{acciones}</div> : null}
    </div>
  );
}

export function Vacio({ icono, titulo, children }: { icono?: ReactNode; titulo: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-borde-fuerte bg-superficie px-6 py-12 text-center">
      {icono ? <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primario-suave text-primario">{icono}</div> : null}
      <p className="font-semibold text-tinta">{titulo}</p>
      {children ? <div className="mt-1 max-w-md text-[13px] text-tinta-3">{children}</div> : null}
    </div>
  );
}

export function Aviso({ tono = "info", children, className }: { tono?: Tono; children: ReactNode; className?: string }) {
  return <div className={cx("rounded-lg border px-3 py-2 text-[13px]", TONOS[tono], className)}>{children}</div>;
}
