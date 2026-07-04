import { db } from "@avanzar/db";
import { Hono } from "hono";
import { fail } from "../../../lib/responses";
import { uuidParam } from "../../../lib/uuid";

/** Seguimiento público del pedido por token opaco (sin auth). */
export const trackRouter = new Hono();

// GET /api/v1/track/:token — estado del pedido por token.
trackRouter.get("/:token", uuidParam("token"), async (c) => {
  const token = c.req.param("token");

  const order = await db.query.orders.findFirst({
    where: (o, { eq }) => eq(o.receiptToken, token),
    with: {
      items: true,
      statusHistory: { orderBy: (h, { asc }) => [asc(h.createdAt)] },
    },
  });
  // 404 uniforme: no revelamos si el token existe o no.
  if (!order) return fail(c, 404, "Pedido no encontrado");

  // Vista acotada: mapeamos explícitamente para NO filtrar PII (buyer*, ship*,
  // receiptToken, etc.) ni devolver la fila cruda.
  return c.json({
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      fulfillment: order.fulfillment,
      createdAt: order.createdAt,
      currency: order.currency,
      subtotalMinor: order.subtotalMinor,
      shippingMinor: order.shippingMinor,
      discountMinor: order.discountMinor,
      totalMinor: order.totalMinor,
      items: order.items.map((it) => ({
        productName: it.productName,
        quantity: it.quantity,
        lineTotalMinor: it.lineTotalMinor,
      })),
      statusHistory: order.statusHistory.map((h) => ({
        status: h.status,
        createdAt: h.createdAt,
      })),
    },
  });
});
