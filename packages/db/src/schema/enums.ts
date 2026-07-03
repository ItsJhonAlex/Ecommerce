import { pgEnum } from "drizzle-orm/pg-core";

/** Rol del usuario. Better Auth lo gestiona como additionalField. */
export const userRole = pgEnum("user_role", ["customer", "staff", "admin"]);

/** Estado del producto. `archived` es el borrado lógico — nunca hard delete. */
export const productStatus = pgEnum("product_status", [
  "draft",
  "active",
  "archived",
]);

/** Ciclo de vida del pedido. */
export const orderStatus = pgEnum("order_status", [
  "pending_payment",
  "paid",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
]);

/** Método de pago. */
export const paymentMethod = pgEnum("payment_method", [
  "cod",
  "transfer_local",
  "zelle",
]);

/** Estado del pago (confirmación manual del admin). */
export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "confirmed",
  "rejected",
]);

/** Método de entrega: retiro en el local o envío a domicilio. */
export const fulfillmentMethod = pgEnum("fulfillment_method", ["pickup", "delivery"]);
