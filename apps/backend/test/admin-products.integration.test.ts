import { beforeEach, describe, expect, test } from "bun:test";
import { promoteToAdmin, request, resetDb, signUp } from "./helpers";

beforeEach(async () => {
  await resetDb();
});

async function adminCookie(): Promise<string> {
  const { cookie } = await signUp({
    name: "Boss",
    email: "boss@avanzar.test",
    password: "supersecret123",
  });
  await promoteToAdmin("boss@avanzar.test");
  return cookie;
}

async function createProduct(cookie: string, slug: string): Promise<string> {
  const res = await request("/api/v1/admin/products", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ slug, name: "Test" }),
  });
  expect(res.status).toBe(201);
  return ((await res.json()) as { product: { id: string } }).product.id;
}

describe("productos: colisiones → 409", () => {
  test("slug duplicado → 409 PRODUCT_SLUG_TAKEN", async () => {
    const cookie = await adminCookie();
    await createProduct(cookie, "remera-azul");
    const res = await request("/api/v1/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ slug: "remera-azul", name: "Otra" }),
    });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { code: string }).code).toBe("PRODUCT_SLUG_TAKEN");
  });

  test("moneda de precio duplicada → 409 PRICE_CURRENCY_EXISTS", async () => {
    const cookie = await adminCookie();
    const id = await createProduct(cookie, "remera-roja");
    const body = JSON.stringify({ currency: "USD", amountMinor: 1999 });
    const first = await request(`/api/v1/admin/products/${id}/prices`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body,
    });
    expect(first.status).toBe(201);
    const second = await request(`/api/v1/admin/products/${id}/prices`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body,
    });
    expect(second.status).toBe(409);
    expect(((await second.json()) as { code: string }).code).toBe("PRICE_CURRENCY_EXISTS");
  });

  test("PATCH a un slug ya usado → 409 PRODUCT_SLUG_TAKEN", async () => {
    const cookie = await adminCookie();
    await createProduct(cookie, "remera-a");
    const idB = await createProduct(cookie, "remera-b");
    const res = await request(`/api/v1/admin/products/${idB}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ slug: "remera-a" }),
    });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { code: string }).code).toBe("PRODUCT_SLUG_TAKEN");
  });
});
