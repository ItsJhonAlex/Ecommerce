import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ShippingRateInput } from "@avanzar/shared";
import { apiFetch } from "@/lib/api";
import type { ShippingRate } from "./types";

const BASE = "/api/v1/admin/shipping-rates";

export function useShippingRates() {
  return useQuery({
    queryKey: ["shipping-rates"],
    queryFn: () =>
      apiFetch<{ shippingRates: ShippingRate[] }>(BASE).then(
        (r) => r.shippingRates,
      ),
  });
}

export function useCreateShippingRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ShippingRateInput) =>
      apiFetch<{ shippingRate: ShippingRate }>(BASE, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shipping-rates"] }),
  });
}

export function useUpdateShippingRate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ShippingRateInput>) =>
      apiFetch<{ shippingRate: ShippingRate }>(`${BASE}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shipping-rates"] }),
  });
}

export function useDeleteShippingRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`${BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shipping-rates"] }),
  });
}
