// Reapunta la conexión a la base de test. Debe correr antes de importar @avanzar/db.
const base = process.env.DATABASE_URL;
if (base) {
  const u = new URL(base);
  const dbName = u.pathname.replace(/^\//, "");
  if (!dbName.endsWith("_test")) {
    u.pathname = `/${dbName}_test`;
    process.env.DATABASE_URL = u.toString();
  }
}
