import { db } from "@avanzar/db";
import {
  categories,
  productCategories,
  productImages,
  productPrices,
  products,
} from "@avanzar/db/schema";
import { type ProductListItem, productPublicQuerySchema } from "@avanzar/shared";
import { type SQL, and, asc, desc, eq, gte, ilike, inArray, lte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { parseQuery } from "../../../lib/validate";

/**
 * Catálogo público: solo productos `active`.
 * Drafts y archivados no se exponen en el storefront.
 */
export const productsRouter = new Hono();

// GET /api/v1/products?currency=&category=&q=&sort=&minPrice=&maxPrice=&page=&pageSize=
productsRouter.get("/", async (c) => {
  const parsed = parseQuery(c, productPublicQuerySchema);
  if (!parsed.ok) return parsed.response;
  const { currency, category, q, sort, minPrice, maxPrice, page, pageSize } = parsed.data;

  // Filtros comunes a la lista y al count. El INNER JOIN a productPrices por moneda
  // excluye productos sin precio en la moneda pedida; su amountMinor es el precio mostrado.
  const conditions: SQL[] = [
    eq(products.status, "active"),
    eq(productPrices.currency, currency),
  ];
  if (q) conditions.push(ilike(products.name, `%${q}%`));
  if (minPrice !== undefined) conditions.push(gte(productPrices.amountMinor, minPrice));
  if (maxPrice !== undefined) conditions.push(lte(productPrices.amountMinor, maxPrice));
  if (category) conditions.push(eq(categories.slug, category));
  const where = and(...conditions);

  const orderBy = {
    price_asc: asc(productPrices.amountMinor),
    price_desc: desc(productPrices.amountMinor),
    name: asc(products.name),
    newest: desc(products.createdAt),
  }[sort];

  let rowsQuery = db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      stockQuantity: products.stockQuantity,
      priceMinor: productPrices.amountMinor,
    })
    .from(products)
    .innerJoin(productPrices, eq(productPrices.productId, products.id))
    .$dynamic();

  let countQuery = db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .innerJoin(productPrices, eq(productPrices.productId, products.id))
    .$dynamic();

  // El join de categoría solo se agrega cuando se filtra por slug.
  if (category) {
    rowsQuery = rowsQuery
      .innerJoin(productCategories, eq(productCategories.productId, products.id))
      .innerJoin(categories, eq(categories.id, productCategories.categoryId));
    countQuery = countQuery
      .innerJoin(productCategories, eq(productCategories.productId, products.id))
      .innerJoin(categories, eq(categories.id, productCategories.categoryId));
  }

  const rows = await rowsQuery
    .where(where)
    .orderBy(orderBy)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [countRow] = await countQuery.where(where);
  const total = countRow?.count ?? 0;

  // Imagen de menor position por producto (una sola query extra, sin N+1).
  const ids = rows.map((r) => r.id);
  const imagesByProduct = new Map<string, { url: string; alt: string | null }>();
  if (ids.length > 0) {
    const imgs = await db
      .select({
        productId: productImages.productId,
        url: productImages.url,
        alt: productImages.alt,
        position: productImages.position,
      })
      .from(productImages)
      .where(inArray(productImages.productId, ids))
      .orderBy(asc(productImages.position));
    // Al iterar por position ascendente, la primera vista por producto es la position mínima.
    for (const img of imgs) {
      if (!imagesByProduct.has(img.productId)) {
        imagesByProduct.set(img.productId, { url: img.url, alt: img.alt });
      }
    }
  }

  const items: ProductListItem[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    priceMinor: r.priceMinor,
    currency,
    image: imagesByProduct.get(r.id) ?? null,
    stockQuantity: r.stockQuantity,
  }));

  return c.json({ products: items, total, page, pageSize });
});

// GET /api/v1/products/:slug
productsRouter.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const product = await db.query.products.findFirst({
    where: (p, { and, eq }) => and(eq(p.slug, slug), eq(p.status, "active")),
    with: {
      prices: true,
      images: { orderBy: (img, { asc }) => [asc(img.position)] },
      categories: { with: { category: true } },
    },
  });

  if (!product) {
    return c.json({ error: "Producto no encontrado" }, 404);
  }
  return c.json({ product });
});
