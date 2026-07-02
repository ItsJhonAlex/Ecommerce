import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { AdminUser } from "./types";

const BASE = "/api/v1/admin/users";

export function useUsers(role?: string) {
  return useQuery({
    queryKey: ["users", { role: role ?? null }],
    queryFn: () => {
      const qs = role ? `?role=${encodeURIComponent(role)}` : "";
      return apiFetch<{ users: AdminUser[] }>(`${BASE}${qs}`).then((r) => r.users);
    },
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; role: string }) =>
      apiFetch<{ user: AdminUser }>(`${BASE}/${v.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: v.role }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}
