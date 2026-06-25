/** "19.99" / "19,99" → 1999 centavos. Lanza si no es un número >= 0. */
export function parseMoneyToMinor(input: string): number {
  const n = Number(input.trim().replace(",", "."));
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Importe inválido");
  }
  return Math.round(n * 100);
}

/** 1999 → "19.99" para precargar un input de edición. */
export function minorToInput(minor: number): string {
  return (minor / 100).toFixed(2);
}
