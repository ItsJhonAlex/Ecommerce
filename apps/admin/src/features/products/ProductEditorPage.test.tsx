import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, test } from "vitest";
import { server } from "@/test/setup";
import { renderWithProviders } from "@/test/utils";
import { ProductEditorPage } from "./ProductEditorPage";

const product = {
  id: "p1",
  slug: "remera-azul",
  name: "Remera Azul",
  description: "Algodón",
  status: "draft",
  stockQuantity: 5,
  createdAt: "2026-06-20T10:00:00.000Z",
  updatedAt: "2026-06-20T10:00:00.000Z",
  prices: [],
  images: [],
  categories: [],
};

function renderEditor() {
  server.use(
    http.get("/api/v1/admin/categories", () =>
      HttpResponse.json({ categories: [] }),
    ),
  );
  return renderWithProviders(<ProductEditorPage />, {
    path: "/products/:id",
    initialEntries: ["/products/p1"],
  });
}

describe("ProductEditorPage", () => {
  test("muestra el producto y sus secciones", async () => {
    server.use(
      http.get("/api/v1/admin/products/p1", () =>
        HttpResponse.json({ product }),
      ),
    );
    renderEditor();
    expect(await screen.findByDisplayValue("Remera Azul")).toBeInTheDocument();
    expect(screen.getByText("Precios")).toBeInTheDocument();
    expect(screen.getByText("Imágenes")).toBeInTheDocument();
    expect(screen.getByText("Categorías")).toBeInTheDocument();
  });

  test("guardar el núcleo PATCHea", async () => {
    let received: unknown = null;
    server.use(
      http.get("/api/v1/admin/products/p1", () =>
        HttpResponse.json({ product }),
      ),
      http.patch("/api/v1/admin/products/p1", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ product });
      }),
    );
    renderEditor();
    const name = await screen.findByDisplayValue("Remera Azul");
    await userEvent.clear(name);
    await userEvent.type(name, "Remera Roja");
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() =>
      expect((received as { name: string }).name).toBe("Remera Roja"),
    );
  });
});
