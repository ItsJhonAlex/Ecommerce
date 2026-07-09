import { db } from "@avanzar/db";
import {
  categories,
  productCategories,
  productImages,
  productPrices,
  products,
} from "@avanzar/db/schema";
import { beforeEach, describe, expect, test } from "bun:test";
import { request, resetDb, seedProduct } from "./helpers";

beforeEach(async () => {
  await resetDb();
});

type ListItem = {
  id: string;
  slug: string;
  name: string;
  priceMinor: number;
  currency: string;
  image: { url: string; alt: string | null } | null;
  stockQuantity: number;
};
type ListResponse = {
  products: ListItem[];
  total: number;
  page: number;
  pageSize: number;
};

/** Agrega un precio en una moneda extra a un producto ya sembrado. */
async function addPrice(productId: string, currency: string, amountMinor: number) {
  await db.insert(productPrices).values({ productId, currency, amountMinor });
}

/** Crea una categoría y devuelve su id. */
async function seedCategory(slug: string, name: string): Promise<string> {
  const [cat] = await db.insert(categories).values({ slug, name }).returning();
  if (!cat) throw new Error("seedCategory: no se pudo insertar");
  return cat.id;
}

/** Vincula un producto a una categoría. */
async function linkCategory(productId: string, categoryId: string) {
  await db.insert(productCategories).values({ productId, categoryId });
}

/** Agrega una imagen a un producto. */
async function addImage(
  productId: string,
  url: string,
  position: number,
  alt: string | null = null,
) {
  await db.insert(productImages).values({ productId, url, position, alt });
}

async function getList(qs = ""): Promise<{ status: number; body: ListResponse }> {
  const res = await request(`/api/v1/products${qs}`);
  return { status: res.status, body: (await res.json()) as ListResponse };
}

describe("GET /products (catálogo público currency-aware)", () => {
  test("sin params → default USD/newest/page1, forma correcta", async () => {
    const p = await seedProduct({ slug: "remera-negra", name: "Remera negra", amountMinor: 1999 });
    await addImage(p.id, "https://x.com/a.jpg", 1, "atras");
    await addImage(p.id, "https://x.com/b.jpg", 0, "principal");

    const { status, body } = await getList();
    expect(status).toBe(200);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(24);
    expect(body.total).toBe(1);
    expect(body.products).toHaveLength(1);
    const item = body.products[0]!;
    expect(item.slug).toBe("remera-negra");
    expect(item.priceMinor).toBe(1999);
    expect(item.currency).toBe("USD");
    expect(item.stockQuantity).toBe(10);
    // imagen position 0
    expect(item.image).toEqual({ url: "https://x.com/b.jpg", alt: "principal" });
  });

  test("solo productos con precio en la moneda pedida", async () => {
    // p1: USD only. p2: USD + CUP.
    await seedProduct({ slug: "p1", name: "P1", amountMinor: 1000 });
    const p2 = await seedProduct({ slug: "p2", name: "P2", amountMinor: 2000 });
    await addPrice(p2.id, "CUP", 500000);

    const usd = await getList();
    expect(usd.body.total).toBe(2);

    const cup = await getList("?currency=CUP");
    expect(cup.body.total).toBe(1);
    expect(cup.body.products).toHaveLength(1);
    expect(cup.body.products[0]!.slug).toBe("p2");
    expect(cup.body.products[0]!.priceMinor).toBe(500000);
    expect(cup.body.products[0]!.currency).toBe("CUP");
  });

  test("filtra por categoría (slug)", async () => {
    const p1 = await seedProduct({ slug: "p1", name: "P1" });
    await seedProduct({ slug: "p2", name: "P2" });
    const catId = await seedCategory("ropa", "Ropa");
    await linkCategory(p1.id, catId);

    const { body } = await getList("?category=ropa");
    expect(body.total).toBe(1);
    expect(body.products[0]!.slug).toBe("p1");
  });

  test("filtra por q (case-insensitive)", async () => {
    await seedProduct({ slug: "p1", name: "Remera azul" });
    await seedProduct({ slug: "p2", name: "Pantalón" });

    const { body } = await getList("?q=rem");
    expect(body.total).toBe(1);
    expect(body.products[0]!.slug).toBe("p1");
  });

  test("sort=price_asc / price_desc ordenan por precio de la moneda", async () => {
    await seedProduct({ slug: "cheap", name: "Cheap", amountMinor: 100 });
    await seedProduct({ slug: "mid", name: "Mid", amountMinor: 500 });
    await seedProduct({ slug: "expensive", name: "Expensive", amountMinor: 900 });

    const asc = await getList("?sort=price_asc");
    expect(asc.body.products.map((p) => p.slug)).toEqual(["cheap", "mid", "expensive"]);

    const desc = await getList("?sort=price_desc");
    expect(desc.body.products.map((p) => p.slug)).toEqual(["expensive", "mid", "cheap"]);
  });

  test("sort=name ordena alfabético", async () => {
    await seedProduct({ slug: "b", name: "Banana" });
    await seedProduct({ slug: "a", name: "Ananá" });
    await seedProduct({ slug: "c", name: "Cereza" });

    const { body } = await getList("?sort=name");
    expect(body.products.map((p) => p.name)).toEqual(["Ananá", "Banana", "Cereza"]);
  });

  test("minPrice / maxPrice filtran por rango", async () => {
    await seedProduct({ slug: "cheap", name: "Cheap", amountMinor: 100 });
    await seedProduct({ slug: "mid", name: "Mid", amountMinor: 500 });
    await seedProduct({ slug: "expensive", name: "Expensive", amountMinor: 900 });

    const min = await getList("?minPrice=400");
    expect(min.body.products.map((p) => p.slug).sort()).toEqual(["expensive", "mid"]);

    const max = await getList("?maxPrice=400");
    expect(max.body.products.map((p) => p.slug)).toEqual(["cheap"]);

    const range = await getList("?minPrice=200&maxPrice=800");
    expect(range.body.products.map((p) => p.slug)).toEqual(["mid"]);
  });

  test("paginación: page=2&pageSize=1 con 2 productos", async () => {
    await seedProduct({ slug: "a", name: "A", amountMinor: 100 });
    await seedProduct({ slug: "b", name: "B", amountMinor: 200 });

    const { body } = await getList("?page=2&pageSize=1&sort=price_asc");
    expect(body.total).toBe(2);
    expect(body.page).toBe(2);
    expect(body.pageSize).toBe(1);
    expect(body.products).toHaveLength(1);
    expect(body.products[0]!.slug).toBe("b");
  });

  test("pageSize > 48 → 400", async () => {
    const res = await request("/api/v1/products?pageSize=100");
    expect(res.status).toBe(400);
  });

  test("producto draft no aparece", async () => {
    await seedProduct({ slug: "active", name: "Active" });
    await seedProduct({ slug: "draft", name: "Draft", status: "draft" });

    const { body } = await getList();
    expect(body.total).toBe(1);
    expect(body.products[0]!.slug).toBe("active");
  });

  test("producto sin imágenes → image null", async () => {
    await seedProduct({ slug: "noimg", name: "Sin imagen" });
    const { body } = await getList();
    expect(body.products[0]!.image).toBeNull();
  });
});
