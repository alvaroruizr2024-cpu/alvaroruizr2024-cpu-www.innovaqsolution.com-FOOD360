// Almacenamiento de archivos: disco local (desarrollo, VM con volumen) o S3 compatible
// (AWS S3, Cloudflare R2, Supabase Storage, MinIO). Las claves son por organización y
// direccionadas por contenido, de modo que un archivo nunca cruza de una organización a otra.
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "./env";

export interface Almacen {
  put(key: string, data: Buffer, mime: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  del(key: string): Promise<void>;
}

const CLAVE_VALIDA = /^org\/[0-9a-f-]{36}\/[0-9a-f]{64}(\.[a-z0-9]+)?$/;

export function claveDe(orgId: string, sha256: string, sufijo = ""): string {
  const key = `org/${orgId}/${sha256}${sufijo}`;
  if (!CLAVE_VALIDA.test(key)) throw new Error("clave de almacenamiento no válida");
  return key;
}

function local(): Almacen {
  const raiz = path.resolve(env.storageDir);
  const ruta = (key: string) => {
    if (!CLAVE_VALIDA.test(key)) throw new Error("clave de almacenamiento no válida");
    return path.join(raiz, key);
  };
  return {
    async put(key, data) {
      const p = ruta(key);
      await fs.mkdir(path.dirname(p), { recursive: true });
      await fs.writeFile(p, data);
    },
    get: (key) => fs.readFile(ruta(key)),
    async del(key) {
      await fs.rm(ruta(key), { force: true });
    },
  };
}

function s3(): Almacen {
  const cfg = env.s3;
  if (!cfg.bucket) throw new Error("STORAGE_DRIVER=s3 requiere S3_BUCKET");
  let cliente: Promise<{ send: (cmd: unknown) => Promise<any>; mod: typeof import("@aws-sdk/client-s3") }> | null = null;
  const obtener = () =>
    (cliente ??= import("@aws-sdk/client-s3").then((mod) => {
      const s3c = new mod.S3Client({
        region: cfg.region,
        endpoint: cfg.endpoint,
        forcePathStyle: cfg.forcePathStyle,
        credentials: cfg.accessKeyId ? { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey } : undefined,
      });
      return { mod, send: (cmd: unknown) => s3c.send(cmd as never) };
    }));
  return {
    async put(key, data, mime) {
      const c = await obtener();
      await c.send(new c.mod.PutObjectCommand({ Bucket: cfg.bucket, Key: key, Body: data, ContentType: mime }));
    },
    async get(key) {
      const c = await obtener();
      const r = await c.send(new c.mod.GetObjectCommand({ Bucket: cfg.bucket, Key: key }));
      return Buffer.from(await r.Body.transformToByteArray());
    },
    async del(key) {
      const c = await obtener();
      await c.send(new c.mod.DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
    },
  };
}

let instancia: Almacen | null = null;
export function almacen(): Almacen {
  return (instancia ??= env.storageDriver === "s3" ? s3() : local());
}
