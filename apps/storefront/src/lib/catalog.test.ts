import { describe, expect, test } from "vitest";
import { emptyToUndef, unitsToMinor } from "./catalog";

describe("emptyToUndef", () => {
  test("devuelve undefined para null, vacío o solo espacios", () => {
    expect(emptyToUndef(null)).toBeUndefined();
    expect(emptyToUndef("")).toBeUndefined();
    expect(emptyToUndef("   ")).toBeUndefined();
  });

  test("preserva valores no vacíos tal cual", () => {
    expect(emptyToUndef("newest")).toBe("newest");
    expect(emptyToUndef("10")).toBe("10");
  });
});

describe("unitsToMinor", () => {
  test("convierte unidades enteras a centavos (×100)", () => {
    expect(unitsToMinor("10")).toBe(1000);
    expect(unitsToMinor("0")).toBe(0);
    expect(unitsToMinor("19.99")).toBe(1999);
  });

  test("undefined si el valor está ausente o no es válido", () => {
    expect(unitsToMinor(undefined)).toBeUndefined();
    expect(unitsToMinor("abc")).toBeUndefined();
    expect(unitsToMinor("-5")).toBeUndefined();
  });
});
