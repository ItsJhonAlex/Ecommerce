# CRUDs V1 — Diseño

Fecha: 2026-06-03
Alcance: Implementar todos los CRUDs de los módulos de V1.0 (catalog, addresses, orders, payments, shipping, users) bajo `/api/v1/`, con split público/admin y guards de auth desde el día 1. Incluye `POST /api/v1/checkout` (transacción).

## Decisiones de alto nivel

- **Audiencia**: split `public/` (storefront/cliente) vs `admin/` (panel staff).
- **Auth**: middlewares `requireSession` y `requireAdmin` aplicados desde el inicio. `admin/*` queda protegido al nivel del sub-router; público lo aplica caso por caso.
- **Listas**: mínimo viable. Sin paginación general; solo `/admin/orders` y `/admin/payments` aceptan `?status=`.
- **Validación**: `@hono/zod-validator` con schemas de `@avanzar/shared`. Schemas nuevos (update status, confirm payment) se agregan al package, no inline.
- **Soft delete**: `DELETE` de producto = `status='archived'`. Nunca hard delete.
- **Stock**: no se reserva en V1 (no existe inventario). Va a TODO.

## 1. Estructura de carpetas

```
apps/backend/src/
├── auth.ts
├── index.ts
├── middlewares/
│   └── auth.ts             # requireSession, requireAdmin
├── lib/
│   └── responses.ts        # helpers json/error consistentes
└── routes/
    └── v1/
        ├── index.ts        # monta public + admin
        ├── public/
        │   ├── index.ts
        │   ├── products.ts        # GET /, GET /:slug  (mover el actual)
        │   ├── categories.ts      # GET / (flat con parent_id)
        │   ├── shipping-rates.ts  # GET ?province=&currency= (1 match o 404)
        │   ├── addresses.ts       # CRUD del dueño (requireSession)
        │   ├── orders.ts          # GET mías, GET /:id mía (requireSession)
        │   └── checkout.ts        # POST / (transacción)
        └── admin/
            ├── index.ts           # admin.use("*", requireAdmin)
            ├── products.ts        # CRUD + sub-rutas prices/images/categories
            ├── categories.ts      # CRUD
            ├── orders.ts          # GET ?status, GET /:id, PATCH /:id/status
            ├── payments.ts        # GET ?status, GET /:id, PATCH /:id/confirm
            ├── shipping-rates.ts  # CRUD
            └── users.ts           # GET /, PATCH /:id/role
```

Sub-recursos de producto (`prices`, `images`, `product_categories`) viven anidados dentro de `admin/products.ts` para no fragmentar archivos chicos. Si crecen se extraen.

## 2. Middlewares de auth (`src/middlewares/auth.ts`)

```ts
import { auth } from "../auth";
import { createMiddleware } from "hono/factory";

type SessionUser = typeof auth.$Infer.Session.user;
type SessionData = typeof auth.$Infer.Session.session;

type AuthEnv = { Variables: { user: SessionUser; session: SessionData } };

export const requireSession = createMiddleware<AuthEnv>(async (c, next) => {
  const result = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!result) return c.json({ error: "No autenticado" }, 401);
  c.set("user", result.user);
  c.set("session", result.session);
  await next();
});

const ADMIN_ROLES = new Set(["admin", "staff"]);

export const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  const result = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!result) return c.json({ error: "No autenticado" }, 401);
  if (!ADMIN_ROLES.has(result.user.role ?? "")) {
    return c.json({ error: "Acceso denegado" }, 403);
  }
  c.set("user", result.user);
  c.set("session", result.session);
  await next();
});
```

Routers que necesitan tipos en `c.var.user` se declaran como `new Hono<AuthEnv>()`.

## 3. Validación

- Usar `@hono/zod-validator` (`zValidator("json", schema)`, `zValidator("query", schema)`, `zValidator("param", schema)`).
- Reusar `@avanzar/shared`:
  - `productInsertSchema`, `productPriceInsertSchema`, `productImageInsertSchema`, `categoryInsertSchema`, `addressInsertSchema`, `checkoutSchema`.
- Schemas a **agregar** en `packages/shared/src/`:
  - `orders.ts`:
    - `updateOrderStatusSchema = z.object({ status: z.enum(orderStatusValues) })` — sin `note` (la tabla `order_status_history` no tiene esa columna en V1).
  - `payments.ts`:
    - `confirmPaymentSchema = z.object({ reference: z.string().min(1) })`
  - `shipping.ts`:
    - `shippingRateInsertSchema` (derivado de la tabla, omit id)
    - `shippingRateQuerySchema = z.object({ province: z.string(), currency: z.string().length(3) })`
  - `users.ts`:
    - `updateUserRoleSchema = z.object({ role: z.enum(["customer", "staff", "admin"]) })`

Para PATCH endpoints: usar `<insertSchema>.partial()` directamente en la ruta.

## 4. Endpoints público (`/api/v1/...`)

