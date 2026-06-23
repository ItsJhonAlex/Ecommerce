import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Cliente better-auth. baseURL = origin actual (el cliente hace `new URL(baseURL)`,
 * así que NO acepta una ruta relativa). better-auth le agrega su basePath `/api/auth`;
 * en dev el proxy de Vite reenvía `/api/*` al backend, manteniendo same-origin para
 * la cookie de sesión httpOnly. `inferAdditionalFields` expone el campo `role`
 * (additionalField del server) en `session.user`.
 */
export const authClient = createAuthClient({
  baseURL: window.location.origin,
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
