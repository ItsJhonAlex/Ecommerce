import { Hono } from "hono";
import { type AuthEnv, requireAdmin } from "../../../middlewares/auth";
import { adminCategoriesRouter } from "./categories";
import { adminOrdersRouter } from "./orders";
import { adminPaymentsRouter } from "./payments";
import { adminProductsRouter } from "./products";
import { adminSettingsRouter } from "./settings";
import { adminShippingRatesRouter } from "./shipping-rates";
import { adminUsersRouter } from "./users";

/** Rutas de administración. requireAdmin aplica a TODO el sub-árbol. */
export const adminRoutes = new Hono<AuthEnv>();

adminRoutes.use("*", requireAdmin);

adminRoutes.route("/products", adminProductsRouter);
adminRoutes.route("/categories", adminCategoriesRouter);
adminRoutes.route("/orders", adminOrdersRouter);
adminRoutes.route("/payments", adminPaymentsRouter);
adminRoutes.route("/shipping-rates", adminShippingRatesRouter);
adminRoutes.route("/settings", adminSettingsRouter);
adminRoutes.route("/users", adminUsersRouter);
