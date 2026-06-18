import { orderStatus } from "@avanzar/db/schema";
import { z } from "zod";

/** Body de PATCH /admin/orders/:id/status. No hay `note` en V1 (la tabla no la tiene). */
export const updateOrderStatusSchema = z.object({
  status: z.enum(orderStatus.enumValues),
});

/** Query de GET /admin/orders. El filtro de estado es opcional pero validado. */
export const orderListQuerySchema = z.object({
  status: z.enum(orderStatus.enumValues).optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;
