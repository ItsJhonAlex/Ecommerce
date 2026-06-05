import { shippingRates } from "@avanzar/db/schema";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const shippingRateSelectSchema = createSelectSchema(shippingRates);

/** Body para crear una tarifa de envío (el id lo pone la DB). */
export const shippingRateInsertSchema = createInsertSchema(shippingRates).omit({
  id: true,
});

/** Query de GET /shipping-rates (público). */
export const shippingRateQuerySchema = z.object({
  province: z.string().min(1),
  currency: z.string().length(3),
});

export type ShippingRate = z.infer<typeof shippingRateSelectSchema>;
export type ShippingRateInput = z.infer<typeof shippingRateInsertSchema>;
export type ShippingRateQuery = z.infer<typeof shippingRateQuerySchema>;
