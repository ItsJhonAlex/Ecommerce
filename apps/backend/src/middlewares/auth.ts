import { isAdminRole } from "@avanzar/shared";
import { createMiddleware } from "hono/factory";
import { auth } from "../auth";

type SessionUser = typeof auth.$Infer.Session.user;
type SessionData = typeof auth.$Infer.Session.session;

/** Variables que los middlewares inyectan en el contexto Hono. */
export type AuthEnv = {
  Variables: {
    user: SessionUser;
    session: SessionData;
  };
};

/** Lee el rol del usuario de forma defensiva (additionalField de Better Auth). */
function roleOf(user: SessionUser): string {
  return (user as { role?: string }).role ?? "customer";
}

/** Exige sesión válida. 401 si no hay. Inyecta user + session. */
export const requireSession = createMiddleware<AuthEnv>(async (c, next) => {
  const result = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!result) return c.json({ error: "No autenticado" }, 401);
  c.set("user", result.user);
  c.set("session", result.session);
  await next();
});

/** Exige sesión + rol admin/staff. 401 sin sesión, 403 sin permiso. */
export const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  const result = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!result) return c.json({ error: "No autenticado" }, 401);
  if (!isAdminRole(roleOf(result.user))) {
    return c.json({ error: "Acceso denegado" }, 403);
  }
  c.set("user", result.user);
  c.set("session", result.session);
  await next();
});
