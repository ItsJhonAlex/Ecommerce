/** Error de regla de negocio del checkout. `code` se expone al cliente. */
export class CheckoutError extends Error {
  constructor(
    public code: string,
    public details: Record<string, unknown> = {},
  ) {
    super(code);
    this.name = "CheckoutError";
  }
}

export type ResolvableProduct = {
  id: string;
  name: string;
  status: string;
  prices: { currency: string; amountMinor: number }[];
};

export type CheckoutLine = {
  productId: string;
  productName: string;
  unitAmountMinor: number;
  quantity: number;
  lineTotalMinor: number;
};

type RequestedItem = { productId: string; quantity: number };

/**
 * Convierte items pedidos (productId+quantity) en líneas con snapshot de
 * nombre y precio. Lanza CheckoutError si el producto no existe, no está
 * activo, o no tiene precio en la moneda pedida.
 */
export function resolveCheckoutItems(
  products: ResolvableProduct[],
  items: RequestedItem[],
  currency: string,
): CheckoutLine[] {
  return items.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      throw new CheckoutError("PRODUCT_NOT_FOUND", { productId: item.productId });
    }
    if (product.status !== "active") {
      throw new CheckoutError("PRODUCT_NOT_AVAILABLE", {
        productId: item.productId,
      });
    }
    const price = product.prices.find((pr) => pr.currency === currency);
    if (!price) {
      throw new CheckoutError("PRICE_NOT_AVAILABLE", {
        productId: item.productId,
        currency,
      });
    }
    return {
      productId: product.id,
      productName: product.name,
      unitAmountMinor: price.amountMinor,
      quantity: item.quantity,
      lineTotalMinor: price.amountMinor * item.quantity,
    };
  });
}

/** Suma líneas + envío. Sin descuentos en V1. */
export function computeOrderTotals(lines: CheckoutLine[], shippingMinor: number) {
  const subtotalMinor = lines.reduce((acc, l) => acc + l.lineTotalMinor, 0);
  const discountMinor = 0;
  const totalMinor = subtotalMinor + shippingMinor - discountMinor;
  return { subtotalMinor, shippingMinor, discountMinor, totalMinor };
}

/** Número de orden legible: AVZ-YYYYMMDD-XXXX. `rand` ∈ [0,1). */
export function generateOrderNumber(now: Date, rand: number): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const suffix = String(Math.floor(rand * 10000)).padStart(4, "0");
  return `AVZ-${y}${m}${d}-${suffix}`;
}
