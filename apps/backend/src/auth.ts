import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { account, db, session, user, verification } from "@avanzar/db";

/**
 * Instancia de Better Auth.
 * - Usa el adapter de Drizzle apuntando a nuestras tablas de @avanzar/db.
 * - `role` se declara como additionalField (la columna ya existe en la DB como
 *   enum user_role). `input: false` => el cliente no puede setear su propio rol
 *   en el signup; arranca en "customer" y solo el staff/admin lo cambia server-side.
 * - El secret y la baseURL salen del entorno (BETTER_AUTH_SECRET / BETTER_AUTH_URL).
 */
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "customer",
        input: false,
      },
    },
  },
  trustedOrigins: [
    "http://localhost:4321", // storefront (Astro)
    "http://localhost:5174", // admin (Vite)
  ],
});
