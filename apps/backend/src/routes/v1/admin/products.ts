import { db } from "@avanzar/db";
import {
  productCategories,
  productImages,
  productPrices,
  products,
} from "@avanzar/db/schema";
import {
  linkCategorySchema,
  productAdminQuerySchema,
  productImageInsertSchema,
  productInsertSchema,
  productPriceInsertSchema,
} from "@avanzar/shared";
import { type SQL, and, eq, ilike } from "drizzle-orm";
import { Hono } from "hono";
import { fail } from "../../../lib/responses";
import { parseJson, parseQuery } from "../../../lib/validate";
import type { AuthEnv } from "../../../middlewares/auth";

/** CRUD de productos para admin. Incluye todos los status (draft/active/archived). */
export const adminProductsRouter = new Hono<AuthEnv>();

// GET /api/v1/admin/products?status=&q=
adminProductsRouter.get("/", async (c) => {
  const parsed = parseQuery(c, productAdminQuerySchema);
  if (!parsed.ok) return parsed.response;
  const { status, q } = parsed.data;

  const conditions: SQL[] = [];
  if (status) conditions.push(eq(products.status, status));
  if (q) conditions.push(ilike(products.name, `%${q}%`));

  const items = await db.query.products.findMany({
    where: conditions.length ? () => and(...conditions) : undefined,
    orderBy: (p, { asc }) => [asc(p.name)],
    with: { prices: true, images: true },
  });
  return c.json({ products: items });
});

// GET /api/v1/admin/products/:id
adminProductsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const product = await db.query.products.findFirst({
    where: (p, { eq: e }) => e(p.id, id),
    with: {
      prices: true,
      images: { orderBy: (img, { asc }) => [asc(img.position)] },
      categories: { with: { category: true } },
    },
  });
  if (!product) return fail(c, 404, "Producto no encontrado");
  return c.json({ product });
});

// POST /api/v1/admin/products
adminProductsRouter.post("/", async (c) => {
  const parsed = await parseJson(c, productInsertSchema);
  if (!parsed.ok) return parsed.response;
  const [created] = await db.insert(products).values(parsed.data).returning();
  return c.json({ product: created }, 201);
});

// PATCH /api/v1/admin/products/:id
adminProductsRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = await parseJson(c, productInsertSchema.partial());
  if (!parsed.ok) return parsed.response;
  const [updated] = await db
    .update(products)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();
  if (!updated) return fail(c, 404, "Producto no encontrado");
  return c.json({ product: updated });
});

// POST /api/v1/admin/products/:id/archive  (soft delete, idempotente)
adminProductsRouter.post("/:id/archive", async (c) => {
  const id = c.req.param("id");
  const [archived] = await db
    .update(products)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();
  if (!archived) return fail(c, 404, "Producto no encontrado");
  return c.json({ product: archived });
});

// --- Precios (nested) ---

// POST /api/v1/admin/products/:id/prices
adminProductsRouter.post("/:id/prices", async (c) => {
  const productId = c.req.param("id");
  const parsed = await parseJson(c, productPriceInsertSchema.omit({ productId: true }));
  if (!parsed.ok) return parsed.response;
  const [created] = await db
    .insert(productPrices)
    .values({ ...parsed.data, productId })
    .returning();
  return c.json({ price: created }, 201);
});

// PATCH /api/v1/admin/products/:id/prices/:priceId
adminProductsRouter.patch("/:id/prices/:priceId", async (c) => {
  const productId = c.req.param("id");
  const priceId = c.req.param("priceId");
  const parsed = await parseJson(
    c,
    productPriceInsertSchema.omit({ productId: true }).partial(),
  );
  if (!parsed.ok) return parsed.response;
  const [updated] = await db
    .update(productPrices)
    .set(parsed.data)
    .where(and(eq(productPrices.id, priceId), eq(productPrices.productId, productId)))
    .returning();
  if (!updated) return fail(c, 404, "Precio no encontrado");
  return c.json({ price: updated });
});

// DELETE /api/v1/admin/products/:id/prices/:priceId
adminProductsRouter.delete("/:id/prices/:priceId", async (c) => {
  const productId = c.req.param("id");
  const priceId = c.req.param("priceId");
  const [deleted] = await db
    .delete(productPrices)
    .where(and(eq(productPrices.id, priceId), eq(productPrices.productId, productId)))
    .returning();
  if (!deleted) return fail(c, 404, "Precio no encontrado");
  return c.body(null, 204);
});

// --- Imágenes (nested) ---

// POST /api/v1/admin/products/:id/images
adminProductsRouter.post("/:id/images", async (c) => {
  const productId = c.req.param("id");
  const parsed = await parseJson(c, productImageInsertSchema.omit({ productId: true }));
  if (!parsed.ok) return parsed.response;
  const [created] = await db
    .insert(productImages)
    .values({ ...parsed.data, productId })
    .returning();
  return c.json({ image: created }, 201);
});

// PATCH /api/v1/admin/products/:id/images/:imageId
adminProductsRouter.patch("/:id/images/:imageId", async (c) => {
  const productId = c.req.param("id");
  const imageId = c.req.param("imageId");
  const parsed = await parseJson(
    c,
    productImageInsertSchema.omit({ productId: true }).partial(),
  );
  if (!parsed.ok) return parsed.response;
  const [updated] = await db
    .update(productImages)
    .set(parsed.data)
    .where(and(eq(productImages.id, imageId), eq(productImages.productId, productId)))
    .returning();
  if (!updated) return fail(c, 404, "Imagen no encontrada");
  return c.json({ image: updated });
});

// DELETE /api/v1/admin/products/:id/images/:imageId
adminProductsRouter.delete("/:id/images/:imageId", async (c) => {
  const productId = c.req.param("id");
  const imageId = c.req.param("imageId");
  const [deleted] = await db
    .delete(productImages)
    .where(and(eq(productImages.id, imageId), eq(productImages.productId, productId)))
    .returning();
  if (!deleted) return fail(c, 404, "Imagen no encontrada");
  return c.body(null, 204);
});

// --- Categorías del producto (link table) ---

// POST /api/v1/admin/products/:id/categories
adminProductsRouter.post("/:id/categories", async (c) => {
  const productId = c.req.param("id");
  const parsed = await parseJson(c, linkCategorySchema);
  if (!parsed.ok) return parsed.response;
  await db
    .insert(productCategories)
    .values({ productId, categoryId: parsed.data.categoryId })
    .onConflictDoNothing();
  return c.json({ linked: true }, 201);
});

// DELETE /api/v1/admin/products/:id/categories/:categoryId
adminProductsRouter.delete("/:id/categories/:categoryId", async (c) => {
  const productId = c.req.param("id");
  const categoryId = c.req.param("categoryId");
  const [deleted] = await db
    .delete(productCategories)
    .where(
      and(
        eq(productCategories.productId, productId),
        eq(productCategories.categoryId, categoryId),
      ),
    )
    .returning();
  if (!deleted) return fail(c, 404, "Vínculo no encontrado");
  return c.body(null, 204);
});
