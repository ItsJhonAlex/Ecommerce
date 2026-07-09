import { db } from "@avanzar/db";
import { shippingRates } from "@avanzar/db/schema";
import { beforeEach, describe, expect, test } from "bun:test";
import { request, resetDb, seedShippingRate } from "./helpers";

type Rate = {
  id: string;
  province: string;
  currency: string;
  amountMinor: number;
  active: boolean;
};

beforeEach(async () => {
  await resetDb();
});

/** Inserta una tarifa inactiva (el helper solo crea activas). */
async function seedInactiveRate(province: string, currency: string) {
  await db
    .insert(shippingRates)
    .values({ province, currency, amountMinor: 700, active: false });
}

describe("GET /shipping-rates (público)", () => {
  test("modo lista: ?currency=USD → solo las activas de esa moneda", async () => {
    await seedShippingRate({ province: "Habana", currency: "USD", amountMinor: 500 });
    await seedShippingRate({ province: "Matanzas", currency: "USD", amountMinor: 800 });
    await seedShippingRate({ province: "Habana", currency: "CUP", amountMinor: 120000 });
    await seedInactiveRate("Holguin", "USD");

    const res = await request("/api/v1/shipping-rates?currency=USD");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { shippingRates: Rate[] };
    expect(body.shippingRates).toBeDefined();
    // Solo las 2 activas USD (no la CUP ni la inactiva).
    expect(body.shippingRates).toHaveLength(2);
    const provinces = body.shippingRates.map((r) => r.province);
    expect(provinces).toEqual(["Habana", "Matanzas"]); // ordenadas por provincia
    expect(body.shippingRates.every((r) => r.currency === "USD")).toBe(true);
    expect(body.shippingRates.every((r) => r.active === true)).toBe(true);
  });

  test("modo puntual: ?province=Habana&currency=USD → { shippingRate } (una)", async () => {
    await seedShippingRate({ province: "Habana", currency: "USD", amountMinor: 500 });
    await seedShippingRate({ province: "Matanzas", currency: "USD", amountMinor: 800 });

    const res = await request("/api/v1/shipping-rates?province=Habana&currency=USD");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { shippingRate: Rate };
    expect(body.shippingRate).toBeDefined();
    expect(body.shippingRate.province).toBe("Habana");
    expect(body.shippingRate.currency).toBe("USD");
    expect(body.shippingRate.amountMinor).toBe(500);
  });

  test("modo puntual: provincia inexistente → 404", async () => {
    await seedShippingRate({ province: "Habana", currency: "USD" });

    const res = await request(
      "/api/v1/shipping-rates?province=Inexistente&currency=USD",
    );
    expect(res.status).toBe(404);
  });

  test("moneda inválida (no 3 chars) → 400", async () => {
    const res = await request("/api/v1/shipping-rates?currency=US");
    expect(res.status).toBe(400);
  });
});
