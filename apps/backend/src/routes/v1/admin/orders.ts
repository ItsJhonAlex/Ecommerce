import { db } from "@avanzar/db";
import { orderStatusHistory, orders } from "@avanzar/db/schema";
import { orderListQuerySchema, updateOrderStatusSchema } from "@avanzar/shared";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { fail } from "../../../lib/responses";
import { uuidParam } from "../../../lib/uuid";
import { parseJson, parseQuery } from "../../../lib/validate";
import type { AuthEnv } from "../../../middlewares/auth";
import { canTransition } from "../../../services/order-status";
import { restockOrderItems } from "../../../services/orders/cancel";
import { renderReceipt } from "../../../services/receipt/render";
import { getStoreSettings } from "../../../services/store-settings";

export const adminOrdersRouter = new Hono<AuthEnv>();

// GET /api/v1/admin/orders?status=
adminOrdersRouter.get("/", async (c) => {
  const parsed = parseQuery(c, orderListQuerySchema);
  if (!parsed.ok) return parsed.response;
  const { status } = parsed.data;

  const items = await db.query.orders.findMany({
    where: status ? (o, { eq: e }) => e(o.status, status) : undefined,
    orderBy: (o, { desc }) => [desc(o.createdAt)],
    with: { items: true, payments: true },
  });
  return c.json({ orders: items });
});

// GET /api/v1/admin/orders/:id
adminOrdersRouter.get("/:id", uuidParam("id"), async (c) => {
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

// GET /api/v1/admin/orders/:id/receipt — recibo del pedido en PDF.
adminOrdersRouter.get("/:id/receipt", uuidParam("id"), async (c) => {
  const id = c.req.param("id");
  const order = await db.query.orders.findFirst({
    where: (o, { eq: e }) => e(o.id, id),
    with: { items: true, payments: true },
  });
  if (!order) return fail(c, 404, "Pedido no encontrado");

  // La orden (con items/payments) ya calza con el shape que espera renderReceipt:
  // items expone productName/quantity/unitAmountMinor/lineTotalMinor y payments
  // method/status. Los campos extra son inertes para el recibo.
  const settings = await getStoreSettings();
  const pdf = await renderReceipt(order, settings);

  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibo-${order.orderNumber}.pdf"`,
    },
  });
});

// PATCH /api/v1/admin/orders/:id/status
adminOrdersRouter.patch("/:id/status", uuidParam("id"), async (c) => {
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
  if (!canTransition(existing.status, status, existing.fulfillment)) {
    return fail(c, 422, "INVALID_TRANSITION", {
      code: "INVALID_TRANSITION",
      from: existing.status,
      to: status,
    });
  }

  const result = await db.transaction(async (tx) => {
    // UPDATE condicional sobre el estado esperado: si otro request ya cambió el
    // estado entre el read y este write, no afecta fila y abortamos (409).
    const [row] = await tx
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(orders.id, id), eq(orders.status, existing.status)))
      .returning();
    if (!row) return null;

    await tx.insert(orderStatusHistory).values({
      orderId: id,
      status,
      changedBy,
    });

    // Cancelar repone el stock descontado en el checkout.
    if (status === "cancelled") {
      await restockOrderItems(tx, id);
    }

    return row;
  });

  if (!result) {
    return fail(c, 409, "El pedido cambió de estado, reintentá");
  }

  // Releer con relaciones para devolver la misma forma que GET /:id (la fila
  // existe: la acabamos de actualizar dentro de la transacción).
  const order = await db.query.orders.findFirst({
    where: (o, { eq: e }) => e(o.id, id),
    with: {
      items: true,
      payments: true,
      statusHistory: { orderBy: (h, { asc }) => [asc(h.createdAt)] },
    },
  });
  return c.json({ order });
});
