import { orderStatus } from "@avanzar/db/schema";

/** Unión de los estados posibles de una orden (derivada del enum de la DB). */
export type OrderStatus = (typeof orderStatus.enumValues)[number];

/**
 * Grafo de transiciones permitidas. Avance hacia adelante; cancelable solo antes
 * de `shipped`. `delivered` y `cancelled` son terminales. El restock al cancelar
 * lo aplica el caller (admin/orders), no este módulo puro.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

/** True si `from -> to` es una transición permitida. */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
