import { describe, expect, test } from "vitest";
import {
  formatDate,
  money,
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
  productStatusLabel,
  userRoleLabel,
} from "./format";

describe("formatDate", () => {
  test("formatea una fecha ISO a string no vacío con el año", () => {
    const s = formatDate("2026-06-20T10:00:00.000Z");
    expect(s.length).toBeGreaterThan(0);
    expect(s).toContain("26"); // el año aparece en el formato corto
  });
});

describe("money", () => {
  // Robusto al locale: "es" puede dar coma decimal y/o separador de miles
  // (1.234,56 · 1,234.56 · 1234.56). Lo que importa es que muestre el valor.
  test("convierte centavos a importe con moneda", () => {
    expect(money(123456, "USD")).toMatch(/1[.,]?234[.,]56/);
  });
  test("cero centavos", () => {
    expect(money(0, "USD")).toMatch(/0[.,]00/);
  });
});

describe("labels", () => {
  test("estado de pedido en español", () => {
    expect(orderStatusLabel("pending_payment")).toBe("Pendiente de pago");
    expect(orderStatusLabel("cancelled")).toBe("Cancelado");
  });
  test("estado de pago en español", () => {
    expect(paymentStatusLabel("pending")).toBe("Pendiente");
    expect(paymentStatusLabel("confirmed")).toBe("Confirmado");
  });
  test("método de pago en español", () => {
    expect(paymentMethodLabel("zelle")).toBe("Zelle");
    expect(paymentMethodLabel("transfer_local")).toBe("Transferencia local");
  });
  test("label desconocido devuelve el valor crudo", () => {
    expect(orderStatusLabel("otro")).toBe("otro");
  });
});

describe("productStatusLabel", () => {
  test("estados de producto en español", () => {
    expect(productStatusLabel("draft")).toBe("Borrador");
    expect(productStatusLabel("active")).toBe("Activo");
    expect(productStatusLabel("archived")).toBe("Archivado");
  });
});

describe("userRoleLabel", () => {
  test("roles en español", () => {
    expect(userRoleLabel("customer")).toBe("Cliente");
    expect(userRoleLabel("staff")).toBe("Staff");
    expect(userRoleLabel("admin")).toBe("Admin");
  });
});
