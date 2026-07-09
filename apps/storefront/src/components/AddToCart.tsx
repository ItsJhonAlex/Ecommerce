import { useState } from "react";

interface Props {
  /** Slug del producto (lo usará la lógica real de carrito en S2). */
  slug: string;
  /** Deshabilita la acción (p. ej. producto agotado). */
  disabled?: boolean;
}

/**
 * Isla UI: selector de cantidad + botón "Agregar al carrito".
 *
 * En S1 la acción está DESHABILITADA a propósito: el carrito real (nanostores +
 * persistencia) llega en S2. El marcado ya queda listo para conectarse: el
 * `handleAdd` de abajo es un no-op documentado que S2 reemplazará por el
 * `addToCart(slug, quantity)` real. El botón se muestra deshabilitado y, si no
 * es por agotado, con la nota "Carrito próximamente".
 */
export default function AddToCart({ slug, disabled = false }: Props) {
  const [quantity, setQuantity] = useState(1);

  // S2: reemplazar por la mutación real del store de carrito (addToCart(slug, quantity)).
  // En S1 el botón está deshabilitado, así que esto no llega a ejecutarse.
  function handleAdd() {
    void slug;
    void quantity;
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
          disabled={disabled}
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
        disabled
        aria-disabled="true"
        className="inline-flex items-center justify-center rounded-full bg-brand-500 px-6 py-3 font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70"
      >
        Agregar al carrito
      </button>

      <p className="text-xs text-muted">
        {disabled ? "Producto agotado" : "Carrito próximamente"}
      </p>
    </div>
  );
}
