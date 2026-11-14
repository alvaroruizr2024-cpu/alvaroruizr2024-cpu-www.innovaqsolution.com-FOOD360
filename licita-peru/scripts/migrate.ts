import { migrar, sql } from "../src/db/client";

migrar()
  .then(() => {
    console.log("migraciones aplicadas");
    return sql.end();
  })
  .catch(async (e) => {
    console.error(e);
    await sql.end();
    process.exit(1);
  });
