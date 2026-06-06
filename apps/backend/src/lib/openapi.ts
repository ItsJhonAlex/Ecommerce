import {
  addressInsertSchema,
  categoryInsertSchema,
  checkoutSchema,
  confirmPaymentSchema,
  linkCategorySchema,
  productImageInsertSchema,
  productInsertSchema,
  productPriceInsertSchema,
  shippingRateInsertSchema,
  updateOrderStatusSchema,
  updateUserRoleSchema,
} from "@avanzar/shared";
import { z } from "zod";

/** Referencia a un componente de schema. */
function ref(name: string) {
  return { $ref: `#/components/schemas/${name}` };
}

/** Body JSON requerido apuntando a un componente. */
function jsonBody(name: string) {
  return {
    required: true,
    content: { "application/json": { schema: ref(name) } },
  };
}

const ok = { description: "OK" };
const created = { description: "Creado" };
const noContent = { description: "Sin contenido" };
const badRequest = { description: "Validación fallida" };
const unauthorized = { description: "No autenticado" };
const forbidden = { description: "Sin permiso" };
const notFound = { description: "No encontrado" };

/**
 * Arma el documento OpenAPI 3.1 de la API v1. Los modelos salen de los schemas
 * Zod (única fuente de verdad); los paths se describen acá a mano.
 */
