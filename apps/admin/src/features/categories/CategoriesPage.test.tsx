import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, test } from "vitest";
import { server } from "@/test/setup";
import { renderWithProviders } from "@/test/utils";
import { CategoriesPage } from "./CategoriesPage";

const categories = [
  { id: "a", slug: "ropa", name: "Ropa", parentId: null },
  { id: "b", slug: "remeras", name: "Remeras", parentId: "a" },
];

describe("CategoriesPage", () => {
  test("renderiza el árbol (padre e hija)", async () => {
    server.use(
      http.get("/api/v1/admin/categories", () =>
        HttpResponse.json({ categories }),
      ),
    );
    renderWithProviders(<CategoriesPage />, { path: "/categories" });
    expect(await screen.findByText("Ropa")).toBeInTheDocument();
    expect(screen.getByText("Remeras")).toBeInTheDocument();
  });

  test("'Nueva categoría' abre el diálogo de creación", async () => {
    server.use(
      http.get("/api/v1/admin/categories", () =>
        HttpResponse.json({ categories: [] }),
      ),
    );
    renderWithProviders(<CategoriesPage />, { path: "/categories" });
    await screen.findByText(/no hay categorías/i);
    await userEvent.click(screen.getByRole("button", { name: "Nueva categoría" }));
    // El diálogo abierto expone su campo Nombre:
    expect(await screen.findByLabelText("Nombre")).toBeInTheDocument();
  });
});
