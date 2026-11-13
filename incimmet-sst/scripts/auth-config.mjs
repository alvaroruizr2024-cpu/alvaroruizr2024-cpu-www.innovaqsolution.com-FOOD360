/* Genera private/auth.config.json (git-ignorado) a partir de variables de entorno. Nunca escribe la contraseña en claro.
 *   INCIMMET_USERS="a@x.com,b@y.com" INCIMMET_PASSWORD="…" node scripts/auth-config.mjs
 * Cada usuario queda como { id: SHA-256(sal:correo), hash: PBKDF2-SHA256(contraseña, sal:correo) }. */
import { createHash, pbkdf2Sync, randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';

const users = (process.env.INCIMMET_USERS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const password = process.env.INCIMMET_PASSWORD || '';
if (!users.length || !password) { console.error('Defina INCIMMET_USERS e INCIMMET_PASSWORD.'); process.exit(1); }
const iterations = 210000, salt = randomBytes(16).toString('base64');
const cfg = {
  v: 1, iterations, salt, createdAt: new Date().toISOString(),
  users: users.map((email) => ({
    id: createHash('sha256').update(`${salt}:${email}`).digest('hex'),
    hash: pbkdf2Sync(password, `${salt}:${email}`, iterations, 32, 'sha256').toString('base64'),
  })),
};
mkdirSync('private', { recursive: true });
writeFileSync('private/auth.config.json', JSON.stringify(cfg, null, 2));
console.log(`private/auth.config.json: ${users.length} usuarios, PBKDF2-SHA256 × ${iterations}`);
