import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Deriva la URL de la base de test a partir de DATABASE_URL, agregando el sufijo
 * `_test` al nombre de la base. Idempotente: si ya termina en `_test`, la deja igual.
 */
function deriveTestUrl(base: string): { testUrl: string; adminUrl: string; testDb: string } {
  const u = new URL(base);
  const currentDb = u.pathname.replace(/^\//, "");
  const testDb = currentDb.endsWith("_test") ? currentDb : `${currentDb}_test`;

  const testU = new URL(base);
  testU.pathname = `/${testDb}`;

  // Conexión "admin" a la base de mantenimiento `postgres` para poder crear la DB.
  const adminU = new URL(base);
  adminU.pathname = "/postgres";

  return { testUrl: testU.toString(), adminUrl: adminU.toString(), testDb };
}

const base = process.env.DATABASE_URL;
if (!base) {
  console.error("DATABASE_URL no está definida.");
  process.exit(1);
}

const { testUrl, adminUrl, testDb } = deriveTestUrl(base);

// 1) Crear la base de test si no existe.
const admin = postgres(adminUrl, { max: 1 });
const exists = await admin`SELECT 1 FROM pg_database WHERE datname = ${testDb}`;
if (exists.length === 0) {
  await admin.unsafe(`CREATE DATABASE "${testDb}"`);
  console.log(`Base ${testDb} creada.`);
} else {
  console.log(`Base ${testDb} ya existe.`);
}
await admin.end();

// 2) Aplicar migraciones a la base de test.
const migrationsFolder = fileURLToPath(
  new URL("../../../../packages/db/drizzle", import.meta.url),
);
const sql = postgres(testUrl, { max: 1 });
await migrate(drizzle(sql), { migrationsFolder });
await sql.end();

console.log(`✅ Schema aplicado a ${testDb}.`);
process.exit(0);
