/** Formatea centavos a importe con símbolo de moneda. */
export function money(minor: number, currency: string): string {
  return new Intl.NumberFormat("es", {
    style: "currency",
    currency,
  }).format(minor / 100);
}

/** Formatea una fecha ISO a fecha+hora local corta. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pendiente de pago",
  paid: "Pagado",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  rejected: "Rechazado",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: "Contra entrega",
  transfer_local: "Transferencia local",
  zelle: "Zelle",
};

export function orderStatusLabel(s: string): string {
  return ORDER_STATUS_LABELS[s] ?? s;
}
export function paymentStatusLabel(s: string): string {
  return PAYMENT_STATUS_LABELS[s] ?? s;
}
export function paymentMethodLabel(m: string): string {
  return PAYMENT_METHOD_LABELS[m] ?? m;
}

const PRODUCT_STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  active: "Activo",
  archived: "Archivado",
};

export function productStatusLabel(s: string): string {
  return PRODUCT_STATUS_LABELS[s] ?? s;
}
