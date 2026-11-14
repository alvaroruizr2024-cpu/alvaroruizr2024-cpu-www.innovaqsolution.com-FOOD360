import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: { default: `${env.marca} — Expedientes de licitación con un agente de IA`, template: `%s · ${env.marca}` },
  description: "Plataforma multiempresa con un agente de IA que arma expedientes de precalificación, homologación y licitación en Perú: requisitos, evidencias, brechas, plazos y documentos trazables.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0b1f3a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
