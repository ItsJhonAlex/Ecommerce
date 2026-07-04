import { describe, expect, test } from "bun:test";
import { buildNewOrderMessage } from "./message";

describe("buildNewOrderMessage", () => {
  test("retiro (pickup) muestra 'Retiro'", () => {
    const msg = buildNewOrderMessage(
      { orderNumber: "A-1", totalMinor: 5000, currency: "USD", fulfillment: "pickup" },
      "Avanzar",
    );
    expect(msg).toContain("Retiro");
    expect(msg).not.toContain("Domicilio");
  });

  test("domicilio (delivery) muestra 'Domicilio'", () => {
    const msg = buildNewOrderMessage(
      { orderNumber: "A-1", totalMinor: 5000, currency: "USD", fulfillment: "delivery" },
      "Avanzar",
    );
    expect(msg).toContain("Domicilio");
    expect(msg).not.toContain("Retiro");
  });

  test("formatea el monto a 2 decimales con la moneda", () => {
    const msg = buildNewOrderMessage(
      { orderNumber: "A-1", totalMinor: 5000, currency: "USD", fulfillment: "pickup" },
      "Avanzar",
    );
    expect(msg).toContain("50.00 USD");
  });

  test("incluye nombre del negocio y número de orden", () => {
    const msg = buildNewOrderMessage(
      { orderNumber: "ORD-42", totalMinor: 199, currency: "CUP", fulfillment: "delivery" },
      "Mi Tienda",
    );
    expect(msg).toContain("Mi Tienda");
    expect(msg).toContain("ORD-42");
    expect(msg).toContain("1.99 CUP");
  });

  test("trunca a 160 caracteres cuando el nombre del negocio es muy largo", () => {
    const longName = "N".repeat(300);
    const msg = buildNewOrderMessage(
      { orderNumber: "A-1", totalMinor: 5000, currency: "USD", fulfillment: "pickup" },
      longName,
    );
    expect(msg.length).toBeLessThanOrEqual(160);
  });
});
