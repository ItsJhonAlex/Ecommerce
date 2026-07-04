import { db } from "@avanzar/db";
import {
  productCategories,
  productImages,
  productPrices,
  products,
} from "@avanzar/db/schema";
import {
  imageReorderSchema,
  linkCategorySchema,
  productAdminQuerySchema,
  productImageInsertSchema,
  productInsertSchema,
  productPriceInsertSchema,
} from "@avanzar/shared";
import { type SQL, and, eq, ilike } from "drizzle-orm";
import { Hono } from "hono";
import { isUniqueViolation } from "../../../lib/db-errors";
import { fail } from "../../../lib/responses";
import { uuidParam } from "../../../lib/uuid";
import { parseJson, parseQuery } from "../../../lib/validate";
import type { AuthEnv } from "../../../middlewares/auth";

/** CRUD de productos para admin. Incluye todos los status (draft/active/archived). */
export const adminProductsRouter = new Hono<AuthEnv>();

/** Señala dentro de la transacción de reorden que el set de imágenes no coincide. */
class ReorderError extends Error {}

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
adminProductsRouter.get("/:id", uuidParam("id"), async (c) => {
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
  try {
    const [created] = await db.insert(products).values(parsed.data).returning();
    return c.json({ product: created }, 201);
  } catch (e) {
    if (isUniqueViolation(e)) {
      return fail(c, 409, "Ese slug ya está en uso", {
        code: "PRODUCT_SLUG_TAKEN",
      });
    }
    throw e;
  }
});

// PATCH /api/v1/admin/products/:id
adminProductsRouter.patch("/:id", uuidParam("id"), async (c) => {
  const id = c.req.param("id");
  const parsed = await parseJson(c, productInsertSchema.partial());
  if (!parsed.ok) return parsed.response;
  try {
    const [updated] = await db
      .update(products)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    if (!updated) return fail(c, 404, "Producto no encontrado");
    return c.json({ product: updated });
  } catch (e) {
    if (isUniqueViolation(e)) {
      return fail(c, 409, "Ese slug ya está en uso", {
        code: "PRODUCT_SLUG_TAKEN",
      });
    }
    throw e;
  }
});

// POST /api/v1/admin/products/:id/archive  (soft delete, idempotente)
adminProductsRouter.post("/:id/archive", uuidParam("id"), async (c) => {
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
adminProductsRouter.post("/:id/prices", uuidParam("id"), async (c) => {
  const productId = c.req.param("id");
  const parsed = await parseJson(c, productPriceInsertSchema.omit({ productId: true }));
  if (!parsed.ok) return parsed.response;
  try {
    const [created] = await db
      .insert(productPrices)
      .values({ ...parsed.data, productId })
      .returning();
    return c.json({ price: created }, 201);
  } catch (e) {
    if (isUniqueViolation(e)) {
      return fail(c, 409, "Ya existe un precio para esa moneda", {
        code: "PRICE_CURRENCY_EXISTS",
      });
    }
    throw e;
  }
});

// PATCH /api/v1/admin/products/:id/prices/:priceId
adminProductsRouter.patch(
  "/:id/prices/:priceId",
  uuidParam("id"),
  uuidParam("priceId"),
  async (c) => {
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
adminProductsRouter.delete(
  "/:id/prices/:priceId",
  uuidParam("id"),
  uuidParam("priceId"),
  async (c) => {
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
adminProductsRouter.post("/:id/images", uuidParam("id"), async (c) => {
  const productId = c.req.param("id");
  const parsed = await parseJson(c, productImageInsertSchema.omit({ productId: true }));
  if (!parsed.ok) return parsed.response;
  const [created] = await db
    .insert(productImages)
    .values({ ...parsed.data, productId })
    .returning();
  return c.json({ image: created }, 201);
});

// PATCH /api/v1/admin/products/:id/images/reorder
// Reordena todas las imágenes del producto en una sola escritura atómica.
// El body debe listar exactamente todas las imágenes del producto (mismo set);
// cada una recibe como position su índice en el array (0..n-1).
adminProductsRouter.patch(
  "/:id/images/reorder",
  uuidParam("id"),
  async (c) => {
    const productId = c.req.param("id");
    const parsed = await parseJson(c, imageReorderSchema);
    if (!parsed.ok) return parsed.response;
    const { imageIds } = parsed.data;

    try {
      const images = await db.transaction(async (tx) => {
        const existing = await tx
          .select({ id: productImages.id })
          .from(productImages)
          .where(eq(productImages.productId, productId));

        const existingIds = new Set(existing.map((img) => img.id));
        const requested = new Set(imageIds);
        // El set del body debe coincidir exactamente con las imágenes del producto:
        // misma cantidad (descarta duplicados/faltantes) y todas pertenecen a él.
        const sameSet =
          requested.size === imageIds.length &&
          existingIds.size === requested.size &&
          imageIds.every((id) => existingIds.has(id));
        if (!sameSet) {
          throw new ReorderError();
        }

        // position no tiene constraint unique → setear 0..n-1 no colisiona.
        for (const [index, imageId] of imageIds.entries()) {
          await tx
            .update(productImages)
            .set({ position: index })
            .where(
              and(
                eq(productImages.id, imageId),
                eq(productImages.productId, productId),
              ),
            );
        }

        return tx
          .select()
          .from(productImages)
          .where(eq(productImages.productId, productId))
          .orderBy(productImages.position);
      });
      return c.json({ images });
    } catch (e) {
      if (e instanceof ReorderError) {
        return fail(c, 400, "Las imágenes no coinciden con las del producto");
      }
      throw e;
    }
  },
);

// PATCH /api/v1/admin/products/:id/images/:imageId
adminProductsRouter.patch(
  "/:id/images/:imageId",
  uuidParam("id"),
  uuidParam("imageId"),
  async (c) => {
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
adminProductsRouter.delete(
  "/:id/images/:imageId",
  uuidParam("id"),
  uuidParam("imageId"),
  async (c) => {
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
adminProductsRouter.post("/:id/categories", uuidParam("id"), async (c) => {
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
adminProductsRouter.delete(
  "/:id/categories/:categoryId",
  uuidParam("id"),
  uuidParam("categoryId"),
  async (c) => {
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
