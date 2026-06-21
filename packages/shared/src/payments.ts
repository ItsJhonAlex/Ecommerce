import { paymentStatus } from "@avanzar/db/schema";
import { z } from "zod";

/** Body de PATCH /admin/payments/:id/confirm. `reference` = nº de Zelle/transferencia. */
export const confirmPaymentSchema = z.object({
  reference: z.string().min(1),
});

/** Query de GET /admin/payments. El filtro de estado es opcional pero validado. */
export const paymentListQuerySchema = z.object({
  status: z.enum(paymentStatus.enumValues).optional(),
});

export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;
export type PaymentListQuery = z.infer<typeof paymentListQuerySchema>;

/** Array de estados de pago (para poblar selects en el front sin tocar @avanzar/db). */
export const PAYMENT_STATUSES: readonly (typeof paymentStatus.enumValues)[number][] =
  paymentStatus.enumValues;
