import { z } from "zod";

/** Body de PATCH /admin/payments/:id/confirm. `reference` = nº de Zelle/transferencia. */
export const confirmPaymentSchema = z.object({
  reference: z.string().min(1),
});

export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;
