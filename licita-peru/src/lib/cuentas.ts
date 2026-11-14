// Cuentas, contraseñas, sesiones e invitaciones. Sin dependencias de Next para poder probarlo.
import crypto from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { env } from "./env";

export { ROLES, ROL_ETIQUETA, type Rol } from "./roles";
import { ROLES, type Rol } from "./roles";

const N = 1 << 15;
const R = 8;
const P = 1;
const KEYLEN = 64;

function scrypt(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password.normalize("NFKC"), salt, KEYLEN, { N: n, r, p, maxmem: 256 * n * r }, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, N, R, P);
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verificarPassword(password: string, almacenado: string): Promise<boolean> {
  const [alg, n, r, p, saltB64, keyB64] = almacenado.split("$");
  if (alg !== "scrypt" || !saltB64 || !keyB64) return false;
  const esperado = Buffer.from(keyB64, "base64");
  const key = await scrypt(password, Buffer.from(saltB64, "base64"), Number(n), Number(r), Number(p));
  return key.length === esperado.length && crypto.timingSafeEqual(key, esperado);
}

export const sha256 = (v: string | Buffer) => crypto.createHash("sha256").update(v).digest("hex");
const nuevoToken = () => crypto.randomBytes(32).toString("base64url");
const normalizarEmail = (e: string) => e.trim().toLowerCase();

export class ErrorCuenta extends Error {}

export function validarPassword(password: string): string | null {
  if (password.length < 10) return "La contraseña debe tener al menos 10 caracteres.";
  if (password.length > 200) return "La contraseña es demasiado larga.";
  return null;
}

export async function registrar(datos: { email: string; nombre: string; password: string; organizacion: string }) {
  const email = normalizarEmail(datos.email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ErrorCuenta("Correo no válido.");
  const errPwd = validarPassword(datos.password);
  if (errPwd) throw new ErrorCuenta(errPwd);
  if (!datos.nombre.trim() || !datos.organizacion.trim()) throw new ErrorCuenta("Nombre y organización son obligatorios.");
  const passwordHash = await hashPassword(datos.password);
  return db.transaction(async (tx) => {
    const existe = await tx.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email));
    if (existe.length) throw new ErrorCuenta("Ya existe una cuenta con ese correo.");
    const [user] = await tx
      .insert(schema.users)
      .values({ email, nombre: datos.nombre.trim(), passwordHash, esAdminPlataforma: env.adminsPlataforma.includes(email) })
      .returning();
    const [org] = await tx.insert(schema.organizations).values({ nombre: datos.organizacion.trim(), planId: env.planInicial }).returning();
    await tx.insert(schema.memberships).values({ orgId: org.id, userId: user.id, rol: "propietario" });
    return { user, org };
  });
}

const MAX_INTENTOS = 6;
const BLOQUEO_MIN = 15;

export async function validarCredenciales(emailRaw: string, password: string) {
  const email = normalizarEmail(emailRaw);
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  // Mismo mensaje para usuario inexistente y contraseña errada.
  const generico = new ErrorCuenta("Correo o contraseña incorrectos.");
  if (!user) {
    await hashPassword(password); // iguala el tiempo de respuesta
    throw generico;
  }
  if (user.bloqueadoHasta && user.bloqueadoHasta > new Date()) {
    throw new ErrorCuenta(`Cuenta bloqueada temporalmente por intentos fallidos. Intenta de nuevo en ${BLOQUEO_MIN} minutos.`);
  }
  const ok = await verificarPassword(password, user.passwordHash);
  if (!ok) {
    const intentos = user.intentosFallidos + 1;
    await db
      .update(schema.users)
      .set({
        intentosFallidos: intentos >= MAX_INTENTOS ? 0 : intentos,
        bloqueadoHasta: intentos >= MAX_INTENTOS ? new Date(Date.now() + BLOQUEO_MIN * 60_000) : null,
      })
      .where(eq(schema.users.id, user.id));
    throw generico;
  }
  if (user.intentosFallidos || user.bloqueadoHasta) {
    await db.update(schema.users).set({ intentosFallidos: 0, bloqueadoHasta: null }).where(eq(schema.users.id, user.id));
  }
  return user;
}

export async function crearSesion(userId: string, orgId?: string | null) {
  let org = orgId ?? null;
  if (!org) {
    const [m] = await db.select().from(schema.memberships).where(eq(schema.memberships.userId, userId)).limit(1);
    org = m?.orgId ?? null;
  }
  const token = nuevoToken();
  const expiresAt = new Date(Date.now() + env.diasSesion * 86_400_000);
  await db.insert(schema.sessions).values({ id: sha256(token), userId, orgId: org, expiresAt });
  return { token, expiresAt };
}

