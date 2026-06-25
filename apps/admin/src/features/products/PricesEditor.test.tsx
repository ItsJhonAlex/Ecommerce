import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, test } from "vitest";
import { server } from "@/test/setup";
import { renderWithProviders } from "@/test/utils";
import { PricesEditor } from "./PricesEditor";

describe("PricesEditor", () => {
  test("agregar precio POSTea currency + amountMinor", async () => {
    let received: unknown = null;
    server.use(
      http.post("/api/v1/admin/products/p1/prices", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ price: {} }, { status: 201 });
      }),
    );
    renderWithProviders(<PricesEditor productId="p1" prices={[]} />);
    await userEvent.clear(screen.getByLabelText("Moneda"));
    await userEvent.type(screen.getByLabelText("Moneda"), "USD");
    await userEvent.type(screen.getByLabelText("Importe"), "19.99");
    await userEvent.click(screen.getByRole("button", { name: "Agregar precio" }));
    await waitFor(() =>
      expect(received).toEqual({ currency: "USD", amountMinor: 1999 }),
    );
  });

  test("moneda duplicada (409) muestra error inline", async () => {
    server.use(
      http.post("/api/v1/admin/products/p1/prices", () =>
        HttpResponse.json(
          { error: "Ya existe un precio para esa moneda", code: "PRICE_CURRENCY_EXISTS" },
          { status: 409 },
        ),
      ),
    );
    renderWithProviders(<PricesEditor productId="p1" prices={[]} />);
    await userEvent.type(screen.getByLabelText("Moneda"), "USD");
    await userEvent.type(screen.getByLabelText("Importe"), "10");
    await userEvent.click(screen.getByRole("button", { name: "Agregar precio" }));
    expect(await screen.findByText(/ya existe un precio/i)).toBeInTheDocument();
  });
});
