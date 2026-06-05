import { describe, expect, test } from "bun:test";
import {
  CheckoutError,
  computeOrderTotals,
  generateOrderNumber,
  resolveCheckoutItems,
} from "./checkout";

const product = (over: Partial<{
  id: string;
  name: string;
  status: string;
  prices: { currency: string; amountMinor: number }[];
}> = {}) => ({
  id: "p1",
  name: "Remera negra",
  status: "active",
  prices: [{ currency: "USD", amountMinor: 1999 }],
  ...over,
});

describe("resolveCheckoutItems", () => {
  test("resolves active product with matching price into a snapshot line", () => {
    const lines = resolveCheckoutItems(
      [product()],
      [{ productId: "p1", quantity: 3 }],
      "USD",
    );
    expect(lines).toEqual([
      {
        productId: "p1",
        productName: "Remera negra",
        unitAmountMinor: 1999,
        quantity: 3,
        lineTotalMinor: 5997,
      },
    ]);
  });

  test("throws PRODUCT_NOT_FOUND when product id is unknown", () => {
    expect(() =>
      resolveCheckoutItems([product()], [{ productId: "x", quantity: 1 }], "USD"),
    ).toThrow(CheckoutError);
    try {
      resolveCheckoutItems([product()], [{ productId: "x", quantity: 1 }], "USD");
    } catch (e) {
      expect((e as CheckoutError).code).toBe("PRODUCT_NOT_FOUND");
    }
  });

  test("throws PRODUCT_NOT_AVAILABLE when product is not active", () => {
    try {
      resolveCheckoutItems(
        [product({ status: "archived" })],
        [{ productId: "p1", quantity: 1 }],
        "USD",
      );
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as CheckoutError).code).toBe("PRODUCT_NOT_AVAILABLE");
    }
  });

  test("throws PRICE_NOT_AVAILABLE when currency has no price", () => {
    try {
      resolveCheckoutItems([product()], [{ productId: "p1", quantity: 1 }], "CUP");
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as CheckoutError).code).toBe("PRICE_NOT_AVAILABLE");
    }
  });
});

describe("computeOrderTotals", () => {
  test("sums line totals, adds shipping, zero discount", () => {
    const totals = computeOrderTotals(
      [
        { productId: "a", productName: "A", unitAmountMinor: 1000, quantity: 2, lineTotalMinor: 2000 },
        { productId: "b", productName: "B", unitAmountMinor: 500, quantity: 1, lineTotalMinor: 500 },
      ],
      300,
    );
    expect(totals).toEqual({
      subtotalMinor: 2500,
      shippingMinor: 300,
      discountMinor: 0,
      totalMinor: 2800,
    });
  });
});

describe("generateOrderNumber", () => {
  test("formats AVZ-YYYYMMDD-XXXX with zero-padded suffix", () => {
    const n = generateOrderNumber(new Date(Date.UTC(2026, 5, 3)), 0.42);
    expect(n).toBe("AVZ-20260603-4200");
  });

  test("pads suffix to 4 digits", () => {
    const n = generateOrderNumber(new Date(Date.UTC(2026, 0, 9)), 0.0007);
    expect(n).toBe("AVZ-20260109-0007");
  });
});
