import type { OrderStatus } from "@avanzar/shared";

export type OrderItem = {
  id: string;
  productId: string | null;
  productName: string;
  unitAmountMinor: number;
  quantity: number;
  lineTotalMinor: number;
};

export type Payment = {
  id: string;
  orderId: string;
  method: string;
  status: string;
  amountMinor: number;
  currency: string;
  reference: string | null;
  confirmedAt: string | null;
  createdAt: string;
};

export type OrderStatusHistoryEntry = {
  id: string;
  status: OrderStatus;
  changedBy: string | null;
  createdAt: string;
};

export type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  fulfillment: "pickup" | "delivery";
  currency: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  shipRecipient: string;
  shipPhone: string;
  shipProvince: string | null;
  shipMunicipality: string | null;
  shipAddressLine: string | null;
  shipReference: string | null;
  subtotalMinor: number;
  shippingMinor: number;
  discountMinor: number;
  totalMinor: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  payments: Payment[];
  statusHistory: OrderStatusHistoryEntry[];
};

/** Forma en el listado (incluye items y payments, sin statusHistory). */
export type OrderListItem = Omit<Order, "statusHistory">;
