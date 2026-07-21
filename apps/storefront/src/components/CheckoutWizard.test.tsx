import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import CheckoutWizard from "./CheckoutWizard.tsx";
import { $cart, $cartOpen, type CartLine } from "../stores/cart";
import { authClient } from "../lib/auth";
import {
  clearPendingClaimToken,
  getPendingClaimToken,
} from "../lib/claim";

vi.mock("../lib/auth", () => ({
  authClient: { getSession: vi.fn() },
}));

/**
 * Suite del wizard de checkout. Los tests siembran el store con al menos una
 * línea válida en la moneda activa y mockean `fetch` global — el submit va a
 * `apiUrl("/api/v1/checkout")` con `credentials:"include"`.
 */

const RATES = [
  { province: "Habana", amountMinor: 1000, currency: "USD" },
  { province: "Santiago", amountMinor: 2000, currency: "USD" },
];

function seedCart(overrides: Partial<CartLine> = {}) {
  const line: CartLine = {
    productId: "p1",
    slug: "anillo",
    name: "Anillo",
    image: null,
    priceByCurrency: { USD: 5000 },
    quantity: 1,
    ...overrides,
  };
  $cart.set([line]);
}

function fillContact({
  name = "Ana Pérez",
  email = "ana@example.com",
  phone = "+53 5555 5555",
}: { name?: string; email?: string; phone?: string } = {}) {
  fireEvent.change(screen.getByLabelText(/^Nombre completo/), {
    target: { value: name },
  });
  fireEvent.change(screen.getByLabelText(/^Email/), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText(/^Teléfono/), {
    target: { value: phone },
  });
}

