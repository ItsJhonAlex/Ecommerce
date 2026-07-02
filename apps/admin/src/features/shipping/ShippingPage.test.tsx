import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, test } from "vitest";
import { server } from "@/test/setup";
import { renderWithProviders } from "@/test/utils";
import { ShippingPage } from "./ShippingPage";

const rate = {
  id: "r1",
  province: "La Habana",
  currency: "USD",
  amountMinor: 500,
  active: true,
};

describe("ShippingPage", () => {
  test("renderiza tarifas", async () => {
    server.use(
      http.get("/api/v1/admin/shipping-rates", () =>
        HttpResponse.json({ shippingRates: [rate] }),
      ),
    );
    renderWithProviders(<ShippingPage />, { path: "/shipping" });
    expect(await screen.findByText("La Habana")).toBeInTheDocument();
  });

  test("toggle de activa PATCHea { active:false }", async () => {
    let received: unknown = null;
    server.use(
      http.get("/api/v1/admin/shipping-rates", () =>
        HttpResponse.json({ shippingRates: [rate] }),
      ),
      http.patch("/api/v1/admin/shipping-rates/r1", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ shippingRate: { ...rate, active: false } });
      }),
    );
    renderWithProviders(<ShippingPage />, { path: "/shipping" });
    const toggle = await screen.findByLabelText("Activa La Habana USD");
    await userEvent.click(toggle);
    await waitFor(() => expect(received).toEqual({ active: false }));
  });
});
