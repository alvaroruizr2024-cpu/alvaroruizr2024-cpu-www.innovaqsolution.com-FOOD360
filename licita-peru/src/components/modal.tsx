"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({ abierto, alCerrar, titulo, children, ancho = "max-w-2xl" }: { abierto: boolean; alCerrar: () => void; titulo: string; children: ReactNode; ancho?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);
  return (
    <dialog
      ref={ref}
      onClose={alCerrar}
      onClick={(e) => {
        if (e.target === ref.current) alCerrar();
      }}
      className={`m-auto w-[calc(100vw-2rem)] ${ancho} rounded-2xl border border-borde bg-superficie p-0 text-tinta shadow-elevada`}
    >
      {abierto ? (
        <div className="flex max-h-[88vh] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-borde px-5 py-3.5">
            <h2 className="text-[15px] font-bold">{titulo}</h2>
            <button type="button" onClick={alCerrar} aria-label="Cerrar" className="rounded-md p-1 text-tinta-3 hover:bg-fondo hover:text-tinta">
              <X size={18} />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}
