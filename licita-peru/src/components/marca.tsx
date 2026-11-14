import Link from "next/link";
import { env } from "@/lib/env";

export function Logo({ claro = false, href = "/" }: { claro?: boolean; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5" aria-label={env.marca}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primario text-white shadow-tarjeta">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 4h9l5 5v11H5z" />
          <path d="M14 4v5h5" />
          <path d="m8.5 14.5 2.3 2.3 4.7-4.8" />
        </svg>
      </span>
      <span className={`titulo text-[15px] font-extrabold tracking-tight ${claro ? "text-white" : "text-tinta"}`}>{env.marca}</span>
    </Link>
  );
}

export function PieLegal({ claro = false }: { claro?: boolean }) {
  return (
    <p className={`text-[12px] leading-relaxed ${claro ? "text-white/60" : "text-tinta-3"}`}>
      {env.marca} es una plataforma privada{env.operador ? ` operada por ${env.operador}` : ""}. No está afiliada al OECE, al MEF, a Perú Compras ni a ninguna entidad pública, y no reemplaza la asesoría legal, técnica o financiera profesional. El agente prepara
      borradores y matrices para revisión humana; no firma, no presenta ni garantiza adjudicación.
    </p>
  );
}
