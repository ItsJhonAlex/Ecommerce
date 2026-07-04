import type { ReceiptOrder } from "./Receipt";

/**
 * Pedido de ejemplo para la vista previa del recibo en el admin.
 * Datos ficticios pero realistas (retiro) para mostrar cómo queda el PDF
 * con los valores del negocio que el usuario está editando.
 */
export function sampleReceiptOrder(): ReceiptOrder {
  return {
    orderNumber: "A-EJEMPLO",
    createdAt: new Date(),
    currency: "USD",
    fulfillment: "pickup",

    buyerName: "María Pérez",
    buyerEmail: "maria@ejemplo.cu",
    buyerPhone: "+5355512345",

    shipRecipient: "María Pérez",
    shipPhone: "+5355512345",
    shipProvince: null,
    shipMunicipality: null,
    shipAddressLine: null,
    shipReference: null,

    subtotalMinor: 4500,
    shippingMinor: 0,
    discountMinor: 0,
    totalMinor: 4500,

    items: [
      {
        productName: "Aceite de girasol 1L",
        quantity: 2,
        unitAmountMinor: 1500,
        lineTotalMinor: 3000,
      },
      {
        productName: "Arroz 5 kg",
        quantity: 1,
        unitAmountMinor: 1500,
        lineTotalMinor: 1500,
      },
    ],
    payments: [{ method: "zelle", status: "pending" }],
  };
}
