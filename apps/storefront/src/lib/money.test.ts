import { describe, expect, test } from "vitest";
import { money } from "./money";

// Intl inserta un espacio no separable (NBSP/U+202F) entre número y moneda;
// lo normalizamos a espacio simple para aserciones estables.
const norm = (s: string) => s.replace(/\s/g, " ");

describe("money", () => {
  test("formatea centavos con la moneda (locale es)", () => {
    // Intl "es" usa coma decimal y el símbolo de la moneda.
    expect(norm(money(1999, "CUP"))).toBe("19,99 CUP");
    expect(norm(money(1999, "USD"))).toContain("19,99");
    expect(norm(money(0, "CUP"))).toBe("0,00 CUP");
  });

  test("fallback ante código de moneda inválido (RangeError)", () => {
    // Un código inválido hace que Intl lance; caemos al formato simple.
    expect(money(1999, "NOTACURRENCY")).toBe("19.99 NOTACURRENCY");
  });
});
