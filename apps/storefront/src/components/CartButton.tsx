/**
 * Isla: botón de carrito. En S1 muestra 0; en S2 se conecta a nanostores.
 * Enlaza a /carrito (placeholder de S2).
 */
export default function CartButton() {
  const count = 0;

  return (
    <a
      href="/carrito"
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
    </a>
  );
}
