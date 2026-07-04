import { db } from "@avanzar/db";
import { products } from "@avanzar/db/schema";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, test } from "bun:test";
import {
  checkoutBody,
  postJson,
  promoteToAdmin,
  request,
  resetDb,
  seedProduct,
  seedShippingRate,
  signUp,
} from "./helpers";

/** Crea una orden de RETIRO vía checkout (sin dirección) y devuelve su id. */
async function createPickupOrder(qty = 1): Promise<string> {
  const p = await seedProduct({ stock: 10 });
  const res = await postJson("/api/v1/checkout", {
    currency: "USD",
    fulfillment: "pickup",
    buyer: { name: "Ana", email: "ana@example.com", phone: "+1555" },
    recipient: { name: "Beto", phone: "+53555" },
    items: [{ productId: p.id, quantity: qty }],
    payment: { method: "zelle" },
  });
  const body = (await res.json()) as { order: { id: string } };
  return body.order.id;
}

/** PATCH del estado de una orden por id. */
function patchStatus(cookie: string, orderId: string, status: string): Promise<Response> {
  return request(`/api/v1/admin/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ status }),
  });
}

beforeEach(async () => {
  await resetDb();
});

/** Crea una orden vía checkout y devuelve su id. */
async function createOrder(stock = 10, qty = 2): Promise<string> {
  const p = await seedProduct({ stock });
  await seedShippingRate();
  const res = await postJson("/api/v1/checkout", checkoutBody(p.id, qty));
  const body = (await res.json()) as { order: { id: string } };
  return body.order.id;
}

/** Devuelve la cookie de un admin recién creado. */
async function adminCookie(): Promise<string> {
  const { cookie } = await signUp({
    name: "Boss",
    email: "boss@avanzar.test",
    password: "supersecret123",
  });
  await promoteToAdmin("boss@avanzar.test");
  return cookie;
}

describe("PATCH /api/v1/admin/orders/:id/status", () => {
  test("transición válida pending_payment -> paid: 200 + history", async () => {
    const cookie = await adminCookie();
    const orderId = await createOrder();

    const res = await request(`/api/v1/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ status: "paid" }),
    });
    expect(res.status).toBe(200);
    const patched = (await res.json()) as {
      order: { status: string; items: unknown[]; payments: unknown[] };
    };
    expect(patched.order.status).toBe("paid");
    // El PATCH devuelve la misma forma que GET /:id (con relaciones).
    expect(Array.isArray(patched.order.items)).toBe(true);
    expect(Array.isArray(patched.order.payments)).toBe(true);

    const detail = await request(`/api/v1/admin/orders/${orderId}`, {
      headers: { Cookie: cookie },
    });
    const order = ((await detail.json()) as { order: { statusHistory: { status: string }[] } }).order;
    const statuses = order.statusHistory.map((h: { status: string }) => h.status);
    expect(statuses).toContain("paid");
  });

  test("transición inválida: 422 INVALID_TRANSITION", async () => {
    const cookie = await adminCookie();
    const orderId = await createOrder();

    const res = await request(`/api/v1/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ status: "delivered" }),
    });
    expect(res.status).toBe(422);
    expect(((await res.json()) as Record<string, unknown>).code).toBe("INVALID_TRANSITION");
  });

  test("mismo estado: 409", async () => {
    const cookie = await adminCookie();
    const orderId = await createOrder();

    const res = await request(`/api/v1/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ status: "pending_payment" }),
    });
    expect(res.status).toBe(409);
  });

  test("cancelar repone el stock", async () => {
    const cookie = await adminCookie();
    const p = await seedProduct({ stock: 10 });
    await seedShippingRate();
    const checkout = await postJson("/api/v1/checkout", checkoutBody(p.id, 3));
    const orderId = ((await checkout.json()) as { order: { id: string } }).order.id;

    // Stock tras checkout: 10 - 3 = 7.
    let [row] = await db.select().from(products).where(eq(products.id, p.id));
    expect(row?.stockQuantity).toBe(7);

    const res = await request(`/api/v1/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ status: "cancelled" }),
    });
    expect(res.status).toBe(200);

    // Restock: 7 + 3 = 10.
    [row] = await db.select().from(products).where(eq(products.id, p.id));
    expect(row?.stockQuantity).toBe(10);
  });
});

describe("uuidParam — params con formato inválido dan 404 (no 500)", () => {
  test("admin GET /:id no-uuid → 404", async () => {
    const cookie = await adminCookie();
    const res = await request("/api/v1/admin/orders/no-es-uuid", {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(404);
  });

  test("público GET /orders/:id no-uuid (con sesión) → 404", async () => {
    const { cookie } = await signUp({
      name: "Cliente",
      email: "cliente@avanzar.test",
      password: "supersecret123",
    });
    const res = await request("/api/v1/orders/no-es-uuid", {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(404);
  });
});

describe("PATCH estado — camino de retiro", () => {
  test("retiro: preparing → ready_for_pickup → delivered", async () => {
    const cookie = await adminCookie();
    const orderId = await createPickupOrder();
    expect((await patchStatus(cookie, orderId, "paid")).status).toBe(200);
    expect((await patchStatus(cookie, orderId, "preparing")).status).toBe(200);
    expect((await patchStatus(cookie, orderId, "ready_for_pickup")).status).toBe(200);
    expect((await patchStatus(cookie, orderId, "delivered")).status).toBe(200);
  });

  test("retiro: preparing → shipped → 422 INVALID_TRANSITION", async () => {
    const cookie = await adminCookie();
    const orderId = await createPickupOrder();
    await patchStatus(cookie, orderId, "paid");
    await patchStatus(cookie, orderId, "preparing");
    const res = await patchStatus(cookie, orderId, "shipped");
    expect(res.status).toBe(422);
    expect(((await res.json()) as { code: string }).code).toBe("INVALID_TRANSITION");
  });
});
