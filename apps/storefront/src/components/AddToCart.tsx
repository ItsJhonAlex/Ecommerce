import { useState } from "react";
import type { SupportedCurrency } from "@avanzar/shared";
import { $cartOpen, addItem } from "../stores/cart";

interface Props {
  productId: string;
  slug: string;
  name: string;
  image: { url: string; alt: string | null } | null;
  priceByCurrency: Partial<Record<SupportedCurrency, number>>;
  stockQuantity: number;
}

/**
 * Isla: selector de cantidad + botón "Agregar al carrito".
 *
 * Al click: agrega la línea al store (`addItem`) y abre el drawer
 * (`$cartOpen.set(true)`) como feedback. Si `stockQuantity === 0`, la
 * acción se muestra deshabilitada con la nota "Producto agotado".
 */
export default function AddToCart({
  productId,
  slug,
  name,
  image,
  priceByCurrency,
  stockQuantity,
}: Props) {
  const [quantity, setQuantity] = useState(1);
  const soldOut = stockQuantity === 0;

  function handleAdd() {
    if (soldOut) return;
    addItem({ productId, slug, name, image, priceByCurrency, quantity });
    $cartOpen.set(true);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <label
          htmlFor="add-to-cart-qty"
          className="text-sm font-medium text-ink-soft"
        >
          Cantidad
        </label>
        <input
          id="add-to-cart-qty"
          type="number"
          min={1}
          value={quantity}
          disabled={soldOut}
          onChange={(event) => {
            const next = Number.parseInt(event.target.value, 10);
            setQuantity(Number.isNaN(next) || next < 1 ? 1 : next);
          }}
          className="w-20 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={soldOut}
        aria-disabled={soldOut}
        className="inline-flex items-center justify-center rounded-full bg-brand-500 px-6 py-3 font-semibold text-white shadow-sm hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70"
      >
        Agregar al carrito
      </button>

      {soldOut && <p className="text-xs text-muted">Producto agotado</p>}
    </div>
  );
}
