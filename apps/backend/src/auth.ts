import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { account, db, session, user, verification } from "@avanzar/db";
import { loadEnv } from "./env";

const env = loadEnv();

/**
 * Instancia de Better Auth.
 * - Usa el adapter de Drizzle apuntando a nuestras tablas de @avanzar/db.
 * - `role` se declara como additionalField (la columna ya existe en la DB como
 *   enum user_role). `input: false` => el cliente no puede setear su propio rol
 *   en el signup; arranca en "customer" y solo el staff/admin lo cambia server-side.
 * - El secret sale del entorno (BETTER_AUTH_SECRET); la baseURL de env validado.
 */
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
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
