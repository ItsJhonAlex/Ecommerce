import { beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { __resetRateLimit, rateLimit } from "./rate-limit";

/**
 * App mínima con el middleware aplicado a una ruta de prueba. `trustProxy` en
 * true para poder simular la IP del cliente vía headers (en `app.request` no hay
 * socket real, así que sin trustProxy el key sería null → fail-open).
 */
function makeApp(max: number, trustProxy = true) {
  const app = new Hono();
  app.get("/", rateLimit({ windowMs: 60_000, max, trustProxy }), (c) =>
    c.text("ok"),
  );
  return app;
}

/** Request con IP simulada vía x-forwarded-for. */
function req(app: Hono, ip: string) {
  return app.request("/", { headers: { "x-forwarded-for": ip } });
}

beforeEach(() => {
  __resetRateLimit();
});

describe("rateLimit", () => {
  test("permite hasta max y bloquea el excedente con 429", async () => {
    const app = makeApp(2);
    expect((await req(app, "1.1.1.1")).status).toBe(200);
    expect((await req(app, "1.1.1.1")).status).toBe(200);
    const blocked = await req(app, "1.1.1.1");
    expect(blocked.status).toBe(429);
    expect(((await blocked.json()) as { error: string }).error).toBe(
      "Demasiadas solicitudes",
    );
  });

  test("cuenta por IP: otra IP no se ve afectada", async () => {
    const app = makeApp(1);
    expect((await req(app, "1.1.1.1")).status).toBe(200);
    expect((await req(app, "1.1.1.1")).status).toBe(429);
    // IP distinta arranca con su propia cubeta.
    expect((await req(app, "2.2.2.2")).status).toBe(200);
  });

  test("toma la primera IP de la lista x-forwarded-for", async () => {
    const app = makeApp(1);
    expect((await req(app, "9.9.9.9, 10.0.0.1")).status).toBe(200);
    expect((await req(app, "9.9.9.9, 10.0.0.2")).status).toBe(429);
  });

  test("prefiere x-real-ip cuando está presente", async () => {
    const app = makeApp(1);
    const headers = { "x-real-ip": "3.3.3.3" };
    expect((await app.request("/", { headers })).status).toBe(200);
    expect((await app.request("/", { headers })).status).toBe(429);
  });

  test("__resetRateLimit limpia el contador", async () => {
    const app = makeApp(1);
    expect((await req(app, "1.1.1.1")).status).toBe(200);
    expect((await req(app, "1.1.1.1")).status).toBe(429);
    __resetRateLimit();
    expect((await req(app, "1.1.1.1")).status).toBe(200);
  });

  test("trustProxy pero sin header de IP → fail-open (no limita)", async () => {
    const app = makeApp(1); // trustProxy true, pero no mandamos headers
    // Sin key confiable no se limita: nunca 429, no hay cubeta global compartida.
    expect((await app.request("/")).status).toBe(200);
    expect((await app.request("/")).status).toBe(200);
    expect((await app.request("/")).status).toBe(200);
  });

  test("sin trustProxy: ignora los headers del cliente (no spoofeable) → fail-open en tests", async () => {
    // Con trustProxy false el header x-forwarded-for NO se usa; en tests no hay
    // socket real, así que el key es null → fail-open (nunca 429).
    const app = makeApp(1, false);
    expect((await req(app, "1.1.1.1")).status).toBe(200);
    expect((await req(app, "1.1.1.1")).status).toBe(200);
  });
});
