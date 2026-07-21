import { createAuthClient } from "better-auth/react";
import { PUBLIC_API_BASE_URL } from "./config";

/**
 * Cliente better-auth del storefront. A diferencia del admin, NO necesita el
 * plugin `inferAdditionalFields` (el storefront no lee `session.user.role`).
 *
 * Estrategia cross-origin directa: `baseURL` apunta al BACKEND (la misma base
 * que usa la capa de datos vía `PUBLIC_API_BASE_URL`), NO al origin del
 * storefront (:4321). El storefront no monta `/api/auth` ni un proxy, así que
 * apuntar al origin daría 404 en login/registro/get-session. better-auth le
 * agrega su basePath `/api/auth`, por eso `baseURL` debe ser la base del backend
 * (p. ej. `http://localhost:3000`), absoluta — better-auth hace `new URL(baseURL)`
 * y una ruta relativa lanzaría al cargar el módulo.
 *
 * La cookie de sesión viaja cross-origin gracias a CORS `credentials:true` +
 * `trustedOrigins` (ya configurado en `apps/backend/src/auth.ts` y
 * `src/index.ts`); NO hay proxy Vite/Astro.
 *
 * SSR-safe: `PUBLIC_API_BASE_URL` es una constante de módulo (sin `window`/
 * `document`), así que importarla no rompe si `auth.ts` se evalúa en el server.
 */
export const authClient = createAuthClient({
  baseURL: PUBLIC_API_BASE_URL,
});

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};
