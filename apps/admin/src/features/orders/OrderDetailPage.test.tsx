import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, test } from "vitest";
import { server } from "@/test/setup";
import { renderWithProviders } from "@/test/utils";
import { Toaster } from "@/components/ui/sonner";
import { OrderDetailPage } from "./OrderDetailPage";

function makeOrder(status: string) {
  return {
    id: "o1",
    orderNumber: "AVZ-1",
    status,
    fulfillment: "delivery",
    currency: "USD",
    buyerName: "Ana",
    buyerEmail: "ana@x.com",
    buyerPhone: "1",
    shipRecipient: "Beto",
    shipPhone: "2",
    shipProvince: "La Habana",
    shipMunicipality: "Centro",
    shipAddressLine: "Calle 1",
    shipReference: null,
    subtotalMinor: 1000,
    shippingMinor: 0,
    discountMinor: 0,
    totalMinor: 1000,
    createdAt: "2026-06-20T10:00:00.000Z",
    updatedAt: "2026-06-20T10:00:00.000Z",
    items: [
      { id: "i1", productId: "p1", productName: "Remera", unitAmountMinor: 1000, quantity: 1, lineTotalMinor: 1000 },
    ],
    payments: [],
    statusHistory: [
      { id: "h1", status, changedBy: null, createdAt: "2026-06-20T10:00:00.000Z" },
    ],
  };
}

function renderDetail() {
  return renderWithProviders(
    <>
      <Toaster richColors />
      <OrderDetailPage />
    </>,
    {
      path: "/orders/:id",
      initialEntries: ["/orders/o1"],
    },
  );
}

describe("OrderDetailPage", () => {
  test("muestra solo las transiciones permitidas (paid → Preparando/Cancelado)", async () => {
    server.use(
      http.get("/api/v1/admin/orders/o1", () =>
        HttpResponse.json({ order: makeOrder("paid") }),
      ),
    );
    renderDetail();
    expect(await screen.findByRole("button", { name: "Preparando" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelado" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Entregado" })).not.toBeInTheDocument();
  });

  test("cambio de estado exitoso refleja el nuevo estado", async () => {
    let current = "paid";
    server.use(
      http.get("/api/v1/admin/orders/o1", () =>
        HttpResponse.json({ order: makeOrder(current) }),
      ),
      http.patch("/api/v1/admin/orders/o1/status", async () => {
        current = "preparing";
        return HttpResponse.json({ order: makeOrder("preparing") });
      }),
    );
    renderDetail();
    await userEvent.click(await screen.findByRole("button", { name: "Preparando" }));
    expect(await screen.findByRole("button", { name: "Enviado" })).toBeInTheDocument();
  });

  test("un 409 muestra un toast de error", async () => {
    server.use(
      http.get("/api/v1/admin/orders/o1", () =>
        HttpResponse.json({ order: makeOrder("paid") }),
      ),
      http.patch("/api/v1/admin/orders/o1/status", () =>
        HttpResponse.json({ error: "El pedido cambió de estado, reintentá" }, { status: 409 }),
      ),
    );
    renderDetail();
    await userEvent.click(await screen.findByRole("button", { name: "Preparando" }));
    expect(await screen.findByText(/cambió de estado/i)).toBeInTheDocument();
  });

  test("pickup: muestra Retiro, contacto y oculta dirección", async () => {
    server.use(
      http.get("/api/v1/admin/orders/o1", () =>
        HttpResponse.json({
          order: {
            ...makeOrder("paid"),
            fulfillment: "pickup",
            shipProvince: null,
            shipMunicipality: null,
            shipAddressLine: null,
          },
        }),
      ),
    );
    renderDetail();
    expect(await screen.findByText("Retiro")).toBeInTheDocument();
    expect(screen.queryByText(/Calle 1/)).not.toBeInTheDocument();
  });

  test("delivery: muestra Domicilio y la dirección", async () => {
    server.use(
      http.get("/api/v1/admin/orders/o1", () =>
        HttpResponse.json({ order: { ...makeOrder("paid"), fulfillment: "delivery" } }),
      ),
    );
    renderDetail();
    expect(await screen.findByText("Domicilio")).toBeInTheDocument();
    expect(screen.getByText(/Calle 1/)).toBeInTheDocument();
  });
});
