/** Datos mínimos de una orden que necesita el aviso por SMS. */
export interface NewOrderInfo {
  orderNumber: string;
  totalMinor: number;
  currency: string;
  fulfillment: string;
}

/** Máximo de caracteres de un SMS estándar (single-segment). */
const SMS_MAX_LENGTH = 160;

/**
 * Arma el texto del aviso de orden nueva. Función pura: sin I/O ni env.
 * Trunca a 160 caracteres para caber en un único segmento de SMS.
 */
export function buildNewOrderMessage(order: NewOrderInfo, businessName: string): string {
  const amount = (order.totalMinor / 100).toFixed(2);
  const fulfillment = order.fulfillment === "pickup" ? "Retiro" : "Domicilio";
  const message = `${businessName}: nueva orden ${order.orderNumber} · ${amount} ${order.currency} · ${fulfillment}`;
  return message.slice(0, SMS_MAX_LENGTH);
}
