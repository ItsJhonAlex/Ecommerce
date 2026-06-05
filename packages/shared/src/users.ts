import { userRole } from "@avanzar/db/schema";
import { z } from "zod";

/** Body de PATCH /admin/users/:id/role. */
export const updateUserRoleSchema = z.object({
  role: z.enum(userRole.enumValues),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
