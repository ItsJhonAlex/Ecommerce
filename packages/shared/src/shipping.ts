import { shippingRates } from "@avanzar/db/schema";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const shippingRateSelectSchema = createSelectSchema(shippingRates);

/** Body para crear una tarifa de envío (el id lo pone la DB). */
export const shippingRateInsertSchema = createInsertSchema(shippingRates).omit({
  id: true,
});

/** Query de GET /shipping-rates (modo puntual): province + currency requeridos. */
export const shippingRateQuerySchema = z.object({
  province: z.string().min(1),
  currency: z.string().length(3),
});

/**
 * Query de GET /shipping-rates (público). `province` opcional: si viene, modo
 * puntual (una tarifa o 404); si no, modo lista (todas las activas de la moneda).
 */
export const shippingRatePublicQuerySchema = z.object({
  province: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().min(1).optional(),
  ),
  currency: z.string().length(3),
});

export type ShippingRate = z.infer<typeof shippingRateSelectSchema>;
export type ShippingRateInput = z.infer<typeof shippingRateInsertSchema>;
export type ShippingRateQuery = z.infer<typeof shippingRateQuerySchema>;
export type ShippingRatePublicQuery = z.infer<
  typeof shippingRatePublicQuerySchema
>;

/** Provincias de Cuba (lista canónica para el dropdown de tarifas de envío). */
export const CUBA_PROVINCES = [
  "Pinar del Río",
  "Artemisa",
  "La Habana",
  "Mayabeque",
  "Matanzas",
  "Cienfuegos",
  "Villa Clara",
  "Sancti Spíritus",
  "Ciego de Ávila",
  "Camagüey",
  "Las Tunas",
  "Holguín",
  "Granma",
  "Santiago de Cuba",
  "Guantánamo",
  "Isla de la Juventud",
] as const;
