import { describe, expect, test } from "bun:test";
import { renderReceipt } from "./render";
import type { ReceiptOrder, ReceiptSettings } from "./Receipt";

const settings: ReceiptSettings = {
  businessName: "Avanzar SRL",
  phone: "+53 555 1234",
  address: "Calle 23 #456, La Habana",
  email: "hola@avanzar.test",
  receiptNote: "Gracias por su compra.",
};

/** Base común de una orden mock; se especializa por método de entrega. */
function baseOrder(): ReceiptOrder {
  return {
    orderNumber: "AVZ-20260703-0042",
    createdAt: new Date("2026-07-03T14:30:00Z"),
    currency: "USD",
    fulfillment: "pickup",
    buyerName: "Ana Comprador",
    buyerEmail: "ana@example.com",
    buyerPhone: "+1 305 555 0000",
    shipRecipient: "Luis Destinatario",
    shipPhone: "+53 555 9999",
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
        productName: "Café molido 500g",
        quantity: 2,
        unitAmountMinor: 1500,
        lineTotalMinor: 3000,
      },
      {
        productName: "Azúcar 1kg",
        quantity: 1,
        unitAmountMinor: 1500,
        lineTotalMinor: 1500,
      },
    ],
    payments: [{ method: "zelle", status: "confirmed" }],
  };
}

/** Verifica los bytes mágicos `%PDF` al inicio del buffer. */
function startsWithPdfMagic(bytes: Uint8Array): boolean {
  return new TextDecoder().decode(bytes.slice(0, 4)) === "%PDF";
}

describe("renderReceipt", () => {
  test("genera un PDF para una orden de retiro (pickup)", async () => {
    const order = baseOrder();
    const bytes = await renderReceipt(order, settings);

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
    expect(startsWithPdfMagic(bytes)).toBe(true);
  });

  test("genera un PDF para una orden de domicilio (delivery)", async () => {
    const order: ReceiptOrder = {
      ...baseOrder(),
      fulfillment: "delivery",
      shipProvince: "La Habana",
      shipMunicipality: "Plaza",
      shipAddressLine: "Av. Paseo #12 e/ 1ra y 3ra",
      shipReference: "Casa azul, timbre 2",
      shippingMinor: 800,
      discountMinor: 200,
      totalMinor: 5100,
    };
    const bytes = await renderReceipt(order, settings);

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
    expect(startsWithPdfMagic(bytes)).toBe(true);
  });
});
