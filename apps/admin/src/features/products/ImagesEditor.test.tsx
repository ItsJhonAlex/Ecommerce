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

  test("bajar imagen dispara UNA sola PATCH a reorder con el orden correcto", async () => {
    const calls: unknown[] = [];
    server.use(
      http.patch(
        "/api/v1/admin/products/p1/images/reorder",
        async ({ request }) => {
          calls.push(await request.json());
          return HttpResponse.json({ images: [] });
        },
      ),
    );
    const images = [
      { id: "i1", productId: "p1", url: "https://x.com/a.jpg", alt: null, position: 0 },
      { id: "i2", productId: "p1", url: "https://x.com/b.jpg", alt: null, position: 1 },
      { id: "i3", productId: "p1", url: "https://x.com/c.jpg", alt: null, position: 2 },
    ];
    renderWithProviders(<ImagesEditor productId="p1" images={images} />);
    // Bajar la primera imagen: intercambio con la segunda.
    const bajar = screen.getAllByRole("button", { name: "Bajar imagen" });
    await userEvent.click(bajar[0] as HTMLElement);
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({ imageIds: ["i2", "i1", "i3"] });
  });

  test("subir imagen dispara UNA sola PATCH a reorder con el orden correcto", async () => {
    const calls: unknown[] = [];
    server.use(
      http.patch(
        "/api/v1/admin/products/p1/images/reorder",
        async ({ request }) => {
          calls.push(await request.json());
          return HttpResponse.json({ images: [] });
        },
      ),
    );
    const images = [
      { id: "i1", productId: "p1", url: "https://x.com/a.jpg", alt: null, position: 0 },
      { id: "i2", productId: "p1", url: "https://x.com/b.jpg", alt: null, position: 1 },
      { id: "i3", productId: "p1", url: "https://x.com/c.jpg", alt: null, position: 2 },
    ];
    renderWithProviders(<ImagesEditor productId="p1" images={images} />);
    // Subir la tercera imagen: intercambio con la segunda.
    const subir = screen.getAllByRole("button", { name: "Subir imagen" });
    await userEvent.click(subir[2] as HTMLElement);
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({ imageIds: ["i1", "i3", "i2"] });
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
