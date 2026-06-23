import { describe, expect, test } from "vitest";
import { authClient } from "./auth";

// Regresión: el cliente better-auth hace `new URL(baseURL)`, así que una ruta
// relativa ("/api/auth") lanzaba al cargar el módulo y la app no renderizaba.
// Importar el cliente real (sin mock) dispara createAuthClient; si baseURL no es
// una URL absoluta, este import falla y el test queda en rojo.
describe("authClient", () => {
  test("se construye sin lanzar (baseURL absoluto)", () => {
    expect(authClient).toBeDefined();
    expect(typeof authClient.useSession).toBe("function");
    expect(typeof authClient.signIn.email).toBe("function");
  });
});
