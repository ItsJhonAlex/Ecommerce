import { db } from "@avanzar/db";
import { products } from "@avanzar/db/schema";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, test } from "bun:test";
import {
  checkoutBody,
  postJson,
  resetDb,
  seedProduct,
  seedShippingRate,
} from "./helpers";

beforeEach(async () => {
  await resetDb();
});

describe("POST /api/v1/checkout", () => {
  test("happy path: 201, totales correctos, stock descontado", async () => {
    const p = await seedProduct({ stock: 10, amountMinor: 1999 });
    await seedShippingRate({ province: "Habana", amountMinor: 500 });

    const res = await postJson("/api/v1/checkout", checkoutBody(p.id, 2));
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      order: { status: string; subtotalMinor: number; shippingMinor: number; totalMinor: number };
      payment: { status: string };
    };
    expect(body.order.status).toBe("pending_payment");
    expect(body.order.subtotalMinor).toBe(3998);
    expect(body.order.shippingMinor).toBe(500);
    expect(body.order.totalMinor).toBe(4498);
    expect(body.payment.status).toBe("pending");

    const [after] = await db
      .select()
      .from(products)
      .where(eq(products.id, p.id));
    expect(after?.stockQuantity).toBe(8);
  });

  test("stock insuficiente: 422 INSUFFICIENT_STOCK y stock intacto", async () => {
    const p = await seedProduct({ stock: 1 });
    await seedShippingRate();

    const res = await postJson("/api/v1/checkout", checkoutBody(p.id, 2));
    expect(res.status).toBe(422);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe("INSUFFICIENT_STOCK");

    const [after] = await db
      .select()
      .from(products)
      .where(eq(products.id, p.id));
    expect(after?.stockQuantity).toBe(1); // rollback: sin cambios
  });

  test("provincia sin tarifa: 422 SHIPPING_NOT_SUPPORTED", async () => {
    const p = await seedProduct({ stock: 10 });
    // sin seedShippingRate
    const res = await postJson("/api/v1/checkout", checkoutBody(p.id, 1));
    expect(res.status).toBe(422);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe("SHIPPING_NOT_SUPPORTED");
  });

  test("moneda sin precio: 422 PRICE_NOT_AVAILABLE", async () => {
    const p = await seedProduct({ stock: 10, currency: "USD" });
    await seedShippingRate({ province: "Habana", currency: "CUP" });
    const body = { ...checkoutBody(p.id, 1), currency: "CUP" };
    const res = await postJson("/api/v1/checkout", body);
    expect(res.status).toBe(422);
    expect(((await res.json()) as Record<string, unknown>).code).toBe("PRICE_NOT_AVAILABLE");
  });
});
