import { Hono } from "hono";
import { adminRoutes } from "./admin";
import { publicRoutes } from "./public";

/**
 * Router de la API v1. Se monta en app.route("/api/v1", v1).
 * - publicRoutes: storefront y endpoints del cliente (auth interna donde aplica).
 * - adminRoutes: panel, todo detrás de requireAdmin.
 */
export const v1 = new Hono();

v1.route("/admin", adminRoutes);
v1.route("/", publicRoutes);
