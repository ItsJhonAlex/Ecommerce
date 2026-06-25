import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, test } from "vitest";
import { server } from "@/test/setup";
import { renderWithProviders } from "@/test/utils";
import { ProductsListPage } from "./ProductsListPage";

const product = {
  id: "p1",
  slug: "remera-azul",
  name: "Remera Azul",
  description: null,
  status: "active",
  stockQuantity: 7,
  createdAt: "2026-06-20T10:00:00.000Z",
  updatedAt: "2026-06-20T10:00:00.000Z",
  prices: [{ id: "pr1", productId: "p1", currency: "USD", amountMinor: 1999 }],
  images: [],
};

describe("ProductsListPage", () => {
  test("renderiza productos desde la API", async () => {
    server.use(
      http.get("/api/v1/admin/products", () =>
        HttpResponse.json({ products: [product] }),
      ),
    );
    renderWithProviders(<ProductsListPage />, { path: "/products" });
    expect(await screen.findByText("Remera Azul")).toBeInTheDocument();
    expect(screen.getByText("remera-azul")).toBeInTheDocument();
    const badge = document.querySelector('[data-status="active"]');
    expect(badge).toHaveTextContent("Activo");
  });

  test("el filtro por estado refiltra con el query param", async () => {
    const seen: string[] = [];
    server.use(
      http.get("/api/v1/admin/products", ({ request }) => {
        seen.push(new URL(request.url).searchParams.get("status") ?? "");
        return HttpResponse.json({ products: [] });
      }),
    );
    renderWithProviders(<ProductsListPage />, { path: "/products" });
    await screen.findByText(/no hay productos/i);
    await userEvent.selectOptions(screen.getByLabelText("Estado"), "active");
    await waitFor(() => expect(seen).toContain("active"));
  });
});
