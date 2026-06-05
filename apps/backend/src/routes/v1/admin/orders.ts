import { db } from "@avanzar/db";
import { orderStatusHistory, orders } from "@avanzar/db/schema";
import { updateOrderStatusSchema } from "@avanzar/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { fail } from "../../../lib/responses";
import { parseJson } from "../../../lib/validate";
import type { AuthEnv } from "../../../middlewares/auth";

export const adminOrdersRouter = new Hono<AuthEnv>();

// GET /api/v1/admin/orders?status=
adminOrdersRouter.get("/", async (c) => {
  const status = c.req.query("status");
  const items = await db.query.orders.findMany({
    where: status ? (o, { eq: e }) => e(o.status, status as never) : undefined,
    orderBy: (o, { desc }) => [desc(o.createdAt)],
    with: { items: true, payments: true },
  });
  return c.json({ orders: items });
});

// GET /api/v1/admin/orders/:id
adminOrdersRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const order = await db.query.orders.findFirst({
    where: (o, { eq: e }) => e(o.id, id),
    with: {
      items: true,
      payments: true,
      statusHistory: { orderBy: (h, { asc }) => [asc(h.createdAt)] },
    },
  });
  if (!order) return fail(c, 404, "Pedido no encontrado");
  return c.json({ order });
});

// PATCH /api/v1/admin/orders/:id/status
adminOrdersRouter.patch("/:id/status", async (c) => {
  const id = c.req.param("id");
  const changedBy = c.var.user.id;
  const parsed = await parseJson(c, updateOrderStatusSchema);
  if (!parsed.ok) return parsed.response;
  const { status } = parsed.data;

  const existing = await db.query.orders.findFirst({
    where: (o, { eq: e }) => e(o.id, id),
  });
  if (!existing) return fail(c, 404, "Pedido no encontrado");
  if (existing.status === status) {
    return fail(c, 409, "El pedido ya está en ese estado");
  }

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    await tx.insert(orderStatusHistory).values({
      orderId: id,
      status,
      changedBy,
    });
    return row;
  });

  return c.json({ order: updated });
});
