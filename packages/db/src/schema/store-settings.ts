import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Ajustes del negocio (tabla singleton). Siempre una única fila con `id = 'default'`.
 * Los datos que aparecen en el recibo (nombre, teléfono, dirección, email, nota
 * al pie). Un negocio sin configurar renderiza con `businessName = 'Avanzar'` y el
 * resto vacío. La fila se crea en el primer PATCH (upsert); no hay seed.
 */
export const storeSettings = pgTable("store_settings", {
  id: text("id").primaryKey().default("default"),
  businessName: text("business_name").notNull().default("Avanzar"),
  phone: text("phone"),
  address: text("address"),
  email: text("email"),
  receiptNote: text("receipt_note"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
