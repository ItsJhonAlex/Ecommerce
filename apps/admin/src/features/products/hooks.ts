import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProductInput } from "@avanzar/shared";
import { apiFetch } from "@/lib/api";
import type { Product, ProductListItem } from "./types";

const BASE = "/api/v1/admin/products";

/** Lista de productos con filtro por estado y búsqueda. */
export function useProducts(params: { status?: string; q?: string }) {
  const { status, q } = params;
  return useQuery({
    queryKey: ["products", { status: status ?? null, q: q ?? null }],
    queryFn: () => {
      const sp = new URLSearchParams();
      if (status) sp.set("status", status);
      if (q) sp.set("q", q);
      const qs = sp.toString();
      return apiFetch<{ products: ProductListItem[] }>(
        `${BASE}${qs ? `?${qs}` : ""}`,
      ).then((r) => r.products);
    },
  });
}

/** Detalle de un producto (con precios, imágenes y categorías). */
export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: () =>
      apiFetch<{ product: Product }>(`${BASE}/${id}`).then((r) => r.product),
    enabled: !!id,
  });
}

export { useCategories } from "@/features/categories/hooks";

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProductInput) =>
      apiFetch<{ product: Product }>(BASE, {
        method: "POST",
        body: JSON.stringify(input),
      }).then((r) => r.product),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ProductInput>) =>
      apiFetch<{ product: Product }>(`${BASE}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }).then((r) => r.product),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useArchiveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`${BASE}/${id}/archive`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; stockQuantity: number }) =>
      apiFetch(`${BASE}/${v.id}`, {
        method: "PATCH",
        body: JSON.stringify({ stockQuantity: v.stockQuantity }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useAddPrice(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { currency: string; amountMinor: number }) =>
      apiFetch(`${BASE}/${productId}/prices`, {
        method: "POST",
        body: JSON.stringify(v),
      }),
    // El prefijo ["products"] refresca tanto el detalle como la lista (que
    // muestra el precio en su columna).
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useDeletePrice(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (priceId: string) =>
      apiFetch(`${BASE}/${productId}/prices/${priceId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useAddImage(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { url: string; alt?: string; position?: number }) =>
      apiFetch(`${BASE}/${productId}/images`, {
        method: "POST",
        body: JSON.stringify(v),
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["products", productId] }),
  });
}

export function useUpdateImage(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { imageId: string; position: number }) =>
      apiFetch(`${BASE}/${productId}/images/${v.imageId}`, {
        method: "PATCH",
        body: JSON.stringify({ position: v.position }),
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["products", productId] }),
  });
}

export function useReorderImages(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (imageIds: string[]) =>
      apiFetch(`${BASE}/${productId}/images/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ imageIds }),
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["products", productId] }),
  });
}

export function useDeleteImage(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) =>
      apiFetch(`${BASE}/${productId}/images/${imageId}`, { method: "DELETE" }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["products", productId] }),
  });
}

export function useLinkCategory(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) =>
      apiFetch(`${BASE}/${productId}/categories`, {
        method: "POST",
        body: JSON.stringify({ categoryId }),
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["products", productId] }),
  });
}

export function useUnlinkCategory(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) =>
      apiFetch(`${BASE}/${productId}/categories/${categoryId}`, {
        method: "DELETE",
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["products", productId] }),
  });
}