| Recurso | Método | Path | Guard |
|---|---|---|---|
| products | GET | `/products` | — |
| products | GET | `/products/:slug` | — |
| categories | GET | `/categories` | — (flat list con `parent_id`; el cliente arma el árbol) |
| shipping-rates | GET | `/shipping-rates?province=&currency=` | — (devuelve 1 match o 404; unique en DB) |
| addresses | GET | `/addresses` | requireSession |
| addresses | GET | `/addresses/:id` | requireSession |
| addresses | POST | `/addresses` | requireSession |
| addresses | PATCH | `/addresses/:id` | requireSession |
| addresses | DELETE | `/addresses/:id` | requireSession |
| orders | GET | `/orders` | requireSession |
| orders | GET | `/orders/:id` | requireSession |
| checkout | POST | `/checkout` | opcional (guest permitido) |

Reglas:
- `addresses`: todos los queries filtran por `user_id = c.var.user.id`. PATCH/DELETE sobre id ajeno → `404` (no `403`, para no filtrar existencia).
- `orders` público: filtra por `user_id = c.var.user.id`. Guest orders no son consultables (no hay usuario).
- `checkout` lee la sesión opcionalmente: si existe, `order.user_id = session.user.id`. Si no, queda `null` (guest).

## 5. Endpoints admin (`/api/v1/admin/...`, todos `requireAdmin`)

### products
- `GET /products?status=&q=` — todos los status (active, draft, archived). `?q` es búsqueda opcional por `name ilike '%q%'`.
- `GET /products/:id` (por id, no slug; muestra todo).
- `POST /products` — body: `productInsertSchema`.
- `PATCH /products/:id` — body: `productInsertSchema.partial()`.
- `POST /products/:id/archive` — set `status='archived'`. Idempotente.

### products → prices (nested)
- `POST /products/:id/prices` — body: `productPriceInsertSchema.omit({ productId: true })`.
- `PATCH /products/:id/prices/:priceId` — body: `productPriceInsertSchema.partial()`.
- `DELETE /products/:id/prices/:priceId`.

### products → images (nested)
- `POST /products/:id/images` — body: `productImageInsertSchema.omit({ productId: true })`.
- `PATCH /products/:id/images/:imageId`.
- `DELETE /products/:id/images/:imageId`.

### products → categories (link table)
- `POST /products/:id/categories` — body: `{ categoryId: string }`. Insert en `product_categories`.
- `DELETE /products/:id/categories/:categoryId`.

### categories
- `GET /categories` — full list (incl. soft-deleted si aplica; V1 no tiene soft-delete en categories).
- `POST /categories` — body: `categoryInsertSchema`.
- `PATCH /categories/:id` — body: `categoryInsertSchema.partial()`.
- `DELETE /categories/:id` — hard delete. FK `product_categories` con `ON DELETE CASCADE` ya lo cubre.

### orders
- `GET /orders?status=` — orden por `created_at desc`. Filtro opcional `?status`. Sin paginación (acordado en el brainstorm — agregar si crece).
- `GET /orders/:id` — con items + status_history + payment.
- `PATCH /orders/:id/status` — body: `updateOrderStatusSchema`. Dentro de una transacción:
  1. UPDATE `orders.status` + `updated_at`.
  2. INSERT `order_status_history` (`order_id`, `status` = nuevo status, `changed_by` = `c.var.user.id`).
  - Valida que el nuevo status sea distinto del actual (409 si no).

### payments
- `GET /payments?status=` — orden por `created_at desc`.
- `GET /payments/:id`.
- `PATCH /payments/:id/confirm` — body: `confirmPaymentSchema`. Dentro de una transacción:
  1. Valida que `payment.status === 'pending'` (409 si no).
  2. UPDATE `payments` set `status='confirmed'`, `confirmed_by=c.var.user.id`, `reference=body.reference`, `confirmed_at=now()`.
  3. Si la orden está en `pending_payment`: UPDATE `orders.status='paid'` + `updated_at=now()` + INSERT `order_status_history` (`status='paid'`, `changed_by=c.var.user.id`). Si ya está en otro estado, no la toca.

### shipping-rates
- `GET /shipping-rates` — full list.
- `POST /shipping-rates` — body: `shippingRateInsertSchema`.
- `PATCH /shipping-rates/:id` — body: `shippingRateInsertSchema.partial()`.
- `DELETE /shipping-rates/:id`.

### users
- `GET /users?role=` — list users. Expone solo: `id, name, email, role, emailVerified, image, createdAt`. NO expone columnas internas de Better Auth (`hashedPassword` si Better Auth la tuviera, tokens, etc.). Se hace con `db.select({ ... })` explícito, no `findMany`.
- `PATCH /users/:id/role` — body: `updateUserRoleSchema`. Bloquea auto-degradación: si `:id === c.var.user.id` y nuevo role ≠ admin, devolver 422.

## 6. Checkout (`POST /api/v1/checkout`)

