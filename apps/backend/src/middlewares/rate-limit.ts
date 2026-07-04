import type { Env, MiddlewareHandler } from "hono";
import { fail } from "../lib/responses";

type Bucket = { count: number; resetAt: number };

/**
 * Store in-memory a nivel módulo: una entrada por IP con su contador y el
 * instante en que la ventana se reinicia. Es proceso-local (suficiente para un
 * solo nodo); si en el futuro hay varias instancias, mover a un store compartido.
 */
const store = new Map<string, Bucket>();

/**
 * Deriva la IP del cliente. Detrás de un proxy/reverse-proxy, `x-forwarded-for`
 * trae la lista `client, proxy1, proxy2`: tomamos el primero. Fallback a
 * `x-real-ip` y, si nada, una constante para no romper (todos comparten cubeta).
 */
function clientIp(c: Parameters<MiddlewareHandler>[0]): string {
  const xff = c.req.header("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return c.req.header("x-real-ip")?.trim() || "unknown";
}

/**
 * Factory de rate limiting con ventana fija por IP. `windowMs` es el tamaño de
 * la ventana y `max` el máximo de requests permitidas dentro de ella. Al
 * exceder responde 429 sin llamar al handler.
 */
export function rateLimit<E extends Env = Env>({
  windowMs,
  max,
}: {
  windowMs: number;
  max: number;
}): MiddlewareHandler<E> {
  return async (c, next) => {
    const key = clientIp(c);
    const now = Date.now();
    const bucket = store.get(key);

    if (!bucket || now > bucket.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (bucket.count >= max) {
      return fail(c, 429, "Demasiadas solicitudes");
    }

    bucket.count += 1;
    await next();
  };
}

/** Limpia el store. Para aislar tests entre casos (llamar en `beforeEach`). */
export function __resetRateLimit(): void {
  store.clear();
}
