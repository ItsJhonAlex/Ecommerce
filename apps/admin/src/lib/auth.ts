import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Cliente better-auth. baseURL relativo: same-origin vía el proxy de Vite, así
 * la cookie de sesión httpOnly funciona en dev. `inferAdditionalFields` expone
 * el campo `role` (additionalField del server) en `session.user`.
 */
export const authClient = createAuthClient({
  baseURL: "/api/auth",
  plugins: [
    inferAdditionalFields({
      user: { role: { type: "string" } },
    }),
  ],
});

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};