Body: `checkoutSchema`. Hay que **ampliarlo** en `packages/shared/src/checkout.ts` para incluir el método de pago elegido: `payment: { method: z.enum(["cod", "transfer_local", "zelle"]) }`. La forma final queda `{ currency, buyer, recipient, items: [{ productId, quantity }], payment: { method } }`.

Flujo dentro de `db.transaction(async tx => ...)`:

1. Cargar productos referenciados: `tx.query.products.findMany({ where: inArray(products.id, productIds) })` con `prices`. Para cada item:
   - Validar `product.status === 'active'` → si no, 422 con `{ code: "PRODUCT_NOT_AVAILABLE", productId }`.
   - Localizar `price` matching `currency` → si no existe, 422 con `{ code: "PRICE_NOT_AVAILABLE", productId, currency }`.
2. Lookup `shipping_rates` por (`recipient.province`, `currency`). Si no hay tarifa, 422 con `{ code: "SHIPPING_NOT_SUPPORTED" }`. Tomar `amount_minor`.
3. Calcular:
   - `line_total_minor[i] = price.amountMinor × item.quantity`.
   - `subtotal_minor = Σ line_total_minor`.
   - `shipping_minor = shippingRate.amountMinor`.
   - `discount_minor = 0` (V1 sin cupones).
   - `total_minor = subtotal_minor + shipping_minor - discount_minor`.
4. Generar `order_number` legible (ej. `AVZ-YYYYMMDD-XXXX` con sufijo random; debe ser único — reintento en caso del 23505 raro).
5. INSERT `orders`:
   - `order_number`, `user_id` = session.user.id ?? null.
   - `buyer_name/email/phone` ← snapshot de `buyer`.
   - `ship_recipient` ← `recipient.name`; `ship_phone/province/municipality/address_line/reference` ← `recipient`.
   - `currency`, `subtotal_minor`, `shipping_minor`, `discount_minor=0`, `total_minor`, `status='pending_payment'`.
6. INSERT `order_items` por cada item: `product_id`, `product_name` (snapshot), `unit_amount_minor` (snapshot), `quantity`, `line_total_minor`.
7. INSERT `order_status_history` (`status='pending_payment'`, `changed_by` = session.user.id ?? null).
8. INSERT `payments`: `order_id`, `method` (del body), `status='pending'`, `amount_minor=total_minor`, `currency`.
9. Return `201 { order, payment }`.

Cualquier throw en la transacción revierte todo. La función NO hace try/catch genérico — los errores se loguean y propagan; Hono devuelve 500. Los errores esperados (422/409) son returns explícitos via `c.json(..., status)` ANTES de la transacción, no excepciones.

Nota: V1 acepta `method` directamente del body (Zelle/transfer/efectivo en destino). No hay payment provider, la confirmación es manual por admin.

## 7. Respuesta y errores

Convención uniforme (`lib/responses.ts`):

```ts
// Éxitos
{ <recurso>: ... }         // e.g. { product }, { products }
{ order, payment }         // checkout

// Errores
{ error: "<mensaje legible>" }
{ error: "...", code: "PRICE_NOT_AVAILABLE", productId: "..." }  // errores de validación de checkout
```

Codes de status:
- 200 OK lecturas y updates.
- 201 Created para POST de recurso nuevo y checkout.
- 204 No Content para DELETE.
- 400 schema inválido (lo emite zValidator).
- 401 sin sesión.
- 403 sin permisos.
- 404 no existe (o no es del usuario en endpoints scoped).
- 409 conflicto (ej. payment ya confirmado, slug duplicado).
- 422 reglas de negocio (producto archived en checkout, price not available, shipping not supported, autodemote de admin).

## 8. Fuera de alcance (a `packages/db/TODO.md`)

- **Inventory/stock**: no existe en V1. Checkout no reserva. Cuando se implemente, va dentro de la transacción de checkout.
- **Webhooks de pagos**: Zelle/transfer son manuales por diseño.
- **Refunds / cancelaciones**: requieren PATCH status + ajuste de payment + (futuro) reverso de stock.
- **Búsqueda por texto en productos**: hoy solo `ilike`. FTS / pg_trgm para V2.
- **Subida de imágenes**: admin manda URLs ya alojadas. S3/Uploadthing a V2.
- **Coupons, variants, cart persistente, reviews**: ya en TODO de V2.
- **Listing público de orders/payments para guest**: requeriría token de tracking, fuera de alcance.

## 9. Build order sugerido (para el plan de implementación)

1. `lib/responses.ts` + `middlewares/auth.ts` (base sin la cual nada se prueba).
2. Schemas nuevos en `packages/shared` + instalar `@hono/zod-validator`.
3. Mover `routes/v1/products.ts` a `routes/v1/public/products.ts`, crear `public/index.ts`.
4. Resto de público: `categories`, `shipping-rates`, `addresses` (requireSession), `orders` (requireSession).
5. `checkout` (transacción).
6. `admin/index.ts` con `requireAdmin`.
7. Admin por recurso: products → categories → orders → payments → shipping-rates → users.
8. Verificación end-to-end con curl para los flujos críticos (checkout, confirm payment, archive product).
