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
    expect(((await res.json()) as { order: { status: string } }).order.status).toBe("paid");

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
