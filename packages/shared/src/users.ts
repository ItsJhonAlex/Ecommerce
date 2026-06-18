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
