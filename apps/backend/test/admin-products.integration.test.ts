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

async function addImage(
  cookie: string,
  productId: string,
  url: string,
  position: number,
): Promise<string> {
  const res = await request(`/api/v1/admin/products/${productId}/images`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ url, position }),
  });
  expect(res.status).toBe(201);
  return ((await res.json()) as { image: { id: string } }).image.id;
}

describe("productos: reorden atómico de imágenes", () => {
  test("PATCH images/reorder invierte las posiciones → GET refleja 0..n-1", async () => {
    const cookie = await adminCookie();
    const id = await createProduct(cookie, "remera-imgs");
    const i0 = await addImage(cookie, id, "https://x.com/0.jpg", 0);
    const i1 = await addImage(cookie, id, "https://x.com/1.jpg", 1);
    const i2 = await addImage(cookie, id, "https://x.com/2.jpg", 2);

    const reversed = [i2, i1, i0];
    const res = await request(`/api/v1/admin/products/${id}/images/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ imageIds: reversed }),
    });
    expect(res.status).toBe(200);

    const get = await request(`/api/v1/admin/products/${id}`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    expect(get.status).toBe(200);
    const { product } = (await get.json()) as {
      product: { images: { id: string; position: number }[] };
    };
    const byId = new Map(product.images.map((img) => [img.id, img.position]));
    expect(byId.get(i2)).toBe(0);
    expect(byId.get(i1)).toBe(1);
    expect(byId.get(i0)).toBe(2);
  });

  test("imageIds con un id ajeno/faltante → 400", async () => {
    const cookie = await adminCookie();
    const id = await createProduct(cookie, "remera-imgs-2");
    const i0 = await addImage(cookie, id, "https://x.com/0.jpg", 0);
    const i1 = await addImage(cookie, id, "https://x.com/1.jpg", 1);

    // Un id ajeno (no pertenece al producto) reemplaza a uno propio: set no coincide.
    const foreign = "00000000-0000-4000-8000-000000000000";
    const res = await request(`/api/v1/admin/products/${id}/images/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ imageIds: [i0, foreign] }),
    });
    expect(res.status).toBe(400);

    // Faltante: sólo se manda una de las dos imágenes → set no coincide.
    const res2 = await request(`/api/v1/admin/products/${id}/images/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ imageIds: [i1] }),
    });
    expect(res2.status).toBe(400);
  });
});

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
