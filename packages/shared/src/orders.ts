import { orderStatus } from "@avanzar/db/schema";
import { z } from "zod";

/** Body de PATCH /admin/orders/:id/status. No hay `note` en V1 (la tabla no la tiene). */
export const updateOrderStatusSchema = z.object({
  status: z.enum(orderStatus.enumValues),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
