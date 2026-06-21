import { userRole } from "@avanzar/db/schema";
import { z } from "zod";

/** Body de PATCH /admin/users/:id/role. */
export const updateUserRoleSchema = z.object({
  role: z.enum(userRole.enumValues),
});

/** Query de GET /admin/users. El filtro de rol es opcional pero validado. */
export const userListQuerySchema = z.object({
  role: z.enum(userRole.enumValues).optional(),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;

/** Roles con acceso al panel admin (operación). Única fuente para front y back. */
export const ADMIN_ROLES = ["admin", "staff"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

/** True si el rol puede acceder al panel admin. */
export function isAdminRole(role: string | null | undefined): boolean {
  return role != null && (ADMIN_ROLES as readonly string[]).includes(role);
}
