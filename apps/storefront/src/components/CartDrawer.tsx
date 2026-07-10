import { useStore } from "@nanostores/react";
import { useEffect } from "react";
import {
  $cart,
  $cartOpen,
  removeItem,
  setQty,
  subtotalMinor,
  type CartLine,
} from "../stores/cart";
import { getCurrencyClient } from "../lib/currency";
import { money } from "../lib/money";

/**
 * Isla: drawer lateral del carrito. Renderiza siempre para poder animar la
 * entrada/salida; el contenido interactivo se oculta con `aria-hidden` y
 * pointer-events cuando `$cartOpen` es false. Se cierra por overlay, botón
 * cerrar (X) o tecla Escape.
 */
export default function CartDrawer() {
  const open = useStore($cartOpen);
  const lines = useStore($cart);
  const currency = getCurrencyClient();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") $cartOpen.set(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const subtotal = subtotalMinor(lines, currency);
  const empty = lines.length === 0;

  function close() {
    $cartOpen.set(false);
  }

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-[60] ${open ? "" : "pointer-events-none"}`}
    >
      {/* Overlay */}
      <div
        onClick={close}
        aria-hidden="true"
        className={`absolute inset-0 bg-ink/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      {open && (
        <aside
          role="dialog"
          aria-label="Tu carrito"
          className={`absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col bg-surface shadow-2xl transition-transform duration-200 ease-out ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Header */}
          <header className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-lg font-bold text-ink">Tu carrito</h2>
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar carrito"
              className="grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-brand-50 hover:text-brand-700"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>

          {/* Body */}
          {empty ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="text-base font-medium text-ink-soft">
                Tu carrito está vacío
              </p>
              <a
                href="/productos"
                onClick={close}
                className="inline-flex items-center rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
              >
                Ver productos
              </a>
            </div>
          ) : (
            <ul className="flex-1 divide-y divide-line overflow-y-auto">
              {lines.map((line) => (
                <CartLineRow
                  key={line.productId}
                  line={line}
                  currency={currency}
                  onNavigate={close}
                />
              ))}
            </ul>
          )}

          {/* Footer */}
          <footer className="border-t border-line bg-paper px-5 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-ink-soft">Subtotal</span>
              <span className="text-base font-bold text-ink">
                {money(subtotal, currency)}
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <a
                href="/checkout"
                onClick={(e) => {
                  if (empty) {
                    e.preventDefault();
                    return;
                  }
                  close();
                }}
                aria-disabled={empty}
                className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm ${
                  empty
                    ? "cursor-not-allowed bg-muted text-white opacity-70"
                    : "bg-brand-500 text-white hover:bg-brand-600"
                }`}
              >
                Ir al checkout
              </a>
              <a
                href="/carrito"
                onClick={close}
                className="inline-flex items-center justify-center rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink hover:border-brand-300 hover:text-brand-700"
              >
                Ver carrito
              </a>
            </div>
          </footer>
        </aside>
      )}
    </div>
  );
}

type RowProps = {
  line: CartLine;
  currency: ReturnType<typeof getCurrencyClient>;
  onNavigate: () => void;
};

function CartLineRow({ line, currency, onNavigate }: RowProps) {
  const price = line.priceByCurrency[currency];
  const available = typeof price === "number";

  return (
    <li className="flex gap-3 px-5 py-4">
      <a
        href={`/producto/${line.slug}`}
        onClick={onNavigate}
        className="block h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-line bg-paper"
        aria-label={`Ver ${line.name}`}
      >
        {line.image ? (
          <img
            src={line.image.url}
            alt={line.image.alt ?? line.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="m5 16 4-4 3 3 3-2 4 4" />
            </svg>
          </div>
        )}
      </a>

      <div className="min-w-0 flex-1">
        <a
          href={`/producto/${line.slug}`}
          onClick={onNavigate}
          className="line-clamp-2 text-sm font-semibold text-ink hover:text-brand-700"
        >
          {line.name}
        </a>

        <div className="mt-1 text-sm">
          {available ? (
            <span className="font-bold text-ink">
              {money(price as number, currency)}
            </span>
          ) : (
            <span className="text-xs font-medium text-brand-700">
              No disponible en {currency}
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div
            className="inline-flex items-center rounded-full border border-line bg-surface"
            role="group"
            aria-label={`Cantidad de ${line.name}`}
          >
            <button
              type="button"
              onClick={() => setQty(line.productId, line.quantity - 1)}
              aria-label="Disminuir cantidad"
              className="grid h-8 w-8 place-items-center rounded-full text-ink-soft hover:text-brand-700"
            >
              −
            </button>
            <span
              className="min-w-6 px-1 text-center text-sm font-semibold text-ink"
              aria-live="polite"
            >
              {line.quantity}
            </span>
            <button
              type="button"
              onClick={() => setQty(line.productId, line.quantity + 1)}
              aria-label="Aumentar cantidad"
              className="grid h-8 w-8 place-items-center rounded-full text-ink-soft hover:text-brand-700"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={() => removeItem(line.productId)}
            aria-label={`Quitar ${line.name}`}
            className="text-xs font-medium text-muted hover:text-brand-700"
          >
            Quitar
          </button>
        </div>
      </div>
    </li>
  );
}
