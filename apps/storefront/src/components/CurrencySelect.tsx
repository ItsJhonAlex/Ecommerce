import { SUPPORTED_CURRENCIES, type SupportedCurrency } from "@avanzar/shared";
import type { ChangeEvent } from "react";
import { setCurrencyCookie } from "../lib/currency";

interface Props {
  /** Moneda actual (leída de la cookie en el servidor). */
  value: SupportedCurrency;
}

/**
 * Isla: selector de moneda. Al cambiar, persiste la elección en la cookie y
 * recarga para que el SSR vuelva a pedir los precios en la nueva moneda.
 */
export default function CurrencySelect({ value }: Props) {
  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    setCurrencyCookie(event.target.value as SupportedCurrency);
    location.reload();
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      aria-label="Moneda"
      className="cursor-pointer rounded-full border border-line bg-paper py-2 pl-3 pr-7 text-sm font-semibold text-ink-soft hover:border-brand-300 focus:outline-none"
    >
      {SUPPORTED_CURRENCIES.map((currency) => (
        <option key={currency} value={currency}>
          {currency}
        </option>
      ))}
    </select>
  );
}
