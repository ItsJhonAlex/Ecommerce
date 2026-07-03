import { db } from "@avanzar/db";
import {
  orderItems,
  orderStatusHistory,
  orders,
  payments,
  products,
  shippingRates,
} from "@avanzar/db/schema";
import { checkoutSchema } from "@avanzar/shared";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import { auth } from "../../../auth";
import { isUniqueViolation } from "../../../lib/db-errors";
import { fail } from "../../../lib/responses";
import { parseJson } from "../../../lib/validate";
import {
  CheckoutError,
  computeOrderTotals,
  generateOrderNumber,
  resolveCheckoutItems,
} from "../../../services/checkout";

/** Cuántas veces se reintenta el checkout ante colisión del order_number. */
const MAX_ORDER_NUMBER_ATTEMPTS = 5;

/** Checkout: descuenta stock, crea orden + items + historial + pago pending en una transacción. */
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

  // Envío según método de entrega. Retiro: sin tarifa, envío 0, dirección null.
  let shippingMinor = 0;
  let shipProvince: string | null = null;
  let shipMunicipality: string | null = null;
  let shipAddressLine: string | null = null;
  let shipReference: string | null = null;

  if (input.fulfillment === "delivery") {
    const [rate] = await db
      .select()
      .from(shippingRates)
      .where(
        and(
          eq(shippingRates.province, input.recipient.province as string),
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
    shippingMinor = rate.amountMinor;
    // El superRefine del schema garantiza estos campos en delivery.
    shipProvince = input.recipient.province as string;
    shipMunicipality = input.recipient.municipality as string;
    shipAddressLine = input.recipient.addressLine as string;
    shipReference = input.recipient.reference ?? null;
  }

  const totals = computeOrderTotals(lines, shippingMinor);

  // La transacción se reintenta si el order_number aleatorio colisiona (unique).
  // Cada intento regenera el número; el rollback revierte el decremento de stock.
  for (let attempt = 1; attempt <= MAX_ORDER_NUMBER_ATTEMPTS; attempt++) {
    const orderNumber = generateOrderNumber(new Date(), Math.random());
    try {
      const result = await db.transaction(async (tx) => {
        // Decremento atómico de stock (anti-sobreventa). El WHERE stock >= qty evita
        // vender de más bajo concurrencia: si no afecta fila, el stock es insuficiente.
        for (const line of lines) {
          const [updated] = await tx
            .update(products)
            .set({
              stockQuantity: sql`${products.stockQuantity} - ${line.quantity}`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(products.id, line.productId),
                gte(products.stockQuantity, line.quantity),
              ),
            )
            .returning({ id: products.id });
          if (!updated) {
            throw new CheckoutError("INSUFFICIENT_STOCK", {
              productId: line.productId,
            });
          }
        }

        const [order] = await tx
          .insert(orders)
          .values({
            orderNumber,
            userId,
            status: "pending_payment",
            fulfillment: input.fulfillment,
            currency: input.currency,
            buyerName: input.buyer.name,
            buyerEmail: input.buyer.email,
            buyerPhone: input.buyer.phone,
            shipRecipient: input.recipient.name,
            shipPhone: input.recipient.phone,
            shipProvince,
            shipMunicipality,
            shipAddressLine,
            shipReference,
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
    } catch (e) {
      if (e instanceof CheckoutError) {
        return fail(c, 422, e.code, { code: e.code, ...e.details });
      }
      // Colisión del order_number: reintentar con otro número si quedan intentos.
      if (isUniqueViolation(e)) {
        if (attempt < MAX_ORDER_NUMBER_ATTEMPTS) continue;
        return fail(c, 503, "No se pudo generar el número de orden, reintentá", {
          code: "ORDER_NUMBER_COLLISION",
        });
      }
      throw e; // error inesperado => onError global => 500
    }
  }

  // Inalcanzable (el loop retorna o lanza), pero TS necesita un return final.
  return fail(c, 503, "No se pudo generar el número de orden, reintentá", {
    code: "ORDER_NUMBER_COLLISION",
  });
});
