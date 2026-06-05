import { db } from "@avanzar/db";
import { shippingRates } from "@avanzar/db/schema";
import { shippingRateQuerySchema } from "@avanzar/shared";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { parseQuery } from "../../../lib/validate";

/** Tarifa de envío para (provincia, moneda). Devuelve 1 match o 404. */
export const shippingRatesRouter = new Hono();

// GET /api/v1/shipping-rates?province=&currency=
shippingRatesRouter.get("/", async (c) => {
  const parsed = parseQuery(c, shippingRateQuerySchema);
  if (!parsed.ok) return parsed.response;
  const { province, currency } = parsed.data;

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
