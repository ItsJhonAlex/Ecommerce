import { db } from "@avanzar/db";
import { categories } from "@avanzar/db/schema";
import { categoryInsertSchema } from "@avanzar/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { isUniqueViolation } from "../../../lib/db-errors";
import { fail } from "../../../lib/responses";
import { parseJson } from "../../../lib/validate";
import type { AuthEnv } from "../../../middlewares/auth";

export const adminCategoriesRouter = new Hono<AuthEnv>();

// GET /api/v1/admin/categories
adminCategoriesRouter.get("/", async (c) => {
  const items = await db.query.categories.findMany({
    orderBy: (cat, { asc }) => [asc(cat.name)],
  });
  return c.json({ categories: items });
});

// POST /api/v1/admin/categories
adminCategoriesRouter.post("/", async (c) => {
  const parsed = await parseJson(c, categoryInsertSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const [created] = await db.insert(categories).values(parsed.data).returning();
    return c.json({ category: created }, 201);
  } catch (e) {
    if (isUniqueViolation(e)) {
      return fail(c, 409, "Ese slug ya está en uso", {
        code: "CATEGORY_SLUG_TAKEN",
      });
    }
    throw e;
  }
});

// PATCH /api/v1/admin/categories/:id
adminCategoriesRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = await parseJson(c, categoryInsertSchema.partial());
  if (!parsed.ok) return parsed.response;
  try {
    const [updated] = await db
      .update(categories)
      .set(parsed.data)
      .where(eq(categories.id, id))
      .returning();
    if (!updated) return fail(c, 404, "Categoría no encontrada");
    return c.json({ category: updated });
  } catch (e) {
    if (isUniqueViolation(e)) {
      return fail(c, 409, "Ese slug ya está en uso", {
        code: "CATEGORY_SLUG_TAKEN",
      });
    }
    throw e;
  }
});

// DELETE /api/v1/admin/categories/:id  (hard delete; product_categories cae por cascade)
adminCategoriesRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const [deleted] = await db
    .delete(categories)
    .where(eq(categories.id, id))
    .returning();
  if (!deleted) return fail(c, 404, "Categoría no encontrada");
  return c.body(null, 204);
});
