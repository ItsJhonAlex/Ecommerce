import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, test } from "vitest";
import { server } from "@/test/setup";
import { renderWithProviders } from "@/test/utils";
import { StockCell } from "./StockCell";

describe("StockCell", () => {
  test("editar y confirmar con Enter PATCHea el stock", async () => {
    let received: unknown = null;
    server.use(
      http.patch("/api/v1/admin/products/p1", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ product: { id: "p1", stockQuantity: 42 } });
      }),
    );
    renderWithProviders(<StockCell id="p1" value={10} />);
    const input = screen.getByLabelText("Stock");
    await userEvent.clear(input);
    await userEvent.type(input, "42{Enter}");
    await waitFor(() => expect(received).toEqual({ stockQuantity: 42 }));
  });

  test("sin cambios no dispara PATCH", async () => {
    let calls = 0;
    server.use(
      http.patch("/api/v1/admin/products/p1", () => {
        calls++;
        return HttpResponse.json({ product: { id: "p1", stockQuantity: 10 } });
      }),
    );
    renderWithProviders(<StockCell id="p1" value={10} />);
    const input = screen.getByLabelText("Stock");
    await userEvent.click(input);
    await userEvent.tab();
    expect(calls).toBe(0);
  });

  test("entrada inválida (negativa) revierte sin PATCH", async () => {
    let calls = 0;
    server.use(
      http.patch("/api/v1/admin/products/p1", () => {
        calls++;
        return HttpResponse.json({ product: { id: "p1", stockQuantity: 10 } });
      }),
    );
    renderWithProviders(<StockCell id="p1" value={10} />);
    const input = screen.getByLabelText("Stock");
    await userEvent.clear(input);
    await userEvent.type(input, "-5{Enter}");
    expect(calls).toBe(0);
    expect(input).toHaveValue(10);
  });
});
