import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ConfirmPaymentInput } from "@avanzar/shared";
import { apiFetch } from "@/lib/api";
import type { PaymentListItem } from "./types";

/** Lista de pagos, opcionalmente filtrada por estado. */
export function usePayments(status?: string) {
  return useQuery({
    queryKey: ["payments", { status: status ?? null }],
    queryFn: () => {
      const qs = status ? `?status=${encodeURIComponent(status)}` : "";
      return apiFetch<{ payments: PaymentListItem[] }>(
        `/api/v1/admin/payments${qs}`,
      ).then((r) => r.payments);
    },
  });
}

/** Confirma un pago pending; invalida pagos y pedidos (puede promover a paid). */
export function useConfirmPayment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reference: string) => {
      const body: ConfirmPaymentInput = { reference };
      return apiFetch<{ payment: PaymentListItem }>(
        `/api/v1/admin/payments/${id}/confirm`,
        { method: "PATCH", body: JSON.stringify(body) },
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
