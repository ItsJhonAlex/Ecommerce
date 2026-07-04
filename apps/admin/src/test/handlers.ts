import { http, HttpResponse, type HttpHandler } from "msw";

/** Handlers por defecto. Cada test agrega/override con server.use(...). */
export const handlers: HttpHandler[] = [
  // Vista previa del recibo: la genera <ReceiptPreview> al montar SettingsPage.
  // Devolvemos un PDF mínimo para que los tests de settings no vean requests
  // sin manejar (setup usa onUnhandledRequest: "error").
  http.post("/api/v1/admin/settings/receipt-preview", () =>
    HttpResponse.arrayBuffer(new TextEncoder().encode("%PDF-1.4\n").buffer, {
      headers: { "Content-Type": "application/pdf" },
    }),
  ),
];
