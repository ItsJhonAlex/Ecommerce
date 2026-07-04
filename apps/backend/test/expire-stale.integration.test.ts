import { db } from "@avanzar/db";
import { orderStatusHistory, orders, products } from "@avanzar/db/schema";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, test } from "bun:test";
import { cancelStaleUnpaidOrders } from "../src/services/orders/expire-stale";
import {
  checkoutBody,
  postJson,
  resetDb,
  seedProduct,
  seedShippingRate,
} from "./helpers";

beforeEach(async () => {
  await resetDb();
});

/** Crea una orden vía checkout (queda pending_payment) y devuelve su id. */
async function createOrder(productId: string, qty = 2): Promise<string> {
  const res = await postJson("/api/v1/checkout", checkoutBody(productId, qty));
  const body = (await res.json()) as { order: { id: string; status: string } };
  return body.order.id;
}

/** Mueve el createdAt de una orden a `hours` horas atrás. */
async function ageOrder(orderId: string, hours: number): Promise<void> {
  await db
    .update(orders)
    .set({ createdAt: new Date(Date.now() - hours * 60 * 60 * 1000) })
    .where(eq(orders.id, orderId));
}

async function stockOf(productId: string): Promise<number> {
  const [row] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId));
  return row?.stockQuantity ?? -1;
}

describe("cancelStaleUnpaidOrders", () => {
  test("cancela una impaga vieja (>72h), repone stock y registra historial", async () => {
    const p = await seedProduct({ stock: 10 });
    await seedShippingRate();
    const orderId = await createOrder(p.id, 3);

    // Stock descontado por el checkout: 10 - 3 = 7.
    expect(await stockOf(p.id)).toBe(7);

    // La envejecemos a 73h atrás para que caiga bajo el TTL de 72h.
    await ageOrder(orderId, 73);

    const count = await cancelStaleUnpaidOrders();
    expect(count).toBeGreaterThanOrEqual(1);

    // Estado final: cancelled.
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));
    expect(order?.status).toBe("cancelled");

    // Stock repuesto al original.
    expect(await stockOf(p.id)).toBe(10);

    // Historial con entrada cancelled (changedBy null).
    const history = await db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, orderId));
    const cancelledEntry = history.find((h) => h.status === "cancelled");
    expect(cancelledEntry).toBeDefined();
    expect(cancelledEntry?.changedBy).toBeNull();
  });

  test("NO cancela una orden reciente en pending_payment", async () => {
    const p = await seedProduct({ stock: 10 });
    await seedShippingRate();
    const orderId = await createOrder(p.id, 2);

    const count = await cancelStaleUnpaidOrders();
    expect(count).toBe(0);

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));
    expect(order?.status).toBe("pending_payment");
    // Stock sin cambios: 10 - 2 = 8 (no se repuso).
    expect(await stockOf(p.id)).toBe(8);
  });
});
