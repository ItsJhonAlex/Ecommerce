import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OrderStatus, UpdateOrderStatusInput } from "@avanzar/shared";
import { apiFetch } from "@/lib/api";
import type { Order, OrderListItem } from "./types";

/** Lista de pedidos, opcionalmente filtrada por estado. */
export function useOrders(status?: string) {
  return useQuery({
    queryKey: ["orders", { status: status ?? null }],
    queryFn: () => {
      const qs = status ? `?status=${encodeURIComponent(status)}` : "";
      return apiFetch<{ orders: OrderListItem[] }>(
        `/api/v1/admin/orders${qs}`,
      ).then((r) => r.orders);
    },
  });
}

/** Detalle de un pedido (con items, payments e historial). */
export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () =>
      apiFetch<{ order: Order }>(`/api/v1/admin/orders/${id}`).then(
        (r) => r.order,
      ),
    enabled: !!id, // sin id (misrouting) no dispara la query
  });
}

/** Cambia el estado de un pedido; invalida detalle y lista. */
export function useUpdateOrderStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: OrderStatus) => {
      const body: UpdateOrderStatusInput = { status };
      return apiFetch<{ order: Order }>(
        `/api/v1/admin/orders/${id}/status`,
        { method: "PATCH", body: JSON.stringify(body) },
      ).then((r) => r.order);
    },
    onSuccess: () => {
      // El prefijo ["orders"] matchea tanto la lista como el detalle ["orders", id].
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
