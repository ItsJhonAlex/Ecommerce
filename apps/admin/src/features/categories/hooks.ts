import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CategoryInput } from "@avanzar/shared";
import { apiFetch } from "@/lib/api";
import type { Category } from "./types";

const BASE = "/api/v1/admin/categories";

/** Lista de categorías (fuente canónica; productos la reusa). */
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () =>
      apiFetch<{ categories: Category[] }>(BASE).then((r) => r.categories),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryInput) =>
      apiFetch<{ category: Category }>(BASE, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useUpdateCategory(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CategoryInput>) =>
      apiFetch<{ category: Category }>(`${BASE}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`${BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}
