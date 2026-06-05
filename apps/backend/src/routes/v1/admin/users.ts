import { db } from "@avanzar/db";
import { user } from "@avanzar/db/schema";
import { updateUserRoleSchema } from "@avanzar/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { fail } from "../../../lib/responses";
import { parseJson } from "../../../lib/validate";
import type { AuthEnv } from "../../../middlewares/auth";

/** Solo campos no sensibles del usuario. */
const SAFE_USER_COLUMNS = {
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  emailVerified: user.emailVerified,
  image: user.image,
  createdAt: user.createdAt,
};

export const adminUsersRouter = new Hono<AuthEnv>();

// GET /api/v1/admin/users?role=
adminUsersRouter.get("/", async (c) => {
  const role = c.req.query("role");
  const rows = role
    ? await db
        .select(SAFE_USER_COLUMNS)
        .from(user)
        .where(eq(user.role, role as never))
    : await db.select(SAFE_USER_COLUMNS).from(user);
  return c.json({ users: rows });
});

// PATCH /api/v1/admin/users/:id/role
adminUsersRouter.patch("/:id/role", async (c) => {
  const id = c.req.param("id");
  const parsed = await parseJson(c, updateUserRoleSchema);
  if (!parsed.ok) return parsed.response;
  const { role } = parsed.data;

  // Evitar que un admin se auto-degrade y deje el sistema sin admins por error.
  if (id === c.var.user.id && role !== "admin") {
    return fail(c, 422, "No podés quitarte tu propio rol de admin");
  }

  const [updated] = await db
    .update(user)
    .set({ role, updatedAt: new Date() })
    .where(eq(user.id, id))
    .returning(SAFE_USER_COLUMNS);
  if (!updated) return fail(c, 404, "Usuario no encontrado");
  return c.json({ user: updated });
});
