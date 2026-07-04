import { db } from "@avanzar/db";
import { Hono } from "hono";
import { fail } from "../../../lib/responses";
import { uuidParam } from "../../../lib/uuid";
import { type AuthEnv, requireSession } from "../../../middlewares/auth";

/** Pedidos del usuario autenticado (solo lectura; se crean vía checkout). */
export const ordersRouter = new Hono<AuthEnv>();

ordersRouter.use("*", requireSession);

// GET /api/v1/orders
ordersRouter.get("/", async (c) => {
  const userId = c.var.user.id;
  const items = await db.query.orders.findMany({
    where: (o, { eq }) => eq(o.userId, userId),
    orderBy: (o, { desc }) => [desc(o.createdAt)],
    with: { items: true, payments: true },
  });
  return c.json({ orders: items });
});

// GET /api/v1/orders/:id
ordersRouter.get("/:id", uuidParam("id"), async (c) => {
  const userId = c.var.user.id;
  const id = c.req.param("id");
  const order = await db.query.orders.findFirst({
    where: (o, { and, eq }) => and(eq(o.id, id), eq(o.userId, userId)),
    with: {
      items: true,
      payments: true,
      statusHistory: { orderBy: (h, { asc }) => [asc(h.createdAt)] },
    },
  });
  if (!order) return fail(c, 404, "Pedido no encontrado");
  return c.json({ order });
});
