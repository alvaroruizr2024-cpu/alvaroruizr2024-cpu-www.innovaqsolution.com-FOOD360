import { SECTORES, TIPOS_PROCESO } from "@/lib/catalogos";
import { Area, Campo, Entrada, Selector } from "./ui";

export type ValoresProceso = { nombre: string; cliente: string; codigo: string; tipo: string; sector: string; objeto: string; lugar: string; etapa: string; portal: string; zonaHoraria: string; fechaLimiteLocal: string };

/** Campos de la ficha del proceso (se usan al crearlo y al editarlo). */
export function CamposProceso({ v }: { v?: Partial<ValoresProceso> }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Campo etiqueta="Nombre del proceso *" className="sm:col-span-2">
        <Entrada name="nombre" required maxLength={200} defaultValue={v?.nombre} placeholder="Ej.: Homologación de proveedores — cliente minero" />
      </Campo>
      <Campo etiqueta="Cliente o entidad">
        <Entrada name="cliente" maxLength={200} defaultValue={v?.cliente} />
      </Campo>
      <Campo etiqueta="Código del proceso">
        <Entrada name="codigo" maxLength={120} defaultValue={v?.codigo} />
      </Campo>
      <Campo etiqueta="Modalidad" ayuda="si no lo sabe, el agente lo determina">
        <Selector name="tipo" defaultValue={v?.tipo ?? "por_determinar"}>
          {TIPOS_PROCESO.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </Selector>
      </Campo>
      <Campo etiqueta="Sector">
        <Selector name="sector" defaultValue={v?.sector ?? ""}>
          <option value="">—</option>
          {v?.sector && !(SECTORES as readonly string[]).includes(v.sector) ? <option>{v.sector}</option> : null}
          {SECTORES.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </Selector>
      </Campo>
      <Campo etiqueta="Etapa actual">
        <Entrada name="etapa" maxLength={160} defaultValue={v?.etapa} placeholder="Ej.: precalificación, consultas, oferta" />
      </Campo>
      <Campo etiqueta="Portal o canal de presentación">
        <Entrada name="portal" maxLength={200} defaultValue={v?.portal} />
      </Campo>
      <Campo etiqueta="Fecha y hora límite" ayuda="en la zona horaria indicada">
        <Entrada name="fechaLimite" type="datetime-local" defaultValue={v?.fechaLimiteLocal} />
      </Campo>
      <Campo etiqueta="Zona horaria del proceso">
        <Entrada name="zonaHoraria" defaultValue={v?.zonaHoraria ?? "America/Lima"} maxLength={60} />
      </Campo>
      <Campo etiqueta="Lugar de ejecución" className="sm:col-span-2">
        <Entrada name="lugar" maxLength={240} defaultValue={v?.lugar} />
      </Campo>
      <Campo etiqueta="Objeto" className="sm:col-span-2">
        <Area name="objeto" rows={2} maxLength={2000} defaultValue={v?.objeto} />
      </Campo>
    </div>
  );
}
