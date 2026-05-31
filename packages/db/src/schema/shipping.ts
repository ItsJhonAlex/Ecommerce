import { boolean, integer, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";

/**
 * Tabla de lookup para calcular el costo de envío por provincia destino.
 * Sin FK (es referencia). Si preferís simpleza, podés ignorarla y setear
 * `orders.shippingMinor` a mano en cada orden.
 */
export const shippingRates = pgTable(
  "shipping_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    province: text("province").notNull(),
    currency: text("currency").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    active: boolean("active").notNull().default(true),
  },
  (t) => [unique("shipping_rates_province_currency_uq").on(t.province, t.currency)],
);
