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

/** Body de POST /orders/claim: reclama un pedido de invitado por su token de seguimiento. */
export const orderClaimSchema = z.object({
  token: z.uuid(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;
export type OrderClaimInput = z.infer<typeof orderClaimSchema>;