export async function cerrarSesion(token: string) {
  await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
}

export type Sesion = {
  user: { id: string; email: string; nombre: string; esAdminPlataforma: boolean };
  org: { id: string; nombre: string; planId: string; estado: string };
  rol: Rol;
};

export async function sesionDesdeToken(token: string | undefined): Promise<Sesion | null> {
  if (!token) return null;
  const [fila] = await db
    .select({ s: schema.sessions, u: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, sha256(token)), gt(schema.sessions.expiresAt, new Date())));
  if (!fila) return null;
  const membresias = await db
    .select({ m: schema.memberships, o: schema.organizations })
    .from(schema.memberships)
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.memberships.orgId))
    .where(eq(schema.memberships.userId, fila.u.id));
  const actual = membresias.find((x) => x.o.id === fila.s.orgId) ?? membresias[0];
  if (!actual) return null;
  return {
    user: { id: fila.u.id, email: fila.u.email, nombre: fila.u.nombre, esAdminPlataforma: fila.u.esAdminPlataforma },
    org: { id: actual.o.id, nombre: actual.o.nombre, planId: actual.o.planId, estado: actual.o.estado },
    rol: actual.m.rol as Rol,
  };
}

export async function organizacionesDe(userId: string) {
  return db
    .select({ id: schema.organizations.id, nombre: schema.organizations.nombre, rol: schema.memberships.rol })
    .from(schema.memberships)
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.memberships.orgId))
    .where(eq(schema.memberships.userId, userId));
}

export async function cambiarOrganizacion(token: string, userId: string, orgId: string) {
  const [m] = await db
    .select()
    .from(schema.memberships)
    .where(and(eq(schema.memberships.userId, userId), eq(schema.memberships.orgId, orgId)));
  if (!m) throw new ErrorCuenta("No perteneces a esa organización.");
  await db.update(schema.sessions).set({ orgId }).where(eq(schema.sessions.id, sha256(token)));
}

/* ── Permisos ── */
const PERMISOS: Record<"editar" | "aprobar" | "administrar", Rol[]> = {
  editar: ["propietario", "admin", "editor", "revisor"],
  aprobar: ["propietario", "admin", "revisor"],
  administrar: ["propietario", "admin"],
};
export const puede = (rol: Rol, accion: keyof typeof PERMISOS) => PERMISOS[accion].includes(rol);

/* ── Invitaciones ── */
export async function crearInvitacion(orgId: string, emailRaw: string, rol: Rol, creadaPor: string) {
  const email = normalizarEmail(emailRaw);
  if (!ROLES.includes(rol) || rol === "propietario") throw new ErrorCuenta("Rol no válido para invitar.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ErrorCuenta("Correo no válido.");
  const token = nuevoToken();
  await db.insert(schema.invitations).values({ orgId, email, rol, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 7 * 86_400_000), creadaPor });
  return token;
}

export async function invitacionPorToken(token: string) {
  const [inv] = await db
    .select({ i: schema.invitations, org: schema.organizations.nombre })
    .from(schema.invitations)
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.invitations.orgId))
    .where(and(eq(schema.invitations.tokenHash, sha256(token)), isNull(schema.invitations.aceptadaAt), gt(schema.invitations.expiresAt, new Date())));
  return inv ?? null;
}

export async function aceptarInvitacion(token: string, datos: { nombre: string; password: string }) {
  const inv = await invitacionPorToken(token);
  if (!inv) throw new ErrorCuenta("La invitación no existe o ya venció.");
  const email = inv.i.email;
  return db.transaction(async (tx) => {
    let [user] = await tx.select().from(schema.users).where(eq(schema.users.email, email));
    if (user) {
      // Cuenta existente: debe demostrar que es suya con su contraseña actual.
      if (!(await verificarPassword(datos.password, user.passwordHash))) throw new ErrorCuenta("Ese correo ya tiene cuenta: ingresa tu contraseña actual para aceptar.");
    } else {
      const errPwd = validarPassword(datos.password);
      if (errPwd) throw new ErrorCuenta(errPwd);
      if (!datos.nombre.trim()) throw new ErrorCuenta("El nombre es obligatorio.");
      [user] = await tx
        .insert(schema.users)
        .values({ email, nombre: datos.nombre.trim(), passwordHash: await hashPassword(datos.password), esAdminPlataforma: env.adminsPlataforma.includes(email) })
        .returning();
    }
    await tx.insert(schema.memberships).values({ orgId: inv.i.orgId, userId: user.id, rol: inv.i.rol }).onConflictDoNothing();
    await tx.update(schema.invitations).set({ aceptadaAt: new Date() }).where(eq(schema.invitations.id, inv.i.id));
    return { user, orgId: inv.i.orgId };
  });
}
