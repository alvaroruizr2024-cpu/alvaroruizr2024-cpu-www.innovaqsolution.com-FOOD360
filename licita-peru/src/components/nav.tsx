"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function NavEnlace({ href, children, exacto = false }: { href: string; children: React.ReactNode; exacto?: boolean }) {
  const ruta = usePathname();
  const activo = exacto ? ruta === href : ruta === href || ruta.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium whitespace-nowrap transition-colors ${activo ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
    >
      {children}
    </Link>
  );
}

export function Copiar({ texto, etiqueta = "Copiar" }: { texto: string; etiqueta?: string }) {
  const [hecho, setHecho] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        const completo = texto.startsWith("/") ? `${window.location.origin}${texto}` : texto;
        await navigator.clipboard.writeText(completo);
        setHecho(true);
        setTimeout(() => setHecho(false), 1800);
      }}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-borde-fuerte bg-superficie px-3 text-[13px] font-medium hover:bg-fondo"
    >
      {hecho ? <Check size={14} className="text-ok" /> : <Copy size={14} />} {hecho ? "Copiado" : etiqueta}
    </button>
  );
}

/** Envía el formulario al cambiar el selector (para filtros y cambios rápidos). */
export function SelectorAuto({ name, defaultValue, children, className, etiqueta }: { name: string; defaultValue?: string; children: React.ReactNode; className?: string; etiqueta: string }) {
  return (
    <select name={name} defaultValue={defaultValue} aria-label={etiqueta} onChange={(e) => e.currentTarget.form?.requestSubmit()} className={className}>
      {children}
    </select>
  );
}
