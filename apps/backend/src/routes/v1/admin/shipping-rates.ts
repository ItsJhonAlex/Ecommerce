import { db } from "@avanzar/db";
import { shippingRates } from "@avanzar/db/schema";
import { shippingRateInsertSchema } from "@avanzar/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { fail } from "../../../lib/responses";
import { parseJson } from "../../../lib/validate";
import type { AuthEnv } from "../../../middlewares/auth";

export const adminShippingRatesRouter = new Hono<AuthEnv>();

// GET /api/v1/admin/shipping-rates
adminShippingRatesRouter.get("/", async (c) => {
  const items = await db.select().from(shippingRates);
  return c.json({ shippingRates: items });
});

// POST /api/v1/admin/shipping-rates
adminShippingRatesRouter.post("/", async (c) => {
  const parsed = await parseJson(c, shippingRateInsertSchema);
  if (!parsed.ok) return parsed.response;
  const [created] = await db.insert(shippingRates).values(parsed.data).returning();
  return c.json({ shippingRate: created }, 201);
});

// PATCH /api/v1/admin/shipping-rates/:id
adminShippingRatesRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = await parseJson(c, shippingRateInsertSchema.partial());
  if (!parsed.ok) return parsed.response;
  const [updated] = await db
    .update(shippingRates)
    .set(parsed.data)
    .where(eq(shippingRates.id, id))
    .returning();
  if (!updated) return fail(c, 404, "Tarifa no encontrada");
  return c.json({ shippingRate: updated });
});

// DELETE /api/v1/admin/shipping-rates/:id
adminShippingRatesRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const [deleted] = await db
    .delete(shippingRates)
    .where(eq(shippingRates.id, id))
    .returning();
  if (!deleted) return fail(c, 404, "Tarifa no encontrada");
  return c.body(null, 204);
});
