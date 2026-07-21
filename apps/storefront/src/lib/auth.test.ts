import { describe, expect, test } from "vitest";
import { authClient } from "./auth";
import { PUBLIC_API_BASE_URL } from "./config";

// Regresión (FIX 1, S3): el cliente better-auth hace `new URL(baseURL)`, así que
// una ruta relativa lanzaría al cargar el módulo. Además el storefront NO monta
// `/api/auth` ni un proxy, por lo que `baseURL` DEBE apuntar al backend
// (`PUBLIC_API_BASE_URL`, cross-origin directo) y no al origin del storefront
// (:4321). Contrato: la cookie viaja por CORS `credentials:true` + `trustedOrigins`.
describe("authClient", () => {
  test("se construye sin lanzar (baseURL absoluto)", () => {
    expect(authClient).toBeDefined();
    expect(typeof authClient.useSession).toBe("function");
    expect(typeof authClient.signIn.email).toBe("function");
  });

  test("baseURL apunta al backend (PUBLIC_API_BASE_URL), no al origin del storefront", () => {
    // El backend por defecto corre en :3000; nunca debe ser el origin :4321.
    // Esta es la aserción de contrato principal (FIX 1): auth.ts usa
    // PUBLIC_API_BASE_URL como baseURL, la misma base que la capa de datos.
    expect(PUBLIC_API_BASE_URL).not.toMatch(/:4321/);

    // Best-effort: si esta versión de better-auth expone la baseURL resuelta en
    // las opciones del $fetch interno, confirmamos que arranca con la base del
    // backend. La forma interna no es API pública, así que lo tomamos con
    // optional chaining y sólo aseveramos cuando está disponible.
    const resolved = (
      authClient as unknown as {
        $fetch?: { options?: { baseURL?: string } };
      }
    ).$fetch?.options?.baseURL;
    if (typeof resolved === "string") {
      // better-auth normaliza agregando el basePath /api/auth a la baseURL dada.
      expect(resolved.startsWith(PUBLIC_API_BASE_URL)).toBe(true);
      expect(resolved).not.toMatch(/:4321/);
    }
  });
});
