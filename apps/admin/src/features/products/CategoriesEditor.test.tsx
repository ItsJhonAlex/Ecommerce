import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, test } from "vitest";
import { server } from "@/test/setup";
import { renderWithProviders } from "@/test/utils";
import { CategoriesEditor } from "./CategoriesEditor";

const categories = [
  { id: "c1", slug: "ropa", name: "Ropa", parentId: null },
  { id: "c2", slug: "hogar", name: "Hogar", parentId: null },
];

describe("CategoriesEditor", () => {
  test("vincular una categoría POSTea su id", async () => {
    let received: unknown = null;
    server.use(
      http.get("/api/v1/admin/categories", () =>
        HttpResponse.json({ categories }),
      ),
      http.post("/api/v1/admin/products/p1/categories", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ linked: true }, { status: 201 });
      }),
    );
    renderWithProviders(<CategoriesEditor productId="p1" linked={[]} />);
    await userEvent.selectOptions(
      await screen.findByLabelText("Agregar categoría"),
      "c1",
    );
    await userEvent.click(screen.getByRole("button", { name: "Vincular" }));
    await waitFor(() => expect(received).toEqual({ categoryId: "c1" }));
  });

  test("desvincular DELETEa la categoría", async () => {
    let deleted = false;
    server.use(
      http.get("/api/v1/admin/categories", () =>
        HttpResponse.json({ categories }),
      ),
      http.delete("/api/v1/admin/products/p1/categories/c1", () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    renderWithProviders(
      <CategoriesEditor productId="p1" linked={[{ category: categories[0]! }]} />,
    );
    await userEvent.click(
      await screen.findByRole("button", { name: /quitar ropa/i }),
    );
    await waitFor(() => expect(deleted).toBe(true));
  });
});
