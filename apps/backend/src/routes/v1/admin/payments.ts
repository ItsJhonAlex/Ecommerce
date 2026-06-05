import { db } from "@avanzar/db";
import { orderStatusHistory, orders, payments } from "@avanzar/db/schema";
import { confirmPaymentSchema } from "@avanzar/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { fail } from "../../../lib/responses";
import { parseJson } from "../../../lib/validate";
import type { AuthEnv } from "../../../middlewares/auth";

export const adminPaymentsRouter = new Hono<AuthEnv>();

// GET /api/v1/admin/payments?status=
adminPaymentsRouter.get("/", async (c) => {
  const status = c.req.query("status");
  const items = await db.query.payments.findMany({
    where: status ? (p, { eq: e }) => e(p.status, status as never) : undefined,
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  });
  return c.json({ payments: items });
});

// GET /api/v1/admin/payments/:id
adminPaymentsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const payment = await db.query.payments.findFirst({
    where: (p, { eq: e }) => e(p.id, id),
    with: { order: true },
  });
  if (!payment) return fail(c, 404, "Pago no encontrado");
  return c.json({ payment });
});

// PATCH /api/v1/admin/payments/:id/confirm
adminPaymentsRouter.patch("/:id/confirm", async (c) => {
  const id = c.req.param("id");
  const confirmedBy = c.var.user.id;
  const parsed = await parseJson(c, confirmPaymentSchema);
  if (!parsed.ok) return parsed.response;

  const existing = await db.query.payments.findFirst({
    where: (p, { eq: e }) => e(p.id, id),
  });
  if (!existing) return fail(c, 404, "Pago no encontrado");
  if (existing.status !== "pending") {
    return fail(c, 409, "El pago no está pendiente");
  }

  const confirmed = await db.transaction(async (tx) => {
    const [payment] = await tx
      .update(payments)
      .set({
        status: "confirmed",
        confirmedBy,
        reference: parsed.data.reference,
        confirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, id))
      .returning();
    if (!payment) throw new Error("No se pudo actualizar el pago");

    // Promover la orden a 'paid' si seguía esperando pago.
    const order = await tx.query.orders.findFirst({
      where: (o, { eq: e }) => e(o.id, payment.orderId),
    });
    if (order && order.status === "pending_payment") {
      await tx
        .update(orders)
        .set({ status: "paid", updatedAt: new Date() })
        .where(eq(orders.id, order.id));
      await tx.insert(orderStatusHistory).values({
        orderId: order.id,
        status: "paid",
        changedBy: confirmedBy,
      });
    }

    return payment;
  });

  return c.json({ payment: confirmed });
});
