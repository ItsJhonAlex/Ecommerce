import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, test } from "vitest";
import { server } from "@/test/setup";
import { renderWithProviders } from "@/test/utils";
import { SettingsPage } from "./SettingsPage";

const settings = {
  id: "default",
  businessName: "Avanzar",
  phone: null,
  address: null,
  email: null,
  receiptNote: null,
  notifyPhones: ["+5351234567"],
  notifySmsEnabled: false,
  updatedAt: null,
};

describe("SettingsPage", () => {
  test("carga los ajustes en el form", async () => {
    server.use(
      http.get("/api/v1/admin/settings", () =>
        HttpResponse.json({ settings }),
      ),
    );
    renderWithProviders(<SettingsPage />, { path: "/settings" });
    const name = await screen.findByLabelText("Nombre del negocio");
    expect(name).toHaveValue("Avanzar");
  });

  test("editar y guardar dispara el PATCH con el body", async () => {
    let received: unknown = null;
    server.use(
      http.get("/api/v1/admin/settings", () =>
        HttpResponse.json({ settings }),
      ),
      http.patch("/api/v1/admin/settings", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({
          settings: { ...settings, businessName: "Avanzar SRL", phone: "555" },
        });
      }),
    );
    renderWithProviders(<SettingsPage />, { path: "/settings" });

    const name = await screen.findByLabelText("Nombre del negocio");
    await userEvent.clear(name);
    await userEvent.type(name, "Avanzar SRL");

    const phone = screen.getByLabelText("Teléfono");
    await userEvent.type(phone, "555");

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(received).toMatchObject({ businessName: "Avanzar SRL", phone: "555" }),
    );
  });

  test("renderiza los números de notificación existentes", async () => {
    server.use(
      http.get("/api/v1/admin/settings", () =>
        HttpResponse.json({ settings }),
      ),
    );
    renderWithProviders(<SettingsPage />, { path: "/settings" });
    expect(await screen.findByText("+5351234567")).toBeInTheDocument();
  });

  test("agregar número + activar SMS incluye ambos en el PATCH", async () => {
    let received: { notifyPhones?: string[]; notifySmsEnabled?: boolean } | null =
      null;
    server.use(
      http.get("/api/v1/admin/settings", () =>
        HttpResponse.json({ settings }),
      ),
      http.patch("/api/v1/admin/settings", async ({ request }) => {
        received = (await request.json()) as typeof received;
        return HttpResponse.json({ settings });
      }),
    );
    renderWithProviders(<SettingsPage />, { path: "/settings" });

    // Esperar a que carguen los ajustes (número existente visible).
    await screen.findByText("+5351234567");

    const phoneInput = screen.getByLabelText("Agregar número");
    await userEvent.type(phoneInput, "+5359876543");
    await userEvent.click(screen.getByRole("button", { name: "Agregar" }));

    const checkbox = screen.getByLabelText(
      "Avisar por SMS cuando entra un pedido",
    );
    await userEvent.click(checkbox);

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(received).toMatchObject({
        notifyPhones: ["+5351234567", "+5359876543"],
        notifySmsEnabled: true,
      }),
    );
  });

  test("una edición sin guardar sobrevive a un refetch de settings", async () => {
    // Enfoque: montar providers inline para tener acceso al QueryClient y
    // disparar un refetch real (invalidateQueries), que es lo que ocurriría con
    // refetchOnWindowFocus. El segundo GET devuelve un businessName distinto: si
    // el viejo effect re-sembrara en cada `data`, pisaría la edición del usuario.
    let getCount = 0;
    server.use(
      http.get("/api/v1/admin/settings", () => {
        getCount += 1;
        return HttpResponse.json({
          settings:
            getCount === 1
              ? settings
              : { ...settings, businessName: "Valor del server" },
        });
      }),
    );

    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const router = createMemoryRouter(
      [{ path: "/settings", element: <SettingsPage /> }],
      { initialEntries: ["/settings"] },
    );
    render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    const name = await screen.findByLabelText("Nombre del negocio");
    expect(name).toHaveValue("Avanzar");

    await userEvent.clear(name);
    await userEvent.type(name, "Editado sin guardar");
    expect(name).toHaveValue("Editado sin guardar");

    // Forzar el refetch que dispararía el re-seed viejo.
    await client.invalidateQueries({ queryKey: ["settings"] });
    await waitFor(() => expect(getCount).toBeGreaterThanOrEqual(2));

    // La edición del usuario se conserva: el refetch no la pisó.
    expect(name).toHaveValue("Editado sin guardar");
  });

  test("no agrega un número con formato inválido", async () => {
    server.use(
      http.get("/api/v1/admin/settings", () =>
        HttpResponse.json({ settings }),
      ),
    );
    renderWithProviders(<SettingsPage />, { path: "/settings" });

    await screen.findByText("+5351234567");

    const phoneInput = screen.getByLabelText("Agregar número");
    await userEvent.type(phoneInput, "123");
    await userEvent.click(screen.getByRole("button", { name: "Agregar" }));

    // El número inválido no se muestra y aparece el error inline.
    expect(screen.queryByText("123")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
