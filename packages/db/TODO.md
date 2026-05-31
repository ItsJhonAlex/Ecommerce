# Roadmap del esquema de datos

## V1.0 — actual

Auth (Better Auth: `user`, `session`, `account`, `verification` + campo `role`),
catálogo (`products`, `product_prices`, `product_images`, `categories`,
`product_categories`), `addresses`, pedidos (`orders`, `order_items`,
`order_status_history`), `payments` y `shipping_rates` (lookup).

Decisiones clave:

- **IDs de auth en `text`** (default de Better Auth); las FKs a `user.id` son `text`.
- **`orders.user_id` nullable** → checkout como invitado.
- **Destinatario copiado en la orden** (snapshot), no FK a `addresses` → historial inmutable.
- **`order_items`** guarda `product_name` y `unit_amount_minor` en snapshot.
- **Archivado = borrado lógico** (`products.status = 'archived'`), nunca hard delete.
- **Montos en centavos** (`*_minor`, enteros) y una sola moneda por orden.

---

## V2.0 — futuras features (fuera de v1 a propósito)

### Variantes de producto (talle / color)
Mueven precio y stock al nivel de variante. Es una migración contenida:
nueva tabla `product_variants` (sku, atributos), y `product_prices` / `stock` y
`order_items.variant_id` pasan a apuntar a la variante.
**Cuándo:** solo si el inventario realmente lo pide.

### Cupones / descuentos
Módulo aparte (`coupons`, `coupon_redemptions`) con reglas de validez, tope de
uso y aplicación a `orders.discount_minor`.
**Cuándo:** cuando se necesite promocionar.

### Carrito persistido en DB
En v1 el carrito vive del lado del cliente; la orden nace recién en el checkout.
V2: tablas `carts` / `cart_items` para persistir y recuperar entre dispositivos.

### Inventario multi-almacén y reservas de stock
En v1 se decrementa stock al confirmar el pago; las condiciones de carrera del
carrito quedan para v2 (reservas con expiración, `warehouses`, `stock_movements`).

### Reseñas y wishlists
`product_reviews` (rating + texto, moderación) y `wishlists` / `wishlist_items`.

---

## Notas de migración

- Generar SQL: `bun run db:generate` (desde la raíz)
- Aplicar: `bun run db:migrate`
- Empujar sin migración (dev): `bun run db:push`
- Inspeccionar: `bun run db:studio`