export function buildOpenApiDocument() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Avanzar API",
      version: "1.0.0",
      description:
        "API del e-commerce Avanzar. Rutas públicas (storefront) y admin (panel).",
    },
    servers: [{ url: "/api/v1" }],
    components: {
      securitySchemes: {
        sessionCookie: { type: "apiKey", in: "cookie", name: "better-auth.session_token" },
      },
      schemas: {
        Checkout: z.toJSONSchema(checkoutSchema),
        ProductInsert: z.toJSONSchema(productInsertSchema),
        ProductPriceInsert: z.toJSONSchema(productPriceInsertSchema),
        ProductImageInsert: z.toJSONSchema(productImageInsertSchema),
        CategoryInsert: z.toJSONSchema(categoryInsertSchema),
        LinkCategory: z.toJSONSchema(linkCategorySchema),
        AddressInsert: z.toJSONSchema(addressInsertSchema),
        UpdateOrderStatus: z.toJSONSchema(updateOrderStatusSchema),
        ConfirmPayment: z.toJSONSchema(confirmPaymentSchema),
        ShippingRateInsert: z.toJSONSchema(shippingRateInsertSchema),
        UpdateUserRole: z.toJSONSchema(updateUserRoleSchema),
      },
    },
    paths: {
      "/products": {
        get: { tags: ["público"], summary: "Listar productos activos", responses: { 200: ok } },
      },
      "/products/{slug}": {
        get: {
          tags: ["público"],
          summary: "Detalle de producto por slug",
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: ok, 404: notFound },
        },
      },
      "/categories": {
        get: { tags: ["público"], summary: "Listar categorías", responses: { 200: ok } },
      },
      "/shipping-rates": {
        get: {
          tags: ["público"],
          summary: "Tarifa de envío por provincia y moneda",
          parameters: [
            { name: "province", in: "query", required: true, schema: { type: "string" } },
            { name: "currency", in: "query", required: true, schema: { type: "string" } },
          ],
          responses: { 200: ok, 400: badRequest, 404: notFound },
        },
      },
      "/checkout": {
        post: {
          tags: ["público"],
          summary: "Crear orden (checkout). Permite invitado.",
          requestBody: jsonBody("Checkout"),
          responses: { 201: created, 400: badRequest, 422: { description: "Regla de negocio (stock/envío/precio)" } },
        },
      },
      "/addresses": {
        get: { tags: ["cuenta"], summary: "Direcciones del usuario", security: [{ sessionCookie: [] }], responses: { 200: ok, 401: unauthorized } },
        post: { tags: ["cuenta"], summary: "Crear dirección", security: [{ sessionCookie: [] }], requestBody: jsonBody("AddressInsert"), responses: { 201: created, 400: badRequest, 401: unauthorized } },
      },
      "/addresses/{id}": {
        get: { tags: ["cuenta"], summary: "Detalle de dirección", security: [{ sessionCookie: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: ok, 401: unauthorized, 404: notFound } },
        patch: { tags: ["cuenta"], summary: "Actualizar dirección", security: [{ sessionCookie: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: jsonBody("AddressInsert"), responses: { 200: ok, 400: badRequest, 401: unauthorized, 404: notFound } },
        delete: { tags: ["cuenta"], summary: "Eliminar dirección", security: [{ sessionCookie: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 204: noContent, 401: unauthorized, 404: notFound } },
      },
      "/orders": {
        get: { tags: ["cuenta"], summary: "Pedidos del usuario", security: [{ sessionCookie: [] }], responses: { 200: ok, 401: unauthorized } },
      },
      "/orders/{id}": {
        get: { tags: ["cuenta"], summary: "Detalle de pedido", security: [{ sessionCookie: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: ok, 401: unauthorized, 404: notFound } },
      },
      "/admin/products": {
        get: { tags: ["admin"], summary: "Listar productos (todos los estados)", security: [{ sessionCookie: [] }], responses: { 200: ok, 401: unauthorized, 403: forbidden } },
        post: { tags: ["admin"], summary: "Crear producto", security: [{ sessionCookie: [] }], requestBody: jsonBody("ProductInsert"), responses: { 201: created, 400: badRequest, 401: unauthorized, 403: forbidden } },
      },
      "/admin/products/{id}": {
        get: { tags: ["admin"], summary: "Detalle de producto", security: [{ sessionCookie: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: ok, 401: unauthorized, 403: forbidden, 404: notFound } },
        patch: { tags: ["admin"], summary: "Actualizar producto", security: [{ sessionCookie: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: jsonBody("ProductInsert"), responses: { 200: ok, 400: badRequest, 401: unauthorized, 403: forbidden, 404: notFound } },
      },
      "/admin/products/{id}/archive": {
        post: { tags: ["admin"], summary: "Archivar producto (soft delete)", security: [{ sessionCookie: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: ok, 401: unauthorized, 403: forbidden, 404: notFound } },
      },
      "/admin/products/{id}/prices": {
        post: { tags: ["admin"], summary: "Agregar precio", security: [{ sessionCookie: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: jsonBody("ProductPriceInsert"), responses: { 201: created, 400: badRequest, 401: unauthorized, 403: forbidden } },
      },
      "/admin/products/{id}/images": {
        post: { tags: ["admin"], summary: "Agregar imagen", security: [{ sessionCookie: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: jsonBody("ProductImageInsert"), responses: { 201: created, 400: badRequest, 401: unauthorized, 403: forbidden } },
      },
      "/admin/products/{id}/categories": {
        post: { tags: ["admin"], summary: "Vincular categoría", security: [{ sessionCookie: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: jsonBody("LinkCategory"), responses: { 201: created, 400: badRequest, 401: unauthorized, 403: forbidden } },
      },
      "/admin/categories": {
        get: { tags: ["admin"], summary: "Listar categorías", security: [{ sessionCookie: [] }], responses: { 200: ok, 401: unauthorized, 403: forbidden } },
        post: { tags: ["admin"], summary: "Crear categoría", security: [{ sessionCookie: [] }], requestBody: jsonBody("CategoryInsert"), responses: { 201: created, 400: badRequest, 401: unauthorized, 403: forbidden } },
      },
      "/admin/orders": {
        get: { tags: ["admin"], summary: "Listar pedidos (filtro ?status=)", security: [{ sessionCookie: [] }], parameters: [{ name: "status", in: "query", required: false, schema: { type: "string" } }], responses: { 200: ok, 401: unauthorized, 403: forbidden } },
      },
      "/admin/orders/{id}/status": {
        patch: { tags: ["admin"], summary: "Cambiar estado (máquina de estados)", security: [{ sessionCookie: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: jsonBody("UpdateOrderStatus"), responses: { 200: ok, 400: badRequest, 401: unauthorized, 403: forbidden, 404: notFound, 409: { description: "Mismo estado" }, 422: { description: "Transición inválida" } } },
      },
      "/admin/payments": {
        get: { tags: ["admin"], summary: "Listar pagos (filtro ?status=)", security: [{ sessionCookie: [] }], parameters: [{ name: "status", in: "query", required: false, schema: { type: "string" } }], responses: { 200: ok, 401: unauthorized, 403: forbidden } },
      },
      "/admin/payments/{id}/confirm": {
        patch: { tags: ["admin"], summary: "Confirmar pago (promueve orden a paid)", security: [{ sessionCookie: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: jsonBody("ConfirmPayment"), responses: { 200: ok, 400: badRequest, 401: unauthorized, 403: forbidden, 404: notFound, 409: { description: "Pago no pendiente" } } },
      },
      "/admin/shipping-rates": {
        get: { tags: ["admin"], summary: "Listar tarifas", security: [{ sessionCookie: [] }], responses: { 200: ok, 401: unauthorized, 403: forbidden } },
        post: { tags: ["admin"], summary: "Crear tarifa", security: [{ sessionCookie: [] }], requestBody: jsonBody("ShippingRateInsert"), responses: { 201: created, 400: badRequest, 401: unauthorized, 403: forbidden } },
      },
      "/admin/users": {
        get: { tags: ["admin"], summary: "Listar usuarios (filtro ?role=)", security: [{ sessionCookie: [] }], parameters: [{ name: "role", in: "query", required: false, schema: { type: "string" } }], responses: { 200: ok, 401: unauthorized, 403: forbidden } },
      },
      "/admin/users/{id}/role": {
        patch: { tags: ["admin"], summary: "Cambiar rol (con guard anti auto-degradación)", security: [{ sessionCookie: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: jsonBody("UpdateUserRole"), responses: { 200: ok, 400: badRequest, 401: unauthorized, 403: forbidden, 404: notFound, 422: { description: "No podés quitarte tu propio rol de admin" } } },
      },
    },
  };
}
