import { persistentAtom } from "@nanostores/persistent";
import { atom, computed } from "nanostores";
import type { SupportedCurrency } from "@avanzar/shared";

/**
 * Línea del carrito. Guardamos snapshot de los datos que el drawer/página
 * necesitan mostrar (nombre, imagen, precios) para no depender de fetch al
 * hidratar. La moneda activa se resuelve al render, y `priceByCurrency` puede
 * no cubrir todas las monedas soportadas (líneas "no disponibles" en la
 * moneda actual).
 */
export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  image: { url: string; alt: string | null } | null;
  priceByCurrency: Partial<Record<SupportedCurrency, number>>;
  quantity: number;
};

/** Carrito persistente en localStorage (key `avanzar_cart`). */
export const $cart = persistentAtom<CartLine[]>("avanzar_cart", [], {
  encode: JSON.stringify,
  decode: JSON.parse,
});

/** Estado efímero: el drawer del carrito está abierto. */
export const $cartOpen = atom<boolean>(false);

/** Cantidad total de ítems (suma de `quantity` de cada línea). */
export const $count = computed($cart, (lines) =>
  lines.reduce((s, l) => s + l.quantity, 0),
);

/**
 * Agrega una línea al carrito. Si ya existe otra con el mismo `productId`,
 * suma la cantidad (default 1) en lugar de duplicar. `quantity` opcional.
 */
export function addItem(
  input: Omit<CartLine, "quantity"> & { quantity?: number },
): void {
  const qty = input.quantity ?? 1;
  const lines = $cart.get();
  const idx = lines.findIndex((l) => l.productId === input.productId);
  if (idx >= 0) {
    const existing = lines[idx];
    if (!existing) return;
    const next = lines.slice();
    next[idx] = { ...existing, quantity: existing.quantity + qty };
    $cart.set(next);
    return;
  }
  const { quantity: _omit, ...rest } = input;
  $cart.set([...lines, { ...rest, quantity: qty }]);
}

/**
 * Actualiza la cantidad de una línea. Si `qty < 1`, remueve la línea.
 * Si el `productId` no existe, es no-op.
 */
export function setQty(productId: string, qty: number): void {
  const lines = $cart.get();
  const idx = lines.findIndex((l) => l.productId === productId);
  if (idx < 0) return;
  if (qty < 1) {
    $cart.set(lines.filter((l) => l.productId !== productId));
    return;
  }
  const existing = lines[idx];
  if (!existing) return;
  const next = lines.slice();
  next[idx] = { ...existing, quantity: qty };
  $cart.set(next);
}

/** Remueve la línea con el `productId` dado (si existe). */
export function removeItem(productId: string): void {
  $cart.set($cart.get().filter((l) => l.productId !== productId));
}

/** Vacía el carrito. */
export function clearCart(): void {
  $cart.set([]);
}

/**
 * Subtotal en centavos para la moneda dada. Ignora líneas que no tienen
 * precio en esa moneda. Función pura (recibe el array — no lee el store).
 */
export function subtotalMinor(
  lines: CartLine[],
  currency: SupportedCurrency,
): number {
  let total = 0;
  for (const l of lines) {
    const price = l.priceByCurrency[currency];
    if (typeof price === "number") total += price * l.quantity;
  }
  return total;
}

/**
 * Devuelve las líneas que no tienen precio en la moneda dada (para avisar
 * "No disponible en {cur}" en el drawer/checkout). Función pura.
 */
export function linesUnavailableIn(
  lines: CartLine[],
  currency: SupportedCurrency,
): CartLine[] {
  return lines.filter((l) => typeof l.priceByCurrency[currency] !== "number");
}
