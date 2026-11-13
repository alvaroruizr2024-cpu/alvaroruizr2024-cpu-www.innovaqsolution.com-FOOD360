import type { Availability, ModuleKey } from '../domain/types';

/** Estado «fuente pendiente» estándar de un módulo, con su motivo y su lista de requisitos (claves eng.*). Para la ingesta y la integración. */
export function pendingModule(key: ModuleKey, templateFile: string | null = null): Availability {
  return { state: key === 'predictive' ? 'disabled' : 'pending', reasonKey: `eng.module.pending.${key}`, requirements: [`eng.req.${key}`], templateFile };
}
export const PENDING_CAPABLE: ModuleKey[] = ['controls', 'plan', 'actions', 'health', 'hygiene', 'cases', 'training', 'programs', 'projectsGeo', 'predictive'];
