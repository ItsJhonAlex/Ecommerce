import { db } from "@avanzar/db";
import { addresses } from "@avanzar/db/schema";
import { addressInsertSchema } from "@avanzar/shared";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { fail } from "../../../lib/responses";
import { uuidParam } from "../../../lib/uuid";
import { parseJson } from "../../../lib/validate";
import { type AuthEnv, requireSession } from "../../../middlewares/auth";

/** Libreta de direcciones del usuario autenticado. Todo scopeado por user.id. */
export const addressesRouter = new Hono<AuthEnv>();

addressesRouter.use("*", requireSession);

// GET /api/v1/addresses
addressesRouter.get("/", async (c) => {
  const userId = c.var.user.id;
  const items = await db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId));
  return c.json({ addresses: items });
});

// GET /api/v1/addresses/:id
addressesRouter.get("/:id", uuidParam("id"), async (c) => {
  const userId = c.var.user.id;
  const id = c.req.param("id");
  const [item] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
    .limit(1);
  if (!item) return fail(c, 404, "Dirección no encontrada");
  return c.json({ address: item });
});

// POST /api/v1/addresses
addressesRouter.post("/", async (c) => {
  const userId = c.var.user.id;
  const parsed = await parseJson(c, addressInsertSchema);
  if (!parsed.ok) return parsed.response;

  const [created] = await db
    .insert(addresses)
    .values({ ...parsed.data, userId })
    .returning();
  return c.json({ address: created }, 201);
});

// PATCH /api/v1/addresses/:id
addressesRouter.patch("/:id", uuidParam("id"), async (c) => {
  const userId = c.var.user.id;
  const id = c.req.param("id");
  const parsed = await parseJson(c, addressInsertSchema.partial());
  if (!parsed.ok) return parsed.response;

  const [updated] = await db
    .update(addresses)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
    .returning();
  if (!updated) return fail(c, 404, "Dirección no encontrada");
  return c.json({ address: updated });
});

// DELETE /api/v1/addresses/:id
addressesRouter.delete("/:id", uuidParam("id"), async (c) => {
  const userId = c.var.user.id;
  const id = c.req.param("id");
  const [deleted] = await db
    .delete(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
    .returning();
  if (!deleted) return fail(c, 404, "Dirección no encontrada");
  return c.body(null, 204);
});
