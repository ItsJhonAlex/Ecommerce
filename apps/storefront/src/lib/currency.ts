import { SUPPORTED_CURRENCIES, type SupportedCurrency } from "@avanzar/shared";

/** Nombre de la cookie que guarda la moneda elegida por el visitante. */
export const CURRENCY_COOKIE = "currency";

const DEFAULT_CURRENCY: SupportedCurrency = "USD";

/** Valida un valor arbitrario contra las monedas soportadas; default USD. */
export function parseCurrency(
  value: string | null | undefined,
): SupportedCurrency {
  if (value && (SUPPORTED_CURRENCIES as readonly string[]).includes(value)) {
    return value as SupportedCurrency;
  }
  return DEFAULT_CURRENCY;
}

/**
 * Extrae la moneda desde un header `Cookie` (para SSR). Parsea pares
 * `k=v; k2=v2` y valida el valor de `currency`. Default USD.
 */
export function getCurrencyFromCookieHeader(
  cookieHeader: string | null,
): SupportedCurrency {
  if (!cookieHeader) return DEFAULT_CURRENCY;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (name === CURRENCY_COOKIE) {
      return parseCurrency(decodeURIComponent(part.slice(eq + 1).trim()));
    }
  }
  return DEFAULT_CURRENCY;
}

/**
 * Persiste la moneda en `document.cookie` (cliente). Guard si no hay `document`
 * (SSR): no hace nada. Cookie a nivel raíz, 1 año.
 */
export function setCurrencyCookie(currency: SupportedCurrency): void {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 365; // 1 año en segundos
  document.cookie = `${CURRENCY_COOKIE}=${currency}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Lee la moneda desde `document.cookie` en el cliente. SSR-safe: si no hay
 * `document` (renderizado en el server), devuelve USD. Usado por islas React
 * que deciden en qué moneda renderizar precios sin recibir la moneda por prop.
 */
export function getCurrencyClient(): SupportedCurrency {
  return getCurrencyFromCookieHeader(
    typeof document === "undefined" ? null : document.cookie,
  );
}
