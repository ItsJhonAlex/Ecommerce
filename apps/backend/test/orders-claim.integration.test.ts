import { beforeEach, describe, expect, test } from "bun:test";
import {
  checkoutBody,
  postJson,
  request,
  resetDb,
  seedProduct,
  seedShippingRate,
  signUp,
} from "./helpers";

/** Checkout (opcionalmente con sesión) → devuelve el order creado. */
async function checkout(productId: string, cookie?: string) {
  const res = await postJson(
    "/api/v1/checkout",
    checkoutBody(productId),
    cookie ? { Cookie: cookie } : {},
  );
  expect(res.status).toBe(201);
  const body = (await res.json()) as {
    order: { id: string; orderNumber: string; receiptToken: string };
  };
  return body.order;
}

async function ordersOf(cookie: string) {
  const res = await request("/api/v1/orders", { headers: { Cookie: cookie } });
  expect(res.status).toBe(200);
  return ((await res.json()) as { orders: unknown[] }).orders;
}

function claim(token: string, cookie?: string) {
  return postJson(
    "/api/v1/orders/claim",
    { token },
    cookie ? { Cookie: cookie } : {},
  );
}

async function newUser(n: number) {
  const { cookie } = await signUp({
    name: `User ${n}`,
    email: `user${n}@example.com`,
    password: "password123",
  });
  return cookie;
}

describe("POST /api/v1/orders/claim — reclamar pedido de invitado por token", () => {
  beforeEach(async () => {
    await resetDb();
    await seedShippingRate();
  });

  test("un invitado que se registra reclama su pedido y aparece en 'mis pedidos'", async () => {
    const p = await seedProduct();
    const order = await checkout(p.id); // sin sesión → invitado (userId null)
    const cookie = await newUser(1);

    // Antes de reclamar: la cuenta no tiene pedidos.
    expect(await ordersOf(cookie)).toHaveLength(0);

    const res = await claim(order.receiptToken, cookie);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { order: { orderNumber: string } };
    expect(body.order.orderNumber).toBe(order.orderNumber);

    // Ahora sí aparece.
    expect(await ordersOf(cookie)).toHaveLength(1);
  });

  test("es idempotente si el pedido ya es del usuario", async () => {
    const p = await seedProduct();
    const cookie = await newUser(1);
    const order = await checkout(p.id, cookie); // logueado → ya vinculado

    const res = await claim(order.receiptToken, cookie);
    expect(res.status).toBe(200);
    expect(await ordersOf(cookie)).toHaveLength(1);
  });

  test("409 si el pedido ya es de otra cuenta", async () => {
    const p = await seedProduct();
    const cookieA = await newUser(1);
    const order = await checkout(p.id, cookieA); // de A
    const cookieB = await newUser(2);

    const res = await claim(order.receiptToken, cookieB);
    expect(res.status).toBe(409);
    // No se le coló a B.
    expect(await ordersOf(cookieB)).toHaveLength(0);
  });

  test("404 con token inexistente", async () => {
    const cookie = await newUser(1);
    const res = await claim("00000000-0000-4000-8000-000000000000", cookie);
    expect(res.status).toBe(404);
  });

  test("400 con token de formato inválido", async () => {
    const cookie = await newUser(1);
    const res = await claim("no-es-uuid", cookie);
    expect(res.status).toBe(400);
  });

  test("401 sin sesión", async () => {
    const p = await seedProduct();
    const order = await checkout(p.id);
    const res = await claim(order.receiptToken);
    expect(res.status).toBe(401);
  });
});
