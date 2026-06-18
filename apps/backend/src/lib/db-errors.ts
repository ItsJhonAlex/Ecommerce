/**
 * True si el error proviene de una violación de restricción UNIQUE de Postgres
 * (SQLSTATE 23505). postgres.js expone el código en la propiedad `code`.
 */
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "23505"
  );
}
