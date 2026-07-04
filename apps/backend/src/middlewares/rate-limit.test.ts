import { beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { __resetRateLimit, rateLimit } from "./rate-limit";

/** App mínima con el middleware aplicado a una ruta de prueba. */
function makeApp(max: number) {
  const app = new Hono();
  app.get("/", rateLimit({ windowMs: 60_000, max }), (c) => c.text("ok"));
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

  test("__resetRateLimit limpia el contador", async () => {
    const app = makeApp(1);
    expect((await req(app, "1.1.1.1")).status).toBe(200);
    expect((await req(app, "1.1.1.1")).status).toBe(429);
    __resetRateLimit();
    expect((await req(app, "1.1.1.1")).status).toBe(200);
  });

  test("fallback a x-real-ip y luego a 'unknown'", async () => {
    const app = makeApp(1);
    expect(
      (await app.request("/", { headers: { "x-real-ip": "3.3.3.3" } })).status,
    ).toBe(200);
    expect(
      (await app.request("/", { headers: { "x-real-ip": "3.3.3.3" } })).status,
    ).toBe(429);
    // Sin headers: cae en la cubeta "unknown".
    expect((await app.request("/")).status).toBe(200);
    expect((await app.request("/")).status).toBe(429);
  });
});
