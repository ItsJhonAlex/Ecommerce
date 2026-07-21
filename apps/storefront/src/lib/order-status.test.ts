import { describe, expect, test } from "vitest";
import { orderStatusLabel } from "./order-status";

describe("orderStatusLabel", () => {
  test.each([
    ["pending_payment", "Pendiente de pago"],
    ["paid", "Pagado"],
    ["preparing", "Preparando"],
    ["shipped", "Enviado"],
    ["ready_for_pickup", "Listo para retirar"],
    ["delivered", "Entregado"],
    ["cancelled", "Cancelado"],
  ])("%s → %s", (status, label) => {
    expect(orderStatusLabel(status)).toBe(label);
  });

  test("valor desconocido devuelve el string original sin explotar", () => {
    expect(orderStatusLabel("algo_nuevo")).toBe("algo_nuevo");
  });
});
