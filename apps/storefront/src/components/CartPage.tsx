import { useStore } from "@nanostores/react";
import {
  $cart,
  removeItem,
  setQty,
  subtotalMinor,
  type CartLine,
} from "../stores/cart";
import { getCurrencyClient } from "../lib/currency";
import { money } from "../lib/money";

/**
 * Isla: página completa del carrito (`/carrito`). Edición inline de líneas,
 * subtotal general y CTA al checkout. Comparte criterio con `CartDrawer` pero
 * usa un layout más aireado (grid de 3 columnas en desktop: lista + resumen).
 */
export default function CartPage() {
  const lines = useStore($cart);
  const currency = getCurrencyClient();

  const empty = lines.length === 0;
  const subtotal = subtotalMinor(lines, currency);

  if (empty) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-line bg-surface px-6 py-14 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-500">
            <svg
              viewBox="0 0 24 24"
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="9" cy="20" r="1.5" />
              <circle cx="17" cy="20" r="1.5" />
              <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Tu carrito está vacío
          </h1>
          <p className="max-w-md text-sm text-ink-soft">
            Todavía no agregaste nada. Explorá el catálogo y sumá tus productos
            favoritos.
          </p>
          <a
            href="/productos"
            className="mt-2 inline-flex items-center rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
          >
            Ver productos
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          Tu carrito
        </h1>
        <p className="text-sm text-muted">
          {lines.length} {lines.length === 1 ? "artículo" : "artículos"}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        {/* Lista de líneas */}
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface lg:col-span-2">
          {lines.map((line) => (
            <CartPageRow key={line.productId} line={line} currency={currency} />
          ))}
        </ul>

        {/* Resumen */}
        <aside className="rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-6">
          <h2 className="text-base font-bold text-ink">Resumen</h2>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="font-medium text-ink-soft">Subtotal</dt>
              <dd className="text-base font-bold text-ink">
                {money(subtotal, currency)}
              </dd>
            </div>
            <p className="text-xs text-muted">
              Envío e impuestos se calculan en el checkout.
            </p>
          </dl>

          <div className="mt-6 flex flex-col gap-2">
            <a
              href="/checkout"
              onClick={(e) => {
                if (empty) {
                  e.preventDefault();
                }
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
              href="/productos"
              className="inline-flex items-center justify-center rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink hover:border-brand-300 hover:text-brand-700"
            >
              Seguir comprando
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
}

type RowProps = {
  line: CartLine;
  currency: ReturnType<typeof getCurrencyClient>;
};

function CartPageRow({ line, currency }: RowProps) {
  const price = line.priceByCurrency[currency];
  const available = typeof price === "number";
  const lineTotal = available ? (price as number) * line.quantity : null;

  return (
    <li className="flex flex-col gap-4 p-4 sm:flex-row sm:gap-5 sm:p-5">
      {/* Miniatura */}
      <a
        href={`/producto/${line.slug}`}
        className="block h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-line bg-paper sm:h-28 sm:w-28"
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
              className="h-8 w-8"
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

      {/* Detalle */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <a
            href={`/producto/${line.slug}`}
            className="text-base font-semibold text-ink hover:text-brand-700"
          >
            {line.name}
          </a>
          {available ? (
            <span className="text-sm font-semibold text-ink-soft">
              {money(price as number, currency)} c/u
            </span>
          ) : (
            <span className="text-xs font-medium text-brand-700">
              No disponible en {currency}
            </span>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
          <div
            className="inline-flex items-center rounded-full border border-line bg-paper"
            role="group"
            aria-label={`Cantidad de ${line.name}`}
          >
            <button
              type="button"
              onClick={() => setQty(line.productId, line.quantity - 1)}
              aria-label="Disminuir cantidad"
              className="grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:text-brand-700"
            >
              −
            </button>
            <span
              className="min-w-8 px-1 text-center text-sm font-semibold text-ink"
              aria-live="polite"
            >
              {line.quantity}
            </span>
            <button
              type="button"
              onClick={() => setQty(line.productId, line.quantity + 1)}
              aria-label="Aumentar cantidad"
              className="grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:text-brand-700"
            >
              +
            </button>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-base font-bold text-ink">
              {lineTotal !== null ? money(lineTotal, currency) : "—"}
            </span>
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
      </div>
    </li>
  );
}
