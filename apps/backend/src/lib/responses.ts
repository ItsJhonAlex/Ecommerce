import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/**
 * Error de API con forma uniforme: { error, ...extra }.
 * `extra` permite agregar campos como `code` o `productId` en errores de checkout.
 */
export function fail(
  c: Context,
  status: ContentfulStatusCode,
  message: string,
  extra?: Record<string, unknown>,
) {
  return c.json({ error: message, ...extra }, status);
}
