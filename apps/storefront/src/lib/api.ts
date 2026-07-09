import type { ProductListItem, ProductListResponse } from "@avanzar/shared";
import { apiBase } from "./config";

// Reexportamos los tipos de catálogo para que las páginas los tomen desde la
// capa de API sin duplicar contratos (fuente de verdad: @avanzar/shared).
export type { ProductListItem, ProductListResponse };

/** Error de la API pública con el status HTTP y el `code` de negocio si lo hay. */
export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export type QueryParams = Record<string, string | number | undefined>;

/**
 * Arma la URL absoluta: `base + path + ?querystring`. Omite los params
 * `undefined` o cadena vacía. Los valores numéricos se serializan como texto.
 */
export function apiUrl(path: string, query?: QueryParams): string {
  const base = apiBase();
  let url = `${base}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === "") continue;
      params.set(key, String(value));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }
  return url;
}

/**
 * GET a la API pública (catálogo, sin credenciales). Si la respuesta no es 2xx
 * lanza `ApiError` con el status (parsea `{ error, code }` si viene). En 2xx
 * devuelve el JSON tipado. Acepta un `fetch` inyectable para testear.
 */
export async function apiGet<T>(
  path: string,
  query?: QueryParams,
  opts: { fetch?: typeof fetch } = {},
): Promise<T> {
  const doFetch = opts.fetch ?? fetch;
  const res = await doFetch(apiUrl(path, query));

  if (!res.ok) {
    let message = `Error ${res.status}`;
    let code: string | undefined;
    try {
      const body = (await res.json()) as { error?: string; code?: string };
      if (body.error) message = body.error;
      code = body.code;
    } catch {
      // respuesta sin body JSON; queda el mensaje por defecto
    }
    throw new ApiError(res.status, message, code);
  }

  return (await res.json()) as T;
}
