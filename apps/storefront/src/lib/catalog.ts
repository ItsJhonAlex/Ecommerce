// Helpers compartidos por las páginas de catálogo (`/productos`,
// `/categoria/[slug]`) para leer la query y traducir unidades a la unidad que
// espera el backend. Se extraen acá para no divergir entre páginas (DRY).

/** Devuelve el valor si es una cadena no vacía; si no, `undefined`. */
export function emptyToUndef(v: string | null): string | undefined {
  return v && v.trim() !== "" ? v : undefined;
}

/**
 * Convierte un precio en UNIDADES enteras (lo que tipea el usuario, ej. "10" =
 * 10 USD) a CENTAVOS (×100), que es lo que espera el backend. Si el valor no es
 * un número finito ≥ 0, devuelve `undefined` (no se filtra por él).
 */
export function unitsToMinor(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n * 100);
}
