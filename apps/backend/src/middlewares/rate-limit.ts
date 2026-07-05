import type { Env, MiddlewareHandler } from "hono";
import { fail } from "../lib/responses";

type Bucket = { count: number; resetAt: number };

/**
 * Store in-memory a nivel módulo: una entrada por cliente con su contador y el
 * instante en que la ventana se reinicia. Es proceso-local (suficiente para un
 * solo nodo); con varias instancias, mover a un store compartido (Redis).
 */
const store = new Map<string, Bucket>();

/** Último sweep de entradas vencidas (acota el costo de purgar el Map). */
let lastSweep = 0;

/**
 * Borra las entradas cuya ventana ya venció. Se llama a lo sumo una vez por
 * ventana para que el `Map` no crezca sin límite ante muchas IPs distintas.
 */
function sweepExpired(now: number): void {
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
  lastSweep = now;
}

/** Forma mínima del server de Bun (llega como `env` de Hono) para leer la IP del socket. */
type PeerServer = {
  requestIP?: (req: Request) => { address?: string } | null;
};

/**
 * Deriva una key CONFIABLE por cliente, o `null` si no se puede determinar.
 *
 * - `trustProxy` (backend detrás de un reverse-proxy que setea el header): usa
 *   `x-real-ip` o el primer hop de `x-forwarded-for`. Solo se confía en estos
 *   headers cuando `trustProxy` está activo, porque el cliente puede falsificarlos;
 *   el proxy debe sobrescribirlos. Si el header falta, devuelve `null` (no se adivina).
 * - Sin proxy: usa la IP del socket (Bun expone el server como `env` de Hono),
 *   que es inspoofeable. En tests (sin server real) no hay socket → `null`.
 *
 * Nunca se usa una cubeta compartida tipo "unknown": ante `null`, el middleware
 * hace fail-open (no limita ese request), en vez de estrangular a toda la tienda
 * bajo una única cubeta.
 */
function clientKey(
  c: Parameters<MiddlewareHandler>[0],
  trustProxy: boolean,
): string | null {
  if (trustProxy) {
    const xRealIp = c.req.header("x-real-ip")?.trim();
    if (xRealIp) return xRealIp;
    const xff = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
    return xff || null;
  }
  const server = c.env as unknown as PeerServer | undefined;
  return server?.requestIP?.(c.req.raw)?.address ?? null;
}

/**
 * Factory de rate limiting con ventana fija por cliente. `windowMs` es el tamaño
 * de la ventana y `max` el máximo de requests permitidas dentro de ella. Al
 * exceder responde 429 sin llamar al handler.
 *
 * `trustProxy` decide de dónde sale la IP del cliente (ver `clientKey`): activalo
 * SOLO si el backend corre detrás de un proxy que setea `x-real-ip`/`x-forwarded-for`
 * de forma confiable. Con `trustProxy` en false (default) se usa la IP del socket.
 * Si no hay key confiable, el request no se limita (fail-open).
 */
export function rateLimit<E extends Env = Env>({
  windowMs,
  max,
  trustProxy = false,
}: {
  windowMs: number;
  max: number;
  trustProxy?: boolean;
}): MiddlewareHandler<E> {
  return async (c, next) => {
    const key = clientKey(c, trustProxy);
    // Sin key confiable → fail-open: preferible a una cubeta global compartida.
    if (key === null) return next();

    const now = Date.now();
    if (now - lastSweep > windowMs) sweepExpired(now);

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
  lastSweep = 0;
}
