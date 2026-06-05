import { paymentMethod } from "@avanzar/db/schema";
import { z } from "zod";

/**
 * Payload del checkout: lo que envía el storefront. El server NO confía en
 * precios/snapshots del cliente — solo recibe productId + cantidad y calcula
 * unit_amount_minor, line_total y totales del lado servidor.
 */
export const checkoutItemSchema = z.object({
  productId: z.uuid(),
  quantity: z.number().int().positive(),
});

export const checkoutSchema = z.object({
  currency: z.string().length(3), // ISO 4217 (USD, CUP, ...)
  // Comprador (quien paga).
  buyer: z.object({
    name: z.string().min(1),
    email: z.email(),
    phone: z.string().min(1),
  }),
  // Destinatario (quien recibe en Cuba).
  recipient: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    province: z.string().min(1),
    municipality: z.string().min(1),
    addressLine: z.string().min(1),
    reference: z.string().optional(),
  }),
  items: z.array(checkoutItemSchema).min(1),
  payment: z.object({
    method: z.enum(paymentMethod.enumValues),
  }),
});

export type CheckoutItemInput = z.infer<typeof checkoutItemSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
