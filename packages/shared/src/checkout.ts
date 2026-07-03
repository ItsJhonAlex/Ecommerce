import { fulfillmentMethod, paymentMethod } from "@avanzar/db/schema";
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

/** Métodos de entrega (para el selector del storefront sin tocar @avanzar/db). */
export const FULFILLMENT_METHODS: readonly (typeof fulfillmentMethod.enumValues)[number][] =
  fulfillmentMethod.enumValues;

export const checkoutSchema = z
  .object({
    currency: z.string().length(3), // ISO 4217 (USD, CUP, ...)
    // Retiro en el local o envío a domicilio.
    fulfillment: z.enum(fulfillmentMethod.enumValues),
    // Comprador (quien paga).
    buyer: z.object({
      name: z.string().min(1),
      email: z.email(),
      phone: z.string().min(1),
    }),
    // Destinatario: en domicilio = quien recibe; en retiro = quien retira.
    // name/phone siempre; dirección solo en domicilio (validado abajo).
    recipient: z.object({
      name: z.string().min(1),
      phone: z.string().min(1),
      province: z.string().min(1).optional(),
      municipality: z.string().min(1).optional(),
      addressLine: z.string().min(1).optional(),
      reference: z.string().optional(),
    }),
    items: z.array(checkoutItemSchema).min(1),
    payment: z.object({
      method: z.enum(paymentMethod.enumValues),
    }),
  })
  .superRefine((data, ctx) => {
    if (data.fulfillment === "delivery") {
      for (const field of ["province", "municipality", "addressLine"] as const) {
        if (!data.recipient[field]) {
          ctx.addIssue({
            code: "custom",
            path: ["recipient", field],
            message: "Requerido para envío a domicilio",
          });
        }
      }
    }
  });

export type CheckoutItemInput = z.infer<typeof checkoutItemSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
