/**
 * Bases de la API. En el servidor (SSR) usamos `API_BASE_URL` (puede apuntar a
 * un host interno); en el browser usamos `PUBLIC_API_BASE_URL` (expuesta al
 * cliente por Astro). Ambas con fallback a localhost para desarrollo.
 */
const FALLBACK = "http://localhost:3000";

export const API_BASE_URL: string =
  import.meta.env.API_BASE_URL ?? FALLBACK;

export const PUBLIC_API_BASE_URL: string =
  import.meta.env.PUBLIC_API_BASE_URL ?? FALLBACK;

/** Devuelve la base correcta según el contexto: server (SSR) vs browser. */
export function apiBase(): string {
  return import.meta.env.SSR ? API_BASE_URL : PUBLIC_API_BASE_URL;
}
