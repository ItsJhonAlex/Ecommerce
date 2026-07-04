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

const RANDOM_UUID = "00000000-0000-4000-8000-000000000000";

/** Crea una orden vía checkout y devuelve su id + receiptToken. */
async function createOrder(): Promise<{ id: string; receiptToken: string }> {
  const p = await seedProduct({ stock: 10 });
  await seedShippingRate();
  const res = await postJson("/api/v1/checkout", checkoutBody(p.id, 2));
  const body = (await res.json()) as { order: { id: string; receiptToken: string } };
  return { id: body.order.id, receiptToken: body.order.receiptToken };
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

beforeEach(async () => {
  await resetDb();
});

describe("GET /api/v1/track/:token", () => {
  test("token válido (sin auth): 200 con estado, items e historial", async () => {
    const { receiptToken } = await createOrder();
    const res = await request(`/api/v1/track/${receiptToken}`);
    expect(res.status).toBe(200);

    const { order } = (await res.json()) as {
      order: {
        status: string;
        fulfillment: string;
        items: { productName: string; quantity: number; lineTotalMinor: number }[];
        statusHistory: { status: string; createdAt: string }[];
      };
    };

    expect(order.status).toBe("pending_payment");
    expect(order.fulfillment).toBe("delivery");
    expect(order.items.length).toBeGreaterThanOrEqual(1);
    expect(order.statusHistory.length).toBeGreaterThanOrEqual(1);
    expect(order.statusHistory.map((h) => h.status)).toContain("pending_payment");
  });

  test("NO filtra PII sensible", async () => {
    const { receiptToken } = await createOrder();
    const res = await request(`/api/v1/track/${receiptToken}`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { order: Record<string, unknown> };
    const raw = JSON.stringify(body);

    // Ni el token ni datos del comprador / envío deben viajar.
    for (const key of [
      "receiptToken",
      "buyerName",
      "buyerEmail",
      "buyerPhone",
      "shipRecipient",
      "shipPhone",
      "shipProvince",
      "shipMunicipality",
      "shipAddressLine",
      "shipReference",
      "userId",
    ]) {
      expect(Object.hasOwn(body.order, key)).toBe(false);
      expect(raw).not.toContain(key);
    }
    // El valor del token tampoco debe aparecer en ningún lado del body.
    expect(raw).not.toContain(receiptToken);
  });

  test("token inexistente (uuid válido): 404", async () => {
    await createOrder();
    const res = await request(`/api/v1/track/${RANDOM_UUID}`);
    expect(res.status).toBe(404);
  });

  test("token con formato inválido: 404", async () => {
    await createOrder();
    const res = await request("/api/v1/track/no-es-token");
    expect(res.status).toBe(404);
  });

  test("refleja el cambio de estado del admin y suma la entrada al historial", async () => {
    const cookie = await adminCookie();
    const { id, receiptToken } = await createOrder();

    // pending_payment -> paid -> preparing.
    for (const status of ["paid", "preparing"]) {
      const patch = await request(`/api/v1/admin/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ status }),
      });
      expect(patch.status).toBe(200);
    }

    const res = await request(`/api/v1/track/${receiptToken}`);
    expect(res.status).toBe(200);
    const { order } = (await res.json()) as {
      order: { status: string; statusHistory: { status: string }[] };
    };
    expect(order.status).toBe("preparing");
    const statuses = order.statusHistory.map((h) => h.status);
    expect(statuses).toContain("preparing");
    expect(statuses).toContain("pending_payment");
  });
});
