import { describe, expect, test } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  test("normaliza acentos, espacios y mayúsculas", () => {
    expect(slugify("Café con Leche")).toBe("cafe-con-leche");
  });
  test("colapsa separadores y recorta extremos", () => {
    expect(slugify("  Hola!!  Mundo  ")).toBe("hola-mundo");
  });
  test("string vacío", () => {
    expect(slugify("")).toBe("");
  });
});
