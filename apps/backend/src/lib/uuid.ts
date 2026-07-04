import type { Env, MiddlewareHandler } from "hono";
import { fail } from "./responses";

/** UUID: valida el formato antes de tocar la DB (las columnas son uuid y un
 * string arbitrario haría fallar el query). Ante formato inválido respondemos
 * 404 igual que si no matcheara, sin revelar si existe o no. */
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Middleware de ruta que valida un param uuid. Si `c.req.param(name)` no matchea
 * `UUID_RE`, corta con 404 (no llega al handler ni a la DB). Genérico en el Env
 * para servir tanto en routers `Hono<AuthEnv>` como en `Hono` a secas.
 */
export function uuidParam<E extends Env = Env>(
  name: string,
): MiddlewareHandler<E> {
  return async (c, next) => {
    const value = c.req.param(name);
    if (!value || !UUID_RE.test(value)) return fail(c, 404, "No encontrado");
    await next();
  };
}
