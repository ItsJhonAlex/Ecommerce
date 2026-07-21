/**
 * Etiquetas en español de `OrderStatus` (ver `packages/db/src/schema/enums.ts`
 * y `packages/shared/src/order-status.ts` para el enum fuente — el storefront
 * no importa `@avanzar/db`, así que el mapa se declara local).
 */
const LABELS: Record<string, string> = {
  pending_payment: "Pendiente de pago",
  paid: "Pagado",
  preparing: "Preparando",
  shipped: "Enviado",
  ready_for_pickup: "Listo para retirar",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

/** Traduce un status del backend a texto en español. Fallback: el valor tal cual. */
export function orderStatusLabel(status: string): string {
  return LABELS[status] ?? status;
}
