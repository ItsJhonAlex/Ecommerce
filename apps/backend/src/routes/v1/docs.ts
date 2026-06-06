import { swaggerUI } from "@hono/swagger-ui";
import { Hono } from "hono";
import { buildOpenApiDocument } from "../../lib/openapi";

/**
 * Documentación de la API: el JSON OpenAPI y la UI de Swagger. Público (solo docs).
 * Se monta en la raíz de v1, antes de los routers público/admin.
 */
export const docsRouter = new Hono();

// El documento no cambia en runtime (los schemas son estáticos): se arma una vez.
const openApiDocument = buildOpenApiDocument();

// GET /api/v1/openapi.json
docsRouter.get("/openapi.json", (c) => c.json(openApiDocument));

// GET /api/v1/docs
docsRouter.get("/docs", swaggerUI({ url: "/api/v1/openapi.json" }));
