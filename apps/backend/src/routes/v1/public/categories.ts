import { db } from "@avanzar/db";
import { Hono } from "hono";

/** Categorías públicas: lista plana con parent_id; el cliente arma el árbol. */
export const categoriesRouter = new Hono();

// GET /api/v1/categories
categoriesRouter.get("/", async (c) => {
  const items = await db.query.categories.findMany({
    orderBy: (cat, { asc }) => [asc(cat.name)],
  });
  return c.json({ categories: items });
});
