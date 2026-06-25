import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, test } from "vitest";
import { server } from "@/test/setup";
import { ProductCreatePage } from "./ProductCreatePage";

function renderCreate() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      { path: "/products/new", element: <ProductCreatePage /> },
      { path: "/products/:id", element: <div>editor</div> },
    ],
    { initialEntries: ["/products/new"] },
  );
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("ProductCreatePage", () => {
  test("crear navega al editor", async () => {
    server.use(
      http.post("/api/v1/admin/products", () =>
        HttpResponse.json({ product: { id: "new1" } }, { status: 201 }),
      ),
    );
    renderCreate();
    await userEvent.type(screen.getByLabelText("Nombre"), "Remera Azul");
    await userEvent.click(screen.getByRole("button", { name: "Crear producto" }));
    expect(await screen.findByText("editor")).toBeInTheDocument();
  });

  test("slug duplicado (409) muestra error inline", async () => {
    server.use(
      http.post("/api/v1/admin/products", () =>
        HttpResponse.json(
          { error: "Ese slug ya está en uso", code: "PRODUCT_SLUG_TAKEN" },
          { status: 409 },
        ),
      ),
    );
    renderCreate();
    await userEvent.type(screen.getByLabelText("Nombre"), "Remera Azul");
    await userEvent.click(screen.getByRole("button", { name: "Crear producto" }));
    expect(await screen.findByText(/slug ya está en uso/i)).toBeInTheDocument();
  });
});
