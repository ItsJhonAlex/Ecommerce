/** Formatea centavos a importe con símbolo de moneda. Defensivo: un código de
 * moneda inválido no debe romper el render (Intl.NumberFormat lanza RangeError).
 * Portado de apps/admin/src/lib/format.ts. */
export function money(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es", {
      style: "currency",
      currency,
    }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`.trim();
  }
}
