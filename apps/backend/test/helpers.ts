import { db } from "@avanzar/db";
import { productPrices, products, shippingRates, user } from "@avanzar/db/schema";
import { eq } from "drizzle-orm";
import { app } from "../src/index";
import { __resetRateLimit } from "../src/middlewares/rate-limit";

/** Trunca todas las tablas entre tests para aislarlos. */
export async function resetDb(): Promise<void> {
  // El rate limit del checkout es un Map proceso-local que persiste entre tests
  // del mismo archivo; sin este reset, las suites que crean muchas órdenes
  // (checkout, receipt, admin-orders, track) acumularían hits y pegarían el 429.
  __resetRateLimit();
  // Guard de seguridad: si por algún motivo el preload no reapuntó la conexión
  // (p. ej. correr `bun test test/` desde otro cwd, sin tomar bunfig.toml),
  // abortamos antes de truncar para NO borrar la base de desarrollo.
  if (!process.env.DATABASE_URL?.endsWith("_test")) {
    throw new Error(
      "Seguridad: DATABASE_URL no termina en _test. Abortado para no truncar la base de desarrollo.",
    );
  }
  // CASCADE resuelve el orden de FKs; RESTART IDENTITY limpia secuencias.
  await db.execute(
    `TRUNCATE TABLE
      "order_status_history","order_items","payments","orders",
      "product_categories","product_images","product_prices","products",
      "categories","addresses","shipping_rates",
      "session","account","verification","user"
     RESTART IDENTITY CASCADE`,
  );
}

/** Hace una request in-process a la app Hono. */
export function request(path: string, init?: RequestInit): Promise<Response> {
  return Promise.resolve(app.request(path, init));
}

/** Helper para POST JSON. */
export function postJson(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return Promise.resolve(
    app.request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

/**
 * Registra un usuario vía Better Auth y devuelve la cookie de sesión (solo el par
 * `name=value`, sin atributos) lista para reenviar como header `Cookie`.
 */
export async function signUp(creds: {
  name: string;
  email: string;
  password: string;
}): Promise<{ res: Response; cookie: string }> {
  const res = await postJson("/api/auth/sign-up/email", creds);
  const setCookie = res.headers.get("set-cookie") ?? "";
  const cookie = setCookie.split(";")[0] ?? "";
  return { res, cookie };
}

/** Promueve un usuario existente a admin (por email). */
export async function promoteToAdmin(email: string): Promise<void> {
  await db.update(user).set({ role: "admin" }).where(eq(user.email, email));
}

/** Inserta un producto activo con un precio. Devuelve el producto. */
export async function seedProduct(over: {
  slug?: string;
  name?: string;
  status?: "draft" | "active" | "archived";
  stock?: number;
  currency?: string;
  amountMinor?: number;
} = {}) {
  const {
    slug = "remera-negra",
    name = "Remera negra",
    status = "active",
    stock = 10,
    currency = "USD",
    amountMinor = 1999,
  } = over;
  const [p] = await db
    .insert(products)
    .values({ slug, name, status, stockQuantity: stock })
    .returning();
  if (!p) throw new Error("seedProduct: no se pudo insertar el producto");
  await db.insert(productPrices).values({ productId: p.id, currency, amountMinor });
  return p;
}

/** Inserta una tarifa de envío activa. */
export async function seedShippingRate(over: {
  province?: string;
  currency?: string;
  amountMinor?: number;
} = {}) {
  const { province = "Habana", currency = "USD", amountMinor = 500 } = over;
  const [r] = await db
    .insert(shippingRates)
    .values({ province, currency, amountMinor, active: true })
    .returning();
  if (!r) throw new Error("seedShippingRate: no se pudo insertar la tarifa");
  return r;
}

/** Cuerpo de checkout válido para un producto dado. */
export function checkoutBody(productId: string, quantity = 2) {
  return {
    currency: "USD",
    fulfillment: "delivery" as const,
    buyer: { name: "Ana", email: "ana@example.com", phone: "+1555" },
    recipient: {
      name: "Luis",
      phone: "+53555",
      province: "Habana",
      municipality: "Centro",
      addressLine: "Calle 1 #2",
    },
    items: [{ productId, quantity }],
    payment: { method: "zelle" },
  };
}
