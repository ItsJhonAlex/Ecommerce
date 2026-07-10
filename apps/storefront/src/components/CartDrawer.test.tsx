import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import CartDrawer from "./CartDrawer.tsx";
import { $cart, $cartOpen, type CartLine } from "../stores/cart";

function makeLine(overrides: Partial<CartLine> = {}): CartLine {
  return {
    productId: "p1",
    slug: "producto-uno",
    name: "Producto uno",
    image: null,
    priceByCurrency: { USD: 1999 },
    quantity: 1,
    ...overrides,
  };
}

describe("CartDrawer", () => {
  beforeEach(() => {
    $cart.set([]);
    $cartOpen.set(false);
    // Aseguramos moneda USD para los tests (getCurrencyClient lee document.cookie).
    document.cookie = "currency=USD; path=/";
  });

  test("con carrito vacío y abierto: muestra el estado vacío", () => {
    $cart.set([]);
    $cartOpen.set(true);
    render(<CartDrawer />);

    expect(screen.getByRole("dialog", { name: "Tu carrito" })).toBeInTheDocument();
    expect(screen.getByText("Tu carrito está vacío")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver productos" })).toHaveAttribute(
      "href",
      "/productos",
    );
  });

  test("con una línea: renderiza nombre, precio y subtotal formateados", () => {
    $cart.set([makeLine({ priceByCurrency: { USD: 1999 }, quantity: 2 })]);
    $cartOpen.set(true);
    render(<CartDrawer />);

    expect(screen.getByRole("link", { name: "Producto uno" })).toBeInTheDocument();
    // Precio unitario 19.99 USD y subtotal 39.98 USD deben aparecer.
    const precios = screen.getAllByText(/US\$|USD/);
    expect(precios.length).toBeGreaterThan(0);
    // Subtotal en el footer: 19.99 * 2 = 39.98
    expect(
      screen.getByText((t) => t.includes("39,98") || t.includes("39.98")),
    ).toBeInTheDocument();
  });

  test("click en '+' incrementa la cantidad de la línea", () => {
    $cart.set([makeLine({ quantity: 1 })]);
    $cartOpen.set(true);
    render(<CartDrawer />);

    fireEvent.click(
      screen.getByRole("button", { name: "Aumentar cantidad" }),
    );

    expect($cart.get()[0]?.quantity).toBe(2);
  });

  test("click en 'Quitar' saca la línea y aparece el estado vacío", () => {
    $cart.set([makeLine()]);
    $cartOpen.set(true);
    render(<CartDrawer />);

    fireEvent.click(screen.getByRole("button", { name: "Quitar Producto uno" }));

    expect($cart.get()).toHaveLength(0);
    expect(screen.getByText("Tu carrito está vacío")).toBeInTheDocument();
  });

  test("línea sin precio en la moneda: muestra 'No disponible en USD' y la excluye del subtotal", () => {
    $cart.set([
      makeLine({
        productId: "p1",
        priceByCurrency: { CUP: 500000 },
        quantity: 3,
      }),
    ]);
    $cartOpen.set(true);
    render(<CartDrawer />);

    expect(screen.getByText("No disponible en USD")).toBeInTheDocument();
    // Subtotal debería ser 0 USD → 0,00 US$
    // Buscamos "0,00" (es-locale) en el footer.
    const subtotalRegion = screen.getByText("Subtotal").parentElement!;
    expect(subtotalRegion.textContent).toMatch(/0,00|0\.00/);
  });

  test("cerrado: no muestra el contenido del diálogo (role='dialog' ausente)", () => {
    $cart.set([makeLine()]);
    $cartOpen.set(false);
    render(<CartDrawer />);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("Tu carrito")).toBeNull();
  });

  test("Escape cierra el drawer", () => {
    $cart.set([makeLine()]);
    $cartOpen.set(true);
    render(<CartDrawer />);

    fireEvent.keyDown(document, { key: "Escape" });
    expect($cartOpen.get()).toBe(false);
  });

  test("botón 'Ir al checkout' deshabilitado (aria-disabled) con carrito vacío", () => {
    $cart.set([]);
    $cartOpen.set(true);
    render(<CartDrawer />);

    const checkout = screen.getByRole("link", { name: "Ir al checkout" });
    expect(checkout).toHaveAttribute("aria-disabled", "true");
  });
});
