import { describe, expect, test } from "vitest";
import { minorToInput, parseMoneyToMinor } from "./money";

describe("parseMoneyToMinor", () => {
  test("convierte mayores a centavos", () => {
    expect(parseMoneyToMinor("19.99")).toBe(1999);
    expect(parseMoneyToMinor("0")).toBe(0);
  });
  test("acepta coma decimal", () => {
    expect(parseMoneyToMinor("19,99")).toBe(1999);
  });
  test("lanza ante valor inválido o negativo", () => {
    expect(() => parseMoneyToMinor("abc")).toThrow();
    expect(() => parseMoneyToMinor("-5")).toThrow();
  });
});

describe("minorToInput", () => {
  test("centavos a string con 2 decimales", () => {
    expect(minorToInput(1999)).toBe("19.99");
    expect(minorToInput(0)).toBe("0.00");
  });
});
