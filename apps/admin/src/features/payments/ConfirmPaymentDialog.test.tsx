import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, test } from "vitest";
import { server } from "@/test/setup";
import { renderWithProviders } from "@/test/utils";
import { ConfirmPaymentDialog } from "./ConfirmPaymentDialog";
import type { PaymentListItem } from "./types";

const payment: PaymentListItem = {
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

describe("ConfirmPaymentDialog", () => {
  test("confirma con reference y cierra (éxito)", async () => {
    let received: unknown = null;
    server.use(
      http.patch("/api/v1/admin/payments/pay1/confirm", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ payment: { ...payment, status: "confirmed" } });
      }),
    );
    renderWithProviders(<ConfirmPaymentDialog payment={payment} />);
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await userEvent.type(screen.getByLabelText("Referencia"), "ZELLE-123");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar pago" }));
    expect(received).toEqual({ reference: "ZELLE-123" });
  });

  test("un 409 muestra error y no rompe", async () => {
    server.use(
      http.patch("/api/v1/admin/payments/pay1/confirm", () =>
        HttpResponse.json({ error: "El pago no está pendiente" }, { status: 409 }),
      ),
    );
    renderWithProviders(<ConfirmPaymentDialog payment={payment} />);
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await userEvent.type(screen.getByLabelText("Referencia"), "X");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar pago" }));
    expect(await screen.findByText(/no está pendiente/i)).toBeInTheDocument();
  });
});
