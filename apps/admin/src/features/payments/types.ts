/** Forma de un pago en el listado admin (JSON de la API). */
export type PaymentListItem = {
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
