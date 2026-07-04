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

describe("checkout — cotas de entrada (M-1)", () => {
  test("quantity > 1000 → 400 de validación", async () => {
    const p = await seedProduct({ stock: 10 });
    await seedShippingRate();
    const res = await postJson("/api/v1/checkout", checkoutBody(p.id, 99999));
    expect(res.status).toBe(400);
  });

  test("más de 50 items → 400 de validación", async () => {
    const p = await seedProduct({ stock: 10 });
    await seedShippingRate();
    const body = {
      ...checkoutBody(p.id, 1),
      items: Array.from({ length: 51 }, () => ({ productId: p.id, quantity: 1 })),
    };
    const res = await postJson("/api/v1/checkout", body);
    expect(res.status).toBe(400);
  });
});

describe("checkout retiro/domicilio", () => {
  test("retiro → 201, sin envío, sin dirección (sin tarifa cargada)", async () => {
    const p = await seedProduct({ stock: 10, amountMinor: 1000 });
    // Nota: sin seedShippingRate — el retiro no debe consultar tarifas.
    const res = await postJson("/api/v1/checkout", {
      currency: "USD",
      fulfillment: "pickup",
      buyer: { name: "Ana", email: "ana@example.com", phone: "+1555" },
      recipient: { name: "Beto", phone: "+53555" },
      items: [{ productId: p.id, quantity: 1 }],
      payment: { method: "zelle" },
    });
    expect(res.status).toBe(201);
    const { order } = (await res.json()) as {
      order: {
        fulfillment: string;
        shippingMinor: number;
        shipProvince: string | null;
        totalMinor: number;
      };
    };
    expect(order.fulfillment).toBe("pickup");
    expect(order.shippingMinor).toBe(0);
    expect(order.shipProvince).toBeNull();
    expect(order.totalMinor).toBe(1000);
  });

  test("domicilio con tarifa → 201, envío aplicado", async () => {
    const p = await seedProduct({ stock: 10, amountMinor: 1000 });
    await seedShippingRate({ province: "Habana", amountMinor: 500 });
    const res = await postJson("/api/v1/checkout", {
      currency: "USD",
      fulfillment: "delivery",
      buyer: { name: "Ana", email: "ana@example.com", phone: "+1555" },
      recipient: {
        name: "Beto",
        phone: "+53555",
        province: "Habana",
        municipality: "Centro",
        addressLine: "Calle 1",
      },
      items: [{ productId: p.id, quantity: 1 }],
      payment: { method: "zelle" },
    });
    expect(res.status).toBe(201);
    const { order } = (await res.json()) as {
      order: { fulfillment: string; shippingMinor: number; totalMinor: number };
    };
    expect(order.fulfillment).toBe("delivery");
    expect(order.shippingMinor).toBe(500);
    expect(order.totalMinor).toBe(1500);
  });

  test("domicilio sin tarifa → 422 SHIPPING_NOT_SUPPORTED", async () => {
    const p = await seedProduct({ stock: 10, amountMinor: 1000 });
    // sin seedShippingRate
    const res = await postJson("/api/v1/checkout", {
      currency: "USD",
      fulfillment: "delivery",
      buyer: { name: "Ana", email: "ana@example.com", phone: "+1555" },
      recipient: {
        name: "Beto",
        phone: "+53555",
        province: "Habana",
        municipality: "Centro",
        addressLine: "Calle 1",
      },
      items: [{ productId: p.id, quantity: 1 }],
      payment: { method: "zelle" },
    });
    expect(res.status).toBe(422);
    expect(((await res.json()) as { code: string }).code).toBe("SHIPPING_NOT_SUPPORTED");
  });

  test("domicilio sin dirección → 400 de validación", async () => {
    const p = await seedProduct({ stock: 10, amountMinor: 1000 });
    const res = await postJson("/api/v1/checkout", {
      currency: "USD",
      fulfillment: "delivery",
      buyer: { name: "Ana", email: "ana@example.com", phone: "+1555" },
      recipient: { name: "Beto", phone: "+53555" },
      items: [{ productId: p.id, quantity: 1 }],
      payment: { method: "zelle" },
    });
    expect(res.status).toBe(400);
  });
});
