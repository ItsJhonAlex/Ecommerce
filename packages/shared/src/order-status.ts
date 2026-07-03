import { fulfillmentMethod, orderStatus } from "@avanzar/db/schema";

/** Unión de los estados posibles de una orden (derivada del enum de la DB). */
export type OrderStatus = (typeof orderStatus.enumValues)[number];

/** Método de entrega (derivado del enum de la DB). */
export type FulfillmentMethod = (typeof fulfillmentMethod.enumValues)[number];

/** Array de estados de pedido (para poblar selects en el front sin tocar @avanzar/db). */
export const ORDER_STATUSES: readonly OrderStatus[] = orderStatus.enumValues;

/**
 * Grafo de transiciones de DOMICILIO. Avance hacia adelante; cancelable antes de
 * `shipped`. `delivered`/`cancelled` terminales. El restock al cancelar lo aplica
 * el caller (admin/orders), no este módulo puro.
 */
const DELIVERY_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  ready_for_pickup: [], // no usado en domicilio
  delivered: [],
  cancelled: [],
};

/**
 * Grafo de transiciones de RETIRO. `pagado → procesado → listo para retirar →
 * retirado`. Cancelable hasta que se retira (incluye desde `ready_for_pickup`).
 */
const PICKUP_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["delivered", "cancelled"],
  shipped: [], // no usado en retiro
  delivered: [],
  cancelled: [],
};

/** Transiciones permitidas desde `from` según el método de entrega. */
export function allowedTransitions(
  fulfillment: FulfillmentMethod,
  from: OrderStatus,
): OrderStatus[] {
  return (fulfillment === "pickup" ? PICKUP_TRANSITIONS : DELIVERY_TRANSITIONS)[from];
}

/** True si `from -> to` es una transición permitida para ese método. */
export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  fulfillment: FulfillmentMethod,
): boolean {
  return allowedTransitions(fulfillment, from).includes(to);
}
