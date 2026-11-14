import postgres from "postgres";

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgres://licita:licita_dev@127.0.0.1:5432/licita_test";
  process.env.DATABASE_URL = url;
  const sql = postgres(url, { onnotice: () => {} });
  await sql.unsafe("drop schema if exists public cascade; create schema public;");
  await sql.end();
  const { migrar, sql: s2 } = await import("../src/db/client");
  await migrar();
  await s2.end();
}
