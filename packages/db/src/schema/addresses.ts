import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Libreta de direcciones del usuario. Estructura geográfica cubana
 * (provincia / municipio). El teléfono es dato clave para coordinar la entrega.
 * Ojo: las órdenes NO referencian esto por FK — copian el destinatario en snapshot.
 */
export const addresses = pgTable("addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  recipientName: text("recipient_name").notNull(),
  phone: text("phone").notNull(),
  province: text("province").notNull(),
  municipality: text("municipality").notNull(),
  addressLine: text("address_line").notNull(),
  reference: text("reference"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
