import { screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { renderWithProviders } from "@/test/utils";
import { StatusChange } from "./StatusChange";
import type { Order } from "./types";

/** Order mínimo para el control de cambio de estado (solo lee id/status/fulfillment). */
function order(status: string, fulfillment: "pickup" | "delivery"): Order {
  return { id: "o1", status, fulfillment } as unknown as Order;
}

describe("StatusChange", () => {
  test("retiro en 'preparing' ofrece 'Listo para retirar', no 'Enviado'", () => {
    renderWithProviders(<StatusChange order={order("preparing", "pickup")} />);
    expect(
      screen.getByRole("button", { name: "Listo para retirar" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Enviado" }),
    ).not.toBeInTheDocument();
  });

  test("domicilio en 'preparing' ofrece 'Enviado'", () => {
    renderWithProviders(<StatusChange order={order("preparing", "delivery")} />);
    expect(
      screen.getByRole("button", { name: "Enviado" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Listo para retirar" }),
    ).not.toBeInTheDocument();
  });
});
