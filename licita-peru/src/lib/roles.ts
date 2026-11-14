// Roles de la organización. Módulo sin dependencias de servidor: lo usan también los componentes de cliente.
export const ROLES = ["propietario", "admin", "editor", "revisor", "lector"] as const;
export type Rol = (typeof ROLES)[number];
export const ROL_ETIQUETA: Record<Rol, string> = {
  propietario: "Propietario",
  admin: "Administrador",
  editor: "Editor",
  revisor: "Revisor / aprobador",
  lector: "Solo lectura",
};
