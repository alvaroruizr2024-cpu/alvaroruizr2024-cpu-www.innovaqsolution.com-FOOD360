// Empaqueta las migraciones SQL de ./drizzle en un módulo TS para que viajen
// dentro del bundle (serverless no garantiza acceso al sistema de archivos).
import fs from "node:fs";
import path from "node:path";

const dir = path.resolve("drizzle");
const journal = JSON.parse(fs.readFileSync(path.join(dir, "meta/_journal.json"), "utf8"));
const items = journal.entries.map((e) => ({
  id: e.tag,
  sql: fs.readFileSync(path.join(dir, `${e.tag}.sql`), "utf8"),
}));
const out =
  "// Archivo generado por scripts/bundle-migrations.mjs. No editar a mano.\n" +
  "export const MIGRATIONS: { id: string; sql: string }[] = " +
  JSON.stringify(items, null, 2) +
  ";\n";
fs.writeFileSync(path.resolve("src/db/migrations.generated.ts"), out);
console.log(`migraciones empaquetadas: ${items.length}`);
