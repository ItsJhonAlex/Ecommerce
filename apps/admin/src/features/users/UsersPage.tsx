import { USER_ROLES } from "@avanzar/shared";
import type { Column } from "@/components/DataTable";
import { DataTable } from "@/components/DataTable";
import { filterSelectClass, PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { StatusBadge } from "@/components/StatusBadge";
import { ApiError } from "@/lib/api";
import { formatDate, userRoleLabel } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";
import { useUpdateRole, useUsers } from "./hooks";
import type { AdminUser } from "./types";

/** Select de rol por fila (controlado por user.role; confirma antes de cambiar). */
function RoleSelect({ user }: { user: AdminUser }) {
  const update = useUpdateRole();
  return (
    <select
      aria-label={`Rol de ${user.name}`}
      className={filterSelectClass}
      value={user.role}
      disabled={update.isPending}
      onChange={(e) => {
        const role = e.target.value;
        if (!confirm(`¿Cambiar el rol de ${user.name} a "${userRoleLabel(role)}"?`)) {
          return;
        }
        update.mutate(
          { id: user.id, role },
          {
            onError: (err) =>
              toast.error(
                err instanceof ApiError ? err.message : "No se pudo cambiar el rol",
              ),
          },
        );
      }}
    >
      {USER_ROLES.map((r) => (
        <option key={r} value={r}>
          {userRoleLabel(r)}
        </option>
      ))}
    </select>
  );
}

export function UsersPage() {
  const [role, setRole] = useState("");
  const { data, isPending, isError, error, refetch } = useUsers(role || undefined);

  const columns: Column<AdminUser>[] = [
    { key: "name", header: "Nombre", render: (u) => u.name },
    {
      key: "email",
      header: "Email",
      render: (u) => <span className="font-mono text-xs">{u.email}</span>,
    },
    {
      key: "role",
      header: "Rol",
      render: (u) => <StatusBadge kind="user" status={u.role} />,
    },
    {
      key: "verified",
      header: "Verificado",
      render: (u) =>
        u.emailVerified ? (
          <span className="text-emerald-600 dark:text-emerald-400">✓</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "created",
      header: "Alta",
      render: (u) => (
        <span className="text-muted-foreground">{formatDate(u.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "Cambiar rol",
      align: "right",
      render: (u) => <RoleSelect user={u} />,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Usuarios"
        subtitle="Roles y accesos"
        actions={
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Rol
            <select
              aria-label="Rol"
              className={filterSelectClass}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="">Todos</option>
              {USER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {userRoleLabel(r)}
                </option>
              ))}
            </select>
          </label>
        }
      />

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : data.length === 0 ? (
        <EmptyState message="No hay usuarios" />
      ) : (
        <DataTable columns={columns} rows={data} rowKey={(u) => u.id} />
      )}
    </div>
  );
}
