import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import AddToCart from "./AddToCart.tsx";
import { $cart, $cartOpen } from "../stores/cart";

const baseProps = {
  productId: "prod-1",
  slug: "producto-uno",
  name: "Producto uno",
  image: { url: "https://cdn.test/uno.jpg", alt: "Producto uno" },
  priceByCurrency: { USD: 1999 },
  stockQuantity: 5,
};

describe("AddToCart", () => {
  beforeEach(() => {
    $cart.set([]);
    $cartOpen.set(false);
  });

  test("agrega la línea con la cantidad elegida y abre el drawer", () => {
    render(<AddToCart {...baseProps} />);

    const qtyInput = screen.getByLabelText("Cantidad") as HTMLInputElement;
    fireEvent.change(qtyInput, { target: { value: "2" } });

    fireEvent.click(
      screen.getByRole("button", { name: /agregar al carrito/i }),
    );

    const lines = $cart.get();
    expect(lines).toHaveLength(1);
    expect(lines[0]?.productId).toBe("prod-1");
    expect(lines[0]?.quantity).toBe(2);
    expect($cartOpen.get()).toBe(true);
  });

  test("con stockQuantity=0 el botón está deshabilitado y muestra 'Producto agotado'", () => {
    render(<AddToCart {...baseProps} stockQuantity={0} />);

    const btn = screen.getByRole("button", { name: /agregar al carrito/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Producto agotado")).toBeInTheDocument();

    fireEvent.click(btn);
    expect($cart.get()).toHaveLength(0);
    expect($cartOpen.get()).toBe(false);
  });
});
