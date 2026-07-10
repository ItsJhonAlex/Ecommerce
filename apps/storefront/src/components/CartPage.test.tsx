import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import CartPage from "./CartPage.tsx";
import { $cart, $cartOpen, type CartLine } from "../stores/cart";

function makeLine(overrides: Partial<CartLine> = {}): CartLine {
  return {
    productId: "p1",
    slug: "producto-uno",
    name: "Producto uno",
    image: null,
    priceByCurrency: { USD: 1000 },
    quantity: 1,
    ...overrides,
  };
}

describe("CartPage", () => {
  beforeEach(() => {
    $cart.set([]);
    $cartOpen.set(false);
    document.cookie = "currency=USD; path=/";
  });

  test("estado vacío: muestra mensaje, link a /productos y no expone 'Ir al checkout'", () => {
    $cart.set([]);
    render(<CartPage />);

    expect(screen.getByText("Tu carrito está vacío")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver productos" })).toHaveAttribute(
      "href",
      "/productos",
    );
    // Decisión: en el estado vacío no renderizamos el resumen ni el CTA de
    // checkout — sólo el estado vacío + "Ver productos". Verificamos que
    // "Ir al checkout" no existe en el DOM.
    expect(screen.queryByRole("link", { name: "Ir al checkout" })).toBeNull();
  });

  test("con 2 líneas: renderiza ambos nombres y el subtotal general (USD 25,00)", () => {
    $cart.set([
      makeLine({
        productId: "p1",
        slug: "producto-uno",
        name: "Producto uno",
        priceByCurrency: { USD: 1000 },
        quantity: 2,
      }),
      makeLine({
        productId: "p2",
        slug: "producto-dos",
        name: "Producto dos",
        priceByCurrency: { USD: 500 },
        quantity: 1,
      }),
    ]);
    render(<CartPage />);

    expect(
      screen.getByRole("link", { name: "Producto uno" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Producto dos" }),
    ).toBeInTheDocument();

    // Subtotal: 1000*2 + 500*1 = 2500 minor → 25,00 US$ (es-locale).
    const subtotalLabel = screen.getByText("Subtotal");
    const subtotalRegion = subtotalLabel.parentElement!;
    expect(subtotalRegion.textContent).toMatch(/25,00|25\.00/);

    // "Ir al checkout" está habilitado con líneas presentes.
    const checkout = screen.getByRole("link", { name: "Ir al checkout" });
    expect(checkout).toHaveAttribute("href", "/checkout");
    expect(checkout).toHaveAttribute("aria-disabled", "false");
  });

  test("click en '+' de la primera línea incrementa qty en el store y en el DOM", () => {
    $cart.set([
      makeLine({
        productId: "p1",
        name: "Producto uno",
        priceByCurrency: { USD: 1000 },
        quantity: 2,
      }),
      makeLine({
        productId: "p2",
        name: "Producto dos",
        priceByCurrency: { USD: 500 },
        quantity: 1,
      }),
    ]);
    render(<CartPage />);

    const plusBtns = screen.getAllByRole("button", {
      name: "Aumentar cantidad",
    });
    // Primera línea → primer botón "+".
    fireEvent.click(plusBtns[0]!);

    expect($cart.get()[0]?.quantity).toBe(3);

    // Nuevo subtotal: 1000*3 + 500 = 3500 → 35,00.
    const subtotalRegion = screen.getByText("Subtotal").parentElement!;
    expect(subtotalRegion.textContent).toMatch(/35,00|35\.00/);
  });

  test("click en 'Quitar' saca la línea del store", () => {
    $cart.set([
      makeLine({ productId: "p1", name: "Producto uno" }),
      makeLine({ productId: "p2", name: "Producto dos" }),
    ]);
    render(<CartPage />);

    fireEvent.click(screen.getByRole("button", { name: "Quitar Producto uno" }));

    const remaining = $cart.get();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.productId).toBe("p2");
  });

  test("línea sin precio en la moneda activa: muestra 'No disponible en USD' y la excluye del subtotal", () => {
    $cart.set([
      makeLine({
        productId: "p1",
        name: "Producto uno",
        priceByCurrency: { USD: 1000 },
        quantity: 1,
      }),
      makeLine({
        productId: "p2",
        name: "Producto dos",
        priceByCurrency: { CUP: 200 },
        quantity: 2,
      }),
    ]);
    render(<CartPage />);

    expect(screen.getByText("No disponible en USD")).toBeInTheDocument();

    // Subtotal excluye la línea sin precio: 1000 → 10,00.
    const subtotalRegion = screen.getByText("Subtotal").parentElement!;
    expect(subtotalRegion.textContent).toMatch(/10,00|10\.00/);
  });
});
