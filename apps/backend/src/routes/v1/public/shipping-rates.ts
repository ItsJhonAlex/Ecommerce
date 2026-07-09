import { db } from "@avanzar/db";
import { shippingRates } from "@avanzar/db/schema";
import { shippingRatePublicQuerySchema } from "@avanzar/shared";
import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { parseQuery } from "../../../lib/validate";

/**
 * Tarifas de envío públicas. Con `province` → 1 tarifa (o 404); sin `province`
 * → lista de todas las activas de la moneda pedida.
 */
export const shippingRatesRouter = new Hono();

// GET /api/v1/shipping-rates?currency=USD[&province=Habana]
shippingRatesRouter.get("/", async (c) => {
  const parsed = parseQuery(c, shippingRatePublicQuerySchema);
  if (!parsed.ok) return parsed.response;
  const { province, currency } = parsed.data;

  // Modo lista: solo moneda → todas las activas, ordenadas por provincia.
  if (province === undefined) {
    const rates = await db
      .select()
      .from(shippingRates)
      .where(
        and(
          eq(shippingRates.currency, currency),
          eq(shippingRates.active, true),
        ),
      )
      .orderBy(asc(shippingRates.province));
    return c.json({ shippingRates: rates });
  }

  // Modo puntual: (provincia, moneda) → una tarifa o 404.
  const [rate] = await db
    .select()
    .from(shippingRates)
    .where(
      and(
        eq(shippingRates.province, province),
        eq(shippingRates.currency, currency),
        eq(shippingRates.active, true),
      ),
    )
    .limit(1);

  if (!rate) return c.json({ error: "Sin tarifa para ese destino" }, 404);
  return c.json({ shippingRate: rate });
});
