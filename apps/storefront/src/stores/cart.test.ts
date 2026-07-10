import { beforeEach, describe, expect, test } from "vitest";
import {
  $cart,
  $cartOpen,
  $count,
  addItem,
  clearCart,
  linesUnavailableIn,
  removeItem,
  setQty,
  subtotalMinor,
  type CartLine,
} from "./cart";

// Fixture reutilizable — datos mínimos válidos de una línea del carrito.
function makeLine(overrides: Partial<CartLine> = {}): CartLine {
  return {
    productId: "p1",
    slug: "producto-uno",
    name: "Producto uno",
    image: null,
    priceByCurrency: { USD: 1000, CUP: 200000 },
    quantity: 1,
    ...overrides,
  };
}

beforeEach(() => {
  // Reset del store + drawer entre tests para aislamiento.
  // Nota: en este runner jsdom no expone localStorage por default; el reset del
  // store vía `$cart.set([])` alcanza — persistentAtom no repuebla desde
  // storage inexistente.
  $cart.set([]);
  $cartOpen.set(false);
  if (typeof localStorage !== "undefined") localStorage.clear();
});

describe("addItem", () => {
  test("agrega una línea nueva con quantity default 1", () => {
    addItem({
      productId: "p1",
      slug: "producto-uno",
      name: "Producto uno",
      image: null,
      priceByCurrency: { USD: 1000 },
    });
    const lines = $cart.get();
    expect(lines).toHaveLength(1);
    expect(lines[0]?.productId).toBe("p1");
    expect(lines[0]?.quantity).toBe(1);
  });

  test("agrega con quantity explícita", () => {
    addItem({
      productId: "p1",
      slug: "producto-uno",
      name: "Producto uno",
      image: null,
      priceByCurrency: { USD: 1000 },
      quantity: 3,
    });
    expect($cart.get()[0]?.quantity).toBe(3);
  });

  test("con productId existente suma la cantidad y no duplica", () => {
    addItem({
      productId: "p1",
      slug: "producto-uno",
      name: "Producto uno",
      image: null,
      priceByCurrency: { USD: 1000 },
      quantity: 2,
    });
    addItem({
      productId: "p1",
      slug: "producto-uno",
      name: "Producto uno",
      image: null,
      priceByCurrency: { USD: 1000 },
      quantity: 3,
    });
    const lines = $cart.get();
    expect(lines).toHaveLength(1);
    expect(lines[0]?.quantity).toBe(5);
  });
});

describe("setQty", () => {
  test("actualiza la cantidad de una línea", () => {
    $cart.set([makeLine({ productId: "p1", quantity: 1 })]);
    setQty("p1", 5);
    expect($cart.get()[0]?.quantity).toBe(5);
  });

  test("qty < 1 remueve la línea", () => {
    $cart.set([
      makeLine({ productId: "p1", quantity: 2 }),
      makeLine({ productId: "p2", quantity: 3 }),
    ]);
    setQty("p1", 0);
    const lines = $cart.get();
    expect(lines).toHaveLength(1);
    expect(lines[0]?.productId).toBe("p2");
  });

  test("productId inexistente es no-op", () => {
    $cart.set([makeLine({ productId: "p1", quantity: 2 })]);
    setQty("nope", 5);
    expect($cart.get()[0]?.quantity).toBe(2);
  });
});

describe("removeItem", () => {
  test("saca la línea con ese productId", () => {
    $cart.set([
      makeLine({ productId: "p1" }),
      makeLine({ productId: "p2" }),
    ]);
    removeItem("p1");
    const lines = $cart.get();
    expect(lines).toHaveLength(1);
    expect(lines[0]?.productId).toBe("p2");
  });
});

describe("clearCart", () => {
  test("vacía el carrito", () => {
    $cart.set([makeLine(), makeLine({ productId: "p2" })]);
    clearCart();
    expect($cart.get()).toEqual([]);
  });
});

describe("$count", () => {
  test("refleja la suma de quantities", () => {
    expect($count.get()).toBe(0);
    $cart.set([
      makeLine({ productId: "p1", quantity: 2 }),
      makeLine({ productId: "p2", quantity: 3 }),
    ]);
    expect($count.get()).toBe(5);
  });
});

describe("subtotalMinor", () => {
  test("suma precio * quantity en la moneda dada", () => {
    const lines: CartLine[] = [
      makeLine({
        productId: "p1",
        priceByCurrency: { USD: 1000 },
        quantity: 2,
      }),
      makeLine({
        productId: "p2",
        priceByCurrency: { USD: 500 },
        quantity: 3,
      }),
    ];
    expect(subtotalMinor(lines, "USD")).toBe(1000 * 2 + 500 * 3);
  });

  test("excluye líneas sin precio en la moneda", () => {
    const lines: CartLine[] = [
      makeLine({
        productId: "p1",
        priceByCurrency: { USD: 1000 },
        quantity: 2,
      }),
      makeLine({
        productId: "p2",
        priceByCurrency: { CUP: 999999 },
        quantity: 5,
      }),
    ];
    expect(subtotalMinor(lines, "USD")).toBe(2000);
  });

  test("carrito vacío → 0", () => {
    expect(subtotalMinor([], "USD")).toBe(0);
  });
});

describe("linesUnavailableIn", () => {
  test("devuelve las líneas sin precio en esa moneda", () => {
    const soloUSD = makeLine({
      productId: "p1",
      priceByCurrency: { USD: 1000 },
    });
    const conCUP = makeLine({
      productId: "p2",
      priceByCurrency: { USD: 500, CUP: 200000 },
    });
    const lines: CartLine[] = [soloUSD, conCUP];
    const unavailable = linesUnavailableIn(lines, "CUP");
    expect(unavailable).toHaveLength(1);
    expect(unavailable[0]?.productId).toBe("p1");
  });

  test("todas disponibles → array vacío", () => {
    const lines: CartLine[] = [
      makeLine({ priceByCurrency: { USD: 100, CUP: 20000 } }),
    ];
    expect(linesUnavailableIn(lines, "USD")).toEqual([]);
  });
});
