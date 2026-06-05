import { db } from "@avanzar/db";
import {
  orderItems,
  orderStatusHistory,
  orders,
  payments,
  shippingRates,
} from "@avanzar/db/schema";
import { checkoutSchema } from "@avanzar/shared";
import { and, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { auth } from "../../../auth";
import { fail } from "../../../lib/responses";
import { parseJson } from "../../../lib/validate";
import {
  CheckoutError,
  computeOrderTotals,
  generateOrderNumber,
  resolveCheckoutItems,
} from "../../../services/checkout";

/** Checkout: crea orden + items + historial + pago pending en una transacción. */
export const checkoutRouter = new Hono();

// POST /api/v1/checkout
checkoutRouter.post("/", async (c) => {
  const parsed = await parseJson(c, checkoutSchema);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  // Sesión opcional: guest checkout permitido.
  const sessionResult = await auth.api.getSession({ headers: c.req.raw.headers });
  const userId = sessionResult?.user.id ?? null;

  // Cargar productos referenciados con sus precios.
  const productIds = input.items.map((i) => i.productId);
  const loaded = await db.query.products.findMany({
    where: (p) => inArray(p.id, productIds),
    with: { prices: true },
  });

  // Resolver líneas (snapshot) — errores de negocio => 422 antes de la transacción.
  let lines;
  try {
    lines = resolveCheckoutItems(loaded, input.items, input.currency);
  } catch (e) {
    if (e instanceof CheckoutError) {
      return fail(c, 422, e.code, { code: e.code, ...e.details });
    }
    throw e;
  }

  // Tarifa de envío para la provincia destino.
  const [rate] = await db
    .select()
    .from(shippingRates)
    .where(
      and(
        eq(shippingRates.province, input.recipient.province),
        eq(shippingRates.currency, input.currency),
        eq(shippingRates.active, true),
      ),
    )
    .limit(1);
  if (!rate) {
    return fail(c, 422, "SHIPPING_NOT_SUPPORTED", {
      code: "SHIPPING_NOT_SUPPORTED",
      province: input.recipient.province,
    });
  }

  const totals = computeOrderTotals(lines, rate.amountMinor);
  const orderNumber = generateOrderNumber(new Date(), Math.random());

  const result = await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        orderNumber,
        userId,
        status: "pending_payment",
        currency: input.currency,
        buyerName: input.buyer.name,
        buyerEmail: input.buyer.email,
        buyerPhone: input.buyer.phone,
        shipRecipient: input.recipient.name,
        shipPhone: input.recipient.phone,
        shipProvince: input.recipient.province,
        shipMunicipality: input.recipient.municipality,
        shipAddressLine: input.recipient.addressLine,
        shipReference: input.recipient.reference ?? null,
        subtotalMinor: totals.subtotalMinor,
        shippingMinor: totals.shippingMinor,
        discountMinor: totals.discountMinor,
        totalMinor: totals.totalMinor,
      })
      .returning();
    if (!order) throw new Error("No se pudo crear la orden");

    await tx.insert(orderItems).values(
      lines.map((l) => ({
        orderId: order.id,
        productId: l.productId,
        productName: l.productName,
        unitAmountMinor: l.unitAmountMinor,
        quantity: l.quantity,
        lineTotalMinor: l.lineTotalMinor,
      })),
    );

    await tx.insert(orderStatusHistory).values({
      orderId: order.id,
      status: "pending_payment",
      changedBy: userId,
    });

    const [payment] = await tx
      .insert(payments)
      .values({
        orderId: order.id,
        method: input.payment.method,
        status: "pending",
        amountMinor: totals.totalMinor,
        currency: input.currency,
      })
      .returning();

    return { order, payment };
  });

  return c.json(result, 201);
});
