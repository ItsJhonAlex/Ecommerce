import type { Database } from "@avanzar/db";
import { orderItems, products } from "@avanzar/db/schema";
import { eq, sql } from "drizzle-orm";

/** Tipo de la transacción que expone `db.transaction(async (tx) => ...)`. */
export type DbTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];

/**
 * Repone el stock descontado en el checkout para los items de un pedido. Solo
 * para items cuyo producto sigue existiendo (`productId` es set-null si el
 * producto se borró). Debe correr dentro de una transacción (`tx`).
 */
export async function restockOrderItems(
  tx: DbTransaction,
  orderId: string,
): Promise<void> {
  const items = await tx
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  for (const it of items) {
    if (it.productId) {
      await tx
        .update(products)
        .set({
          stockQuantity: sql`${products.stockQuantity} + ${it.quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(products.id, it.productId));
    }
  }
}
