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
});
