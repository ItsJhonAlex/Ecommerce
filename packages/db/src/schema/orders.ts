import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { products } from "./catalog";
import { fulfillmentMethod, orderStatus } from "./enums";

/**
 * Pedido. Acá vive la distinción comprador ≠ destinatario.
 * - El comprador (quien paga, quizá en el exterior) va en snapshot.
 * - El destinatario (quien recibe en Cuba) va COPIADO en la orden, no como FK a
 *   addresses, para que el historial sea inmutable aunque se edite la libreta.
 * - `userId` es nullable: permite checkout como invitado.
 * - Toda la orden en una sola `currency`.
 */
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: text("order_number").notNull().unique(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  status: orderStatus("status").notNull().default("pending_payment"),
  fulfillment: fulfillmentMethod("fulfillment").notNull().default("delivery"),
  currency: text("currency").notNull(),

  // Comprador (snapshot) — quien paga.
  buyerName: text("buyer_name").notNull(),
  buyerEmail: text("buyer_email").notNull(),
  buyerPhone: text("buyer_phone").notNull(),

  // Destinatario (snapshot inmutable) — quien recibe en Cuba.
  shipRecipient: text("ship_recipient").notNull(),
  shipPhone: text("ship_phone").notNull(),
  shipProvince: text("ship_province"),
  shipMunicipality: text("ship_municipality"),
  shipAddressLine: text("ship_address_line"),
  shipReference: text("ship_reference"),

  // Montos en centavos.
  subtotalMinor: integer("subtotal_minor").notNull(),
  shippingMinor: integer("shipping_minor").notNull().default(0),
  discountMinor: integer("discount_minor").notNull().default(0),
  totalMinor: integer("total_minor").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Líneas del pedido. `productName` y `unitAmountMinor` van en snapshot del
 * momento de la compra: si el producto cambia de precio o se archiva, la orden
 * no se altera. `productId` es soft-reference (set null) por la misma razón.
 */
export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  productName: text("product_name").notNull(),
  unitAmountMinor: integer("unit_amount_minor").notNull(),
  quantity: integer("quantity").notNull(),
  lineTotalMinor: integer("line_total_minor").notNull(),
});

/** Auditoría de cada cambio de estado. Esencial para el flujo manual. */
export const orderStatusHistory = pgTable("order_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  status: orderStatus("status").notNull(),
  changedBy: text("changed_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
