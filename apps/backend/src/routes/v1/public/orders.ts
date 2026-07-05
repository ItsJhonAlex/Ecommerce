import { db } from "@avanzar/db";
import { orders } from "@avanzar/db/schema";
import { orderClaimSchema } from "@avanzar/shared";
import { and, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { fail } from "../../../lib/responses";
import { uuidParam } from "../../../lib/uuid";
import { parseJson } from "../../../lib/validate";
import { type AuthEnv, requireSession } from "../../../middlewares/auth";

/** Pedidos del usuario autenticado (solo lectura; se crean vía checkout). */
export const ordersRouter = new Hono<AuthEnv>();

ordersRouter.use("*", requireSession);

// POST /api/v1/orders/claim — vincula un pedido de invitado a la cuenta actual.
// La posesión del token de seguimiento (receiptToken, uuid opaco) es la prueba;
// no hace falta verificación de email. Registrado antes de GET /:id (métodos
// distintos, sin conflicto de ruteo).
ordersRouter.post("/claim", async (c) => {
  const userId = c.var.user.id;
  const parsed = await parseJson(c, orderClaimSchema);
  if (!parsed.ok) return parsed.response;
  const { token } = parsed.data;

  const existing = await db.query.orders.findFirst({
    where: (o, { eq: e }) => e(o.receiptToken, token),
    columns: { id: true, userId: true },
  });
  if (!existing) return fail(c, 404, "Pedido no encontrado");

  if (existing.userId && existing.userId !== userId) {
    return fail(c, 409, "Este pedido ya está asociado a otra cuenta");
  }

  // Vincular solo si sigue sin dueño (condicional atómico contra carreras). Si ya
  // es de este usuario, es idempotente y saltamos el UPDATE.
  if (existing.userId === null) {
    const [linked] = await db
      .update(orders)
      .set({ userId, updatedAt: new Date() })
      .where(and(eq(orders.id, existing.id), isNull(orders.userId)))
      .returning({ id: orders.id });
    if (!linked) {
      return fail(c, 409, "Este pedido ya está asociado a otra cuenta");
    }
  }

  // Releer con relaciones, ya scopeado al usuario, igual que GET /:id.
  const order = await db.query.orders.findFirst({
    where: (o, { and: a, eq: e }) => a(e(o.id, existing.id), e(o.userId, userId)),
    with: {
      items: true,
      payments: true,
      statusHistory: { orderBy: (h, { asc }) => [asc(h.createdAt)] },
    },
  });
  return c.json({ order });
});

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
