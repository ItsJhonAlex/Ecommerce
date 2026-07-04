import { db } from "@avanzar/db";
import { orderStatusHistory, orders } from "@avanzar/db/schema";
import { and, eq, lt } from "drizzle-orm";
import { loadEnv } from "../../env";
import { restockOrderItems } from "./cancel";

/** TTL por defecto (horas) tras el cual una orden impaga se auto-cancela. */
const DEFAULT_TTL_HOURS = 72;

/**
 * Cancela las órdenes que quedaron en `pending_payment` más allá del TTL (72h
 * por defecto, configurable con `ORDER_UNPAID_TTL_HOURS`) y repone su stock.
 * Sin esto, un checkout que nunca se paga deja stock retenido para siempre (el
 * restock solo ocurría por cancelación manual del admin).
 *
 * Robustez: se seleccionan los candidatos y luego se procesa **una transacción
 * por orden**. Así un fallo puntual (o una carrera con un cambio de estado
 * manual) no revierte el resto del barrido. El UPDATE es condicional sobre
 * `status = 'pending_payment'`: si el admin cambió el estado entre el SELECT y
 * el UPDATE, la fila no se afecta y esa orden se saltea (no cuenta, no restock).
 *
 * @param now instante de referencia (inyectable para tests).
 * @returns cuántas órdenes se cancelaron efectivamente.
 */
export async function cancelStaleUnpaidOrders(
  now: Date = new Date(),
): Promise<number> {
  const ttlHours = loadEnv().ORDER_UNPAID_TTL_HOURS ?? DEFAULT_TTL_HOURS;
  const threshold = new Date(now.getTime() - ttlHours * 60 * 60 * 1000);

  const candidates = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(eq(orders.status, "pending_payment"), lt(orders.createdAt, threshold)),
    );

  let cancelled = 0;
  for (const { id } of candidates) {
    const didCancel = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(orders)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(
          and(eq(orders.id, id), eq(orders.status, "pending_payment")),
        )
        .returning({ id: orders.id });
      if (!row) return false;

      await tx.insert(orderStatusHistory).values({
        orderId: id,
        status: "cancelled",
        changedBy: null,
      });

      await restockOrderItems(tx, id);
      return true;
    });
    if (didCancel) cancelled += 1;
  }

  return cancelled;
}
