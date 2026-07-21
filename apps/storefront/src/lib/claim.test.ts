import { describe, expect, test } from "vitest";
import { extractToken } from "./claim";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("extractToken", () => {
  test("acepta un uuid pelado", () => {
    expect(extractToken(UUID)).toBe(UUID);
  });

  test("extrae el token de una URL de seguimiento", () => {
    expect(extractToken(`https://tienda.com/seguimiento/${UUID}`)).toBe(UUID);
  });

  test("extrae el token de una URL de recibo", () => {
    expect(extractToken(`http://localhost:3000/api/v1/receipt/${UUID}`)).toBe(UUID);
  });

  test("acepta con espacios alrededor", () => {
    expect(extractToken(`  ${UUID}  `)).toBe(UUID);
  });

  test("texto inválido devuelve null", () => {
    expect(extractToken("no es un token")).toBeNull();
    expect(extractToken("")).toBeNull();
    expect(extractToken("https://tienda.com/productos")).toBeNull();
  });
});
