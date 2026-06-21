import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, test } from "vitest";
import { server } from "@/test/setup";
import { renderWithProviders } from "@/test/utils";
import { PaymentsListPage } from "./PaymentsListPage";

const payment = {
  id: "pay1",
  orderId: "o1",
  method: "zelle",
  status: "pending",
  amountMinor: 5000,
  currency: "USD",
  reference: null,
  confirmedAt: null,
  createdAt: "2026-06-20T10:00:00.000Z",
};

describe("PaymentsListPage", () => {
  test("renderiza pagos desde la API", async () => {
    server.use(
      http.get("/api/v1/admin/payments", () =>
        HttpResponse.json({ payments: [payment] }),
      ),
    );
    renderWithProviders(<PaymentsListPage />, { path: "/payments" });
    expect(await screen.findByText("Zelle")).toBeInTheDocument();
    // El badge de estado (data-status), NO la opción "Pendiente" del filtro.
    const badge = document.querySelector('[data-status="pending"]');
    expect(badge).toHaveTextContent("Pendiente");
  });

  test("muestra empty state sin pagos", async () => {
    server.use(
      http.get("/api/v1/admin/payments", () => HttpResponse.json({ payments: [] })),
    );
    renderWithProviders(<PaymentsListPage />, { path: "/payments" });
    expect(await screen.findByText(/no hay pagos/i)).toBeInTheDocument();
  });
});
