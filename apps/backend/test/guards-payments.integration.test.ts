import { db } from "@avanzar/db";
import { payments, user } from "@avanzar/db/schema";
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

/** Crea un admin (signup + promote) y devuelve su cookie de sesión. */
async function adminCookie(): Promise<string> {
  const { cookie } = await signUp({
    name: "Boss",
    email: "boss@avanzar.test",
    password: "supersecret123",
  });
  await promoteToAdmin("boss@avanzar.test");
  return cookie;
}

describe("guards de autenticación", () => {
  test("sin sesión: 401 en rutas con requireSession", async () => {
    expect((await request("/api/v1/addresses")).status).toBe(401);
    expect((await request("/api/v1/orders")).status).toBe(401);
  });

  test("sin sesión: 401 en rutas admin", async () => {
    expect((await request("/api/v1/admin/products")).status).toBe(401);
  });

  test("sesión no-admin: 403 en rutas admin", async () => {
    const { cookie } = await signUp({
      name: "Cliente",
      email: "cliente@avanzar.test",
      password: "supersecret123",
    });
    const res = await request("/api/v1/admin/products", {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/v1/admin/payments/:id/confirm", () => {
  test("confirmar el pago promueve la orden a paid", async () => {
    const cookie = await adminCookie();
    const p = await seedProduct({ stock: 10 });
    await seedShippingRate();
    const checkout = await postJson("/api/v1/checkout", checkoutBody(p.id, 1));
    const { order, payment } = (await checkout.json()) as {
      order: { id: string };
      payment: { id: string };
    };

    const res = await request(`/api/v1/admin/payments/${payment.id}/confirm`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ reference: "ZELLE-123" }),
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { payment: { status: string } }).payment.status).toBe("confirmed");

    const detail = await request(`/api/v1/admin/orders/${order.id}`, {
      headers: { Cookie: cookie },
    });
    expect(((await detail.json()) as { order: { status: string } }).order.status).toBe("paid");
  });

  test("confirmar un pago no-pending: 409", async () => {
    const cookie = await adminCookie();
    const p = await seedProduct({ stock: 10 });
    await seedShippingRate();
    const checkout = await postJson("/api/v1/checkout", checkoutBody(p.id, 1));
    const { payment } = (await checkout.json()) as { payment: { id: string } };

    // Marcar el pago como confirmado directamente para forzar el 409.
    await db
      .update(payments)
      .set({ status: "confirmed" })
      .where(eq(payments.id, payment.id));

    const res = await request(`/api/v1/admin/payments/${payment.id}/confirm`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ reference: "ZELLE-999" }),
    });
    expect(res.status).toBe(409);
  });
});

describe("PATCH /api/v1/admin/users/:id/role (self-demote guard)", () => {
  test("un admin no puede quitarse su propio rol de admin: 422", async () => {
    const cookie = await adminCookie();
    const [boss] = await db
      .select()
      .from(user)
      .where(eq(user.email, "boss@avanzar.test"));
    if (!boss) throw new Error("setup: no se encontró el admin boss");

    const res = await request(`/api/v1/admin/users/${boss.id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ role: "customer" }),
    });
    expect(res.status).toBe(422);
  });
});
