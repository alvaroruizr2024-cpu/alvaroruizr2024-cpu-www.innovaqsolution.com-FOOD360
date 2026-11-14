// Muestra un objeto JSON libre (ficha corporativa, ficha del proceso) de forma legible.
const titulo = (k: string) => k.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

function Valor({ v }: { v: unknown }) {
  if (v === null || v === undefined || v === "") return <span className="text-tinta-3">—</span>;
  if (typeof v === "boolean") return <>{v ? "Sí" : "No"}</>;
  if (typeof v === "string" || typeof v === "number") return <span className="whitespace-pre-line break-words">{String(v)}</span>;
  if (Array.isArray(v)) {
    if (!v.length) return <span className="text-tinta-3">—</span>;
    return (
      <ul className="list-disc space-y-1 pl-4">
        {v.map((x, i) => (
          <li key={i}>
            <Valor v={x} />
          </li>
        ))}
      </ul>
    );
  }
  return <FichaLibre datos={v as Record<string, unknown>} anidada />;
}

export function FichaLibre({ datos, anidada = false }: { datos: Record<string, unknown>; anidada?: boolean }) {
  const entradas = Object.entries(datos);
  if (!entradas.length) return null;
  return (
    <dl className={anidada ? "space-y-1.5 border-l-2 border-borde pl-3" : "divide-y divide-borde"}>
      {entradas.map(([k, v]) => (
        <div key={k} className={anidada ? "" : "grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-[200px_1fr] sm:gap-4"}>
          <dt className="text-[12.5px] font-semibold text-tinta-2">{titulo(k)}</dt>
          <dd className="min-w-0 text-[13px] text-tinta">
            <Valor v={v} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
