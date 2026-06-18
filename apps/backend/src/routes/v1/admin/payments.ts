import { db } from "@avanzar/db";
import { orderStatusHistory, orders, payments } from "@avanzar/db/schema";
import { confirmPaymentSchema, paymentListQuerySchema } from "@avanzar/shared";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { fail } from "../../../lib/responses";
import { parseJson, parseQuery } from "../../../lib/validate";
import type { AuthEnv } from "../../../middlewares/auth";

export const adminPaymentsRouter = new Hono<AuthEnv>();

// GET /api/v1/admin/payments?status=
adminPaymentsRouter.get("/", async (c) => {
  const parsed = parseQuery(c, paymentListQuerySchema);
  if (!parsed.ok) return parsed.response;
  const { status } = parsed.data;

  const items = await db.query.payments.findMany({
    where: status ? (p, { eq: e }) => e(p.status, status) : undefined,
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

  const confirmed = await db.transaction(async (tx) => {
    // UPDATE condicional sobre status='pending': atómico contra doble confirmación.
    const [payment] = await tx
      .update(payments)
      .set({
        status: "confirmed",
        confirmedBy,
        reference: parsed.data.reference,
        confirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(payments.id, id), eq(payments.status, "pending")))
      .returning();
    if (!payment) return null;

    // Promover la orden a 'paid' solo si seguía esperando pago. El UPDATE
    // condicional sobre status='pending_payment' es atómico: si otra confirmación
    // ya la promovió, no afecta fila y no duplicamos la entrada de historial.
    const [promoted] = await tx
      .update(orders)
      .set({ status: "paid", updatedAt: new Date() })
      .where(
        and(eq(orders.id, payment.orderId), eq(orders.status, "pending_payment")),
      )
      .returning();
    if (promoted) {
      await tx.insert(orderStatusHistory).values({
        orderId: promoted.id,
        status: "paid",
        changedBy: confirmedBy,
      });
    }

    return payment;
  });

  if (!confirmed) {
    return fail(c, 409, "El pago no está pendiente");
  }
  return c.json({ payment: confirmed });
});
