import { Hono } from "hono";
import { productsRouter } from "./products";

/**
 * Router de la API v1. Se monta en app.route("/api/v1", v1).
 * Cada recurso es un sub-router montado acá.
 */
export const v1 = new Hono();

v1.route("/products", productsRouter);
