import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, test } from "vitest";
import { server } from "@/test/setup";
import { renderWithProviders } from "@/test/utils";
import { CategoryDialog } from "./CategoryDialog";
import type { Category } from "./types";

const cats: Category[] = [
  { id: "a", slug: "alpha", name: "Alpha", parentId: null },
  { id: "b", slug: "beta", name: "Beta", parentId: "a" },
];

describe("CategoryDialog", () => {
  test("crear POSTea nombre + slug + parentId", async () => {
    let received: unknown = null;
    server.use(
      http.post("/api/v1/admin/categories", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ category: {} }, { status: 201 });
      }),
    );
    renderWithProviders(
      <CategoryDialog
        open
        onOpenChange={() => {}}
        categories={cats}
        defaultParentId="a"
      />,
    );
    await userEvent.type(screen.getByLabelText("Nombre"), "Nueva");
    await userEvent.click(screen.getByRole("button", { name: "Crear" }));
    await waitFor(() =>
      expect(received).toMatchObject({ name: "Nueva", slug: "nueva", parentId: "a" }),
    );
  });

  test("al editar, el selector de padre NO ofrece la propia categoría ni descendientes", () => {
    renderWithProviders(
      <CategoryDialog
        open
        onOpenChange={() => {}}
        categories={cats}
        category={cats[0]}
      />,
    );
    const select = screen.getByLabelText("Categoría padre") as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).not.toContain("a"); // la propia
    expect(values).not.toContain("b"); // descendiente
    expect(values).toContain(""); // "Sin padre"
  });

  test("slug duplicado (409) muestra error inline", async () => {
    server.use(
      http.post("/api/v1/admin/categories", () =>
        HttpResponse.json(
          { error: "Ese slug ya está en uso", code: "CATEGORY_SLUG_TAKEN" },
          { status: 409 },
        ),
      ),
    );
    renderWithProviders(
      <CategoryDialog open onOpenChange={() => {}} categories={cats} />,
    );
    await userEvent.type(screen.getByLabelText("Nombre"), "Alpha");
    await userEvent.click(screen.getByRole("button", { name: "Crear" }));
    expect(await screen.findByText(/slug ya está en uso/i)).toBeInTheDocument();
  });
});
