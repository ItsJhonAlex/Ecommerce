import { beforeEach, describe, expect, test } from "bun:test";
import { postJson, promoteToAdmin, request, resetDb, seedProduct, seedShippingRate, signUp } from "./helpers";

// UUID v4 (con la versión/variante que genera Postgres) para validar el receiptToken.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Crea una orden vía checkout y devuelve id + receiptToken de la respuesta. */
async function createOrder(): Promise<{ id: string; receiptToken: string }> {
  const p = await seedProduct({ stock: 10 });
  await seedShippingRate();
  const res = await postJson("/api/v1/checkout", {
    currency: "USD",
    fulfillment: "delivery" as const,
    buyer: { name: "Ana", email: "ana@example.com", phone: "+1555" },
    recipient: {
      name: "Luis",
      phone: "+53555",
      province: "Habana",
      municipality: "Centro",
      addressLine: "Calle 1 #2",
    },
    items: [{ productId: p.id, quantity: 2 }],
    payment: { method: "zelle" },
  });
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

/** true si el body empieza con la firma mágica `%PDF`. */
async function startsWithPdf(res: Response): Promise<boolean> {
  const bytes = new Uint8Array(await res.arrayBuffer());
  return (
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 //   F
  );
}

const RANDOM_UUID = "00000000-0000-4000-8000-000000000000";

beforeEach(async () => {
  await resetDb();
});

describe("checkout devuelve receiptToken", () => {
  test("la respuesta del checkout incluye receiptToken (uuid)", async () => {
    const { receiptToken } = await createOrder();
    expect(typeof receiptToken).toBe("string");
    expect(receiptToken).toMatch(UUID_RE);
  });
});

describe("GET /api/v1/admin/orders/:id/receipt", () => {
  test("con cookie admin: 200 + PDF", async () => {
    const cookie = await adminCookie();
    const { id } = await createOrder();

    const res = await request(`/api/v1/admin/orders/${id}/receipt`, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/pdf");
    expect(await startsWithPdf(res)).toBe(true);
  });

  test("sin cookie: 401", async () => {
    const { id } = await createOrder();
    const res = await request(`/api/v1/admin/orders/${id}/receipt`);
    expect(res.status).toBe(401);
  });

  test("id inexistente: 404", async () => {
    const cookie = await adminCookie();
    const res = await request(`/api/v1/admin/orders/${RANDOM_UUID}/receipt`, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/v1/receipt/:token", () => {
  test("sin auth con token válido: 200 + PDF", async () => {
    const { receiptToken } = await createOrder();
    const res = await request(`/api/v1/receipt/${receiptToken}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/pdf");
    expect(await startsWithPdf(res)).toBe(true);
  });

  test("token inexistente: 404", async () => {
    await createOrder();
    const res = await request(`/api/v1/receipt/${RANDOM_UUID}`);
    expect(res.status).toBe(404);
  });

  test("token con formato inválido: 404", async () => {
    await createOrder();
    const res = await request("/api/v1/receipt/no-es-un-token");
    expect(res.status).toBe(404);
  });
});
