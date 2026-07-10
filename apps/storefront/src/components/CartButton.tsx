import { useStore } from "@nanostores/react";
import { $cartOpen, $count } from "../stores/cart";

/**
 * Isla: botón del carrito. Muestra el badge con el count vivo del store y
 * al click abre el drawer del carrito.
 */
export default function CartButton() {
  const count = useStore($count);

  return (
    <button
      type="button"
      onClick={() => $cartOpen.set(true)}
      aria-label={`Carrito (${count})`}
      className="relative inline-flex items-center justify-center rounded-full p-2 text-ink-soft hover:bg-brand-50 hover:text-brand-700"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="9" cy="20" r="1.4" />
        <circle cx="18" cy="20" r="1.4" />
        <path d="M2.5 3h2l2.2 12.2a1.6 1.6 0 0 0 1.6 1.3h8.4a1.6 1.6 0 0 0 1.6-1.3L21 7H6" />
      </svg>
      <span
        className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-xs font-bold text-white"
        aria-hidden="true"
      >
        {count}
      </span>
    </button>
  );
}
