import { Hono } from "hono";
import { addressesRouter } from "./addresses";
import { categoriesRouter } from "./categories";
import { checkoutRouter } from "./checkout";
import { ordersRouter } from "./orders";
import { productsRouter } from "./products";
import { receiptRouter } from "./receipt";
import { shippingRatesRouter } from "./shipping-rates";
import { trackRouter } from "./track";

/** Rutas públicas / del cliente. Las que requieren sesión la exigen internamente. */
export const publicRoutes = new Hono();

publicRoutes.route("/products", productsRouter);
publicRoutes.route("/categories", categoriesRouter);
publicRoutes.route("/shipping-rates", shippingRatesRouter);
publicRoutes.route("/addresses", addressesRouter);
publicRoutes.route("/orders", ordersRouter);
publicRoutes.route("/checkout", checkoutRouter);
publicRoutes.route("/receipt", receiptRouter);
publicRoutes.route("/track", trackRouter);
