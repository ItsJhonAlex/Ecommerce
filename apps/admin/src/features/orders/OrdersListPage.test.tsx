import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, test } from "vitest";
import { server } from "@/test/setup";
import { renderWithProviders } from "@/test/utils";
import { OrdersListPage } from "./OrdersListPage";

const order = {
  id: "o1",
  orderNumber: "AVZ-1",
  status: "paid",
  fulfillment: "delivery",
  currency: "USD",
  buyerName: "Ana",
  totalMinor: 123456,
  createdAt: "2026-06-20T10:00:00.000Z",
  items: [],
  payments: [],
};

describe("OrdersListPage", () => {
  test("renderiza pedidos desde la API", async () => {
    server.use(
      http.get("/api/v1/admin/orders", () =>
        HttpResponse.json({ orders: [order] }),
      ),
    );
    renderWithProviders(<OrdersListPage />, { path: "/orders" });
    expect(await screen.findByText("AVZ-1")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
    // El badge de estado del pedido (data-status), no la opción del filtro que
    // también dice "Pagado". El dropdown muestra etiquetas en español.
    const badge = document.querySelector('[data-status="paid"]');
    expect(badge).toHaveTextContent("Pagado");
    expect(screen.getByText("Domicilio")).toBeInTheDocument();
  });

  test("el filtro por estado vuelve a pedir con el query param", async () => {
    const seen: string[] = [];
    server.use(
      http.get("/api/v1/admin/orders", ({ request }) => {
        seen.push(new URL(request.url).searchParams.get("status") ?? "");
        return HttpResponse.json({ orders: [] });
      }),
    );
    renderWithProviders(<OrdersListPage />, { path: "/orders" });
    await screen.findByText(/no hay pedidos/i);
    await userEvent.selectOptions(screen.getByLabelText("Estado"), "paid");
    await waitFor(() => expect(seen).toContain("paid"));
  });
});
