/**
 * True si el error proviene de una violación de restricción UNIQUE de Postgres
 * (SQLSTATE 23505). postgres.js expone el código en la propiedad `code`.
 * Drizzle puede envolver el error original en un DrizzleQueryError cuyo `cause`
 * es el PostgresError real, por lo que también verificamos la cadena de causa.
 */
export function isUniqueViolation(err: unknown): boolean {
  const hasCode23505 = (e: unknown): boolean =>
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: unknown }).code === "23505";
  return (
    hasCode23505(err) ||
    (typeof err === "object" &&
      err !== null &&
      "cause" in err &&
      hasCode23505((err as { cause?: unknown }).cause))
  );
}
