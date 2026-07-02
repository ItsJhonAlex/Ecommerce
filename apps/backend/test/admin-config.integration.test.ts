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

describe("config: colisiones → 409", () => {
  test("categoría slug duplicado → 409 CATEGORY_SLUG_TAKEN", async () => {
    const cookie = await adminCookie();
    const body = JSON.stringify({ slug: "ropa", name: "Ropa" });
    const first = await request("/api/v1/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body,
    });
    expect(first.status).toBe(201);
    const second = await request("/api/v1/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body,
    });
    expect(second.status).toBe(409);
    expect(((await second.json()) as { code: string }).code).toBe("CATEGORY_SLUG_TAKEN");
  });

  test("tarifa (provincia,moneda) duplicada → 409 SHIPPING_RATE_EXISTS", async () => {
    const cookie = await adminCookie();
    const body = JSON.stringify({
      province: "La Habana",
      currency: "USD",
      amountMinor: 500,
    });
    const first = await request("/api/v1/admin/shipping-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body,
    });
    expect(first.status).toBe(201);
    const second = await request("/api/v1/admin/shipping-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body,
    });
    expect(second.status).toBe(409);
    expect(((await second.json()) as { code: string }).code).toBe("SHIPPING_RATE_EXISTS");
  });

  test("PATCH categoría a un slug ya usado → 409 CATEGORY_SLUG_TAKEN", async () => {
    const cookie = await adminCookie();
    const headers = { "Content-Type": "application/json", Cookie: cookie };
    const a = await request("/api/v1/admin/categories", {
      method: "POST",
      headers,
      body: JSON.stringify({ slug: "ropa", name: "Ropa" }),
    });
    const b = await request("/api/v1/admin/categories", {
      method: "POST",
      headers,
      body: JSON.stringify({ slug: "hogar", name: "Hogar" }),
    });
    const idB = ((await b.json()) as { category: { id: string } }).category.id;
    expect(a.status).toBe(201);
    const res = await request(`/api/v1/admin/categories/${idB}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ slug: "ropa" }),
    });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { code: string }).code).toBe("CATEGORY_SLUG_TAKEN");
  });

  test("PATCH tarifa a (provincia,moneda) ya usada → 409 SHIPPING_RATE_EXISTS", async () => {
    const cookie = await adminCookie();
    const headers = { "Content-Type": "application/json", Cookie: cookie };
    const a = await request("/api/v1/admin/shipping-rates", {
      method: "POST",
      headers,
      body: JSON.stringify({ province: "La Habana", currency: "USD", amountMinor: 500 }),
    });
    const b = await request("/api/v1/admin/shipping-rates", {
      method: "POST",
      headers,
      body: JSON.stringify({ province: "Artemisa", currency: "USD", amountMinor: 700 }),
    });
    const idB = ((await b.json()) as { shippingRate: { id: string } }).shippingRate.id;
    expect(a.status).toBe(201);
    const res = await request(`/api/v1/admin/shipping-rates/${idB}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ province: "La Habana" }),
    });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { code: string }).code).toBe("SHIPPING_RATE_EXISTS");
  });
});
