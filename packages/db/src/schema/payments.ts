import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { orders } from "./orders";
import { paymentMethod, paymentStatus } from "./enums";

/**
 * El corazón del flujo de confirmación manual.
 * Ciclo: orden creada → pago `pending` → el admin verifica que entró →
 * `confirmed` → la orden pasa a `paid`.
 * `reference` = nº de confirmación de Zelle/transferencia que aporta el comprador.
 */
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  method: paymentMethod("method").notNull(),
  status: paymentStatus("status").notNull().default("pending"),
  amountMinor: integer("amount_minor").notNull(),
  currency: text("currency").notNull(),
  reference: text("reference"),
  confirmedBy: text("confirmed_by").references(() => user.id, {
    onDelete: "set null",
  }),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
