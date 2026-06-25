import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, test } from "vitest";
import { server } from "@/test/setup";
import { renderWithProviders } from "@/test/utils";
import { ImagesEditor } from "./ImagesEditor";

describe("ImagesEditor", () => {
  test("agregar imagen POSTea url + alt", async () => {
    let received: unknown = null;
    server.use(
      http.post("/api/v1/admin/products/p1/images", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ image: {} }, { status: 201 });
      }),
    );
    renderWithProviders(<ImagesEditor productId="p1" images={[]} />);
    await userEvent.type(screen.getByLabelText("URL"), "https://x.com/a.jpg");
    await userEvent.type(screen.getByLabelText("Alt"), "Foto");
    await userEvent.click(screen.getByRole("button", { name: "Agregar imagen" }));
    await waitFor(() =>
      expect(received).toMatchObject({ url: "https://x.com/a.jpg", alt: "Foto" }),
    );
  });

  test("borrar imagen DELETEa", async () => {
    let deleted = false;
    server.use(
      http.delete("/api/v1/admin/products/p1/images/i1", () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const images = [
      { id: "i1", productId: "p1", url: "https://x.com/a.jpg", alt: null, position: 0 },
    ];
    renderWithProviders(<ImagesEditor productId="p1" images={images} />);
    await userEvent.click(screen.getByRole("button", { name: /borrar imagen/i }));
    await waitFor(() => expect(deleted).toBe(true));
  });
});
