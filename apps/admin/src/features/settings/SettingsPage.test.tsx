import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
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
