import { db } from "@avanzar/db";
import { Hono } from "hono";

/**
 * Catálogo público: solo productos `active`.
 * Drafts y archivados no se exponen en el storefront.
 */
export const productsRouter = new Hono();

// GET /api/v1/products
productsRouter.get("/", async (c) => {
  const items = await db.query.products.findMany({
    where: (p, { eq }) => eq(p.status, "active"),
    orderBy: (p, { asc }) => [asc(p.name)],
    with: {
      prices: true,
      images: { orderBy: (img, { asc }) => [asc(img.position)] },
    },
  });
  return c.json({ products: items });
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