/** Renderiza + avanza hasta el step 3 con delivery + Habana como flujo estándar. */
function renderAndAdvanceToReview() {
  render(
    <CheckoutWizard
      shippingRates={RATES}
      storeName="Avanzar"
      storeAddress="Calle 1 y 2, Habana"
    />,
  );
  fillContact();
  fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

  // Step 1: elegir Envío a domicilio
  fireEvent.click(screen.getByLabelText(/Envío a domicilio/));
  fireEvent.change(screen.getByLabelText(/^Quien recibe/), {
    target: { value: "Ana Pérez" },
  });
  fireEvent.change(screen.getAllByLabelText(/^Teléfono/)[0]!, {
    target: { value: "+53 5555 5555" },
  });
  fireEvent.change(screen.getByLabelText(/^Provincia/), {
    target: { value: "Habana" },
  });
  fireEvent.change(screen.getByLabelText(/^Municipio/), {
    target: { value: "Centro Habana" },
  });
  fireEvent.change(screen.getByLabelText(/^Dirección/), {
    target: { value: "Calle X 123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

  // Step 2: pago (USD → Zelle informativa, no requiere elegir).
  fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
}

describe("CheckoutWizard", () => {
  beforeEach(() => {
    $cart.set([]);
    $cartOpen.set(false);
    document.cookie = "currency=USD; path=/";
    vi.unstubAllGlobals();
    clearPendingClaimToken();
    // Default seguro: todos los tests que llegan al 201 ejecutan getSession().
    // Sin sesión por defecto → los tests previos no rompen al destructurar `data`.
    (authClient.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
    });
  });

  test("Contacto: email inválido bloquea el Siguiente y muestra el error", () => {
    seedCart();
    render(
      <CheckoutWizard
        shippingRates={RATES}
        storeName="Avanzar"
        storeAddress={null}
      />,
    );

    fillContact({ email: "no-es-email" });
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    // Sigue en step 0: el título "Datos de contacto" debe seguir visible.
    expect(screen.getByText("Datos de contacto")).toBeInTheDocument();
    expect(screen.getByText("Email inválido")).toBeInTheDocument();
  });

  test("Entrega delivery + provincia muestra el costo de envío", () => {
    seedCart();
    render(
      <CheckoutWizard
        shippingRates={RATES}
        storeName="Avanzar"
        storeAddress={null}
      />,
    );

    fillContact();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    // Aparece la sección de entrega.
    expect(screen.getByText("¿Cómo lo querés recibir?")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Envío a domicilio/));
    fireEvent.change(screen.getByLabelText(/^Provincia/), {
      target: { value: "Habana" },
    });

    // El costo de la provincia elegida (1000 → 10,00 US$) debe aparecer.
    const costRegion = screen.getByText(/Costo de envío/).parentElement!;
    expect(costRegion.textContent).toMatch(/10,00|10\.00/);
  });

  test("Pago en USD muestra Zelle (sin selector de método)", () => {
    seedCart();
    render(
      <CheckoutWizard
        shippingRates={RATES}
        storeName="Avanzar"
        storeAddress="Calle 1"
      />,
    );

    fillContact();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    // Pickup por default → sólo faltan name/phone del que retira.
    fireEvent.change(screen.getByLabelText(/^Quien retira/), {
      target: { value: "Ana" },
    });
    // Segundo "Teléfono" (el del recipient) — usamos getAllByLabelText.
    fireEvent.change(screen.getAllByLabelText(/^Teléfono/)[0]!, {
      target: { value: "+53 5555" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    // Paso 2 (Pago).
    expect(screen.getByText("Método de pago")).toBeInTheDocument();
    expect(screen.getByText("Zelle")).toBeInTheDocument();
    // No debe haber radios de método en USD.
    expect(screen.queryByLabelText(/Transferencia local/)).toBeNull();
    expect(screen.queryByLabelText(/Contra entrega/)).toBeNull();
  });

  test("Pago en CUP muestra transfer_local y cod como opciones", () => {
    document.cookie = "currency=CUP; path=/";
    seedCart({
      priceByCurrency: { CUP: 500000 },
    });

    render(
      <CheckoutWizard
        shippingRates={[
          { province: "Habana", amountMinor: 100000, currency: "CUP" },
        ]}
        storeName="Avanzar"
        storeAddress="Calle 1"
      />,
    );

    fillContact();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.change(screen.getByLabelText(/^Quien retira/), {
      target: { value: "Ana" },
    });
    fireEvent.change(screen.getAllByLabelText(/^Teléfono/)[0]!, {
      target: { value: "+53 5555" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    // Paso 2: aparecen ambos radios.
    expect(screen.getByText("Método de pago")).toBeInTheDocument();
    expect(screen.getByLabelText(/Transferencia local/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contra entrega/)).toBeInTheDocument();
  });

  test("Submit exitoso 201: muestra el orderNumber, link al recibo y vacía el carrito", async () => {
    seedCart();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        order: {
          orderNumber: "A-1",
          receiptToken: "tok-abc",
          totalMinor: 5000,
          currency: "USD",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderAndAdvanceToReview();

    // Ahora en Revisión → confirmar.
    expect(screen.getByText("Revisá tu pedido")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }));

    // Esperamos a que la promesa del fetch resuelva.
    await screen.findByText("¡Pedido recibido!");

    expect(screen.getByText("A-1")).toBeInTheDocument();
    const receiptLink = screen.getByRole("link", { name: "Ver recibo" });
    expect(receiptLink).toHaveAttribute(
      "href",
      "/api/v1/receipt/tok-abc",
    );
    // El carrito quedó vacío (post clearCart).
    expect($cart.get()).toHaveLength(0);

    // El body del POST fue el esperado (spot-check).
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toMatch(/\/api\/v1\/checkout$/);
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    const body = JSON.parse(init.body as string);
    expect(body.currency).toBe("USD");
    expect(body.fulfillment).toBe("delivery");
    expect(body.payment.method).toBe("zelle");
    expect(body.items).toEqual([{ productId: "p1", quantity: 1 }]);
  });

  test("la confirmación incluye un link 'Seguir mi pedido' hacia /seguimiento/:token", async () => {
    seedCart();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        order: {
          orderNumber: "A-1",
          receiptToken: "tok-abc",
          totalMinor: 5000,
          currency: "USD",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderAndAdvanceToReview();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }));

    const link = await screen.findByRole("link", {
      name: /seguir mi pedido/i,
    });
    expect(link).toHaveAttribute("href", "/seguimiento/tok-abc");
  });

  test("Submit 422 INSUFFICIENT_STOCK: mensaje de stock y carrito intacto", async () => {
    seedCart();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: "sin stock", code: "INSUFFICIENT_STOCK" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderAndAdvanceToReview();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }));

    await screen.findByText(
      "Un producto se quedó sin stock, revisá tu carrito.",
    );

    // Seguimos en la vista de Revisión y el carrito no se vació.
    expect(screen.getByText("Revisá tu pedido")).toBeInTheDocument();
    expect($cart.get()).toHaveLength(1);
  });

  test("checkout sin sesión guarda el token pendiente y muestra el banner de cuenta", async () => {
    (authClient.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
    });
    seedCart();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        order: {
          orderNumber: "A-3",
          receiptToken: "tok-guest",
          totalMinor: 5000,
          currency: "USD",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderAndAdvanceToReview();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }));

    expect(
      await screen.findByText(/querés seguir este pedido desde tu cuenta/i),
    ).toBeInTheDocument();
    expect(getPendingClaimToken()).toBe("tok-guest");
  });

  test("checkout CON sesión no guarda token pendiente ni muestra el banner", async () => {
    (authClient.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: "u1" } },
    });
    seedCart();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        order: {
          orderNumber: "A-4",
          receiptToken: "tok-user",
          totalMinor: 5000,
          currency: "USD",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderAndAdvanceToReview();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }));

    await screen.findByText("A-4");
    expect(
      screen.queryByText(/querés seguir este pedido desde tu cuenta/i),
    ).toBeNull();
    expect(getPendingClaimToken()).toBeNull();
  });

  test("si getSession() falla tras el 201, igual muestra el éxito (no error) y trata el pedido como invitado", async () => {
    // FIX 2 (S3): la orden ya está confirmada (201). Un fallo de getSession()
    // NO debe renderizar el panel de error ni re-habilitar "Confirmar pedido"
    // (evita el path de doble orden). Debe degradar a invitado (best-effort).
    (authClient.getSession as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("network"),
    );
    seedCart();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        order: {
          orderNumber: "A-5",
          receiptToken: "tok-fallback",
          totalMinor: 5000,
          currency: "USD",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderAndAdvanceToReview();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }));

    // El panel de éxito se renderiza (orderNumber visible), NO el de error.
    expect(await screen.findByText("A-5")).toBeInTheDocument();
    // Degradó a invitado: guardó el token pendiente + muestra el banner.
    expect(getPendingClaimToken()).toBe("tok-fallback");
    expect(
      screen.getByText(/querés seguir este pedido desde tu cuenta/i),
    ).toBeInTheDocument();
    // El fetch de checkout se llamó UNA sola vez (no hubo re-submit).
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
