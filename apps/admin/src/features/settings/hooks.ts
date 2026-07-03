import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { StoreSettings, StoreSettingsUpdate } from "./types";

const BASE = "/api/v1/admin/settings";

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () =>
      apiFetch<{ settings: StoreSettings }>(BASE).then((r) => r.settings),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StoreSettingsUpdate) =>
      apiFetch<{ settings: StoreSettings }>(BASE, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}
