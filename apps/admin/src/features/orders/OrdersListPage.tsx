import { ORDER_STATUSES } from "@avanzar/shared";
import { useState } from "react";
import { useNavigate } from "react-router";
import { DataTable } from "@/components/DataTable";
import type { Column } from "@/components/DataTable";
import { filterSelectClass, PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, money, orderStatusLabel } from "@/lib/format";
import { useOrders } from "./hooks";
import type { OrderListItem } from "./types";

const columns: Column<OrderListItem>[] = [
  {
    key: "orderNumber",
    header: "N° pedido",
    render: (o) => (
      <span className="font-mono text-[13px] font-medium">{o.orderNumber}</span>
    ),
  },
  { key: "buyer", header: "Comprador", render: (o) => o.buyerName },
  {
    key: "total",
    header: "Total",
    align: "right",
    render: (o) => (
      <span className="font-medium">{money(o.totalMinor, o.currency)}</span>
    ),
  },
  {
    key: "status",
    header: "Estado",
    render: (o) => <StatusBadge kind="order" status={o.status} />,
  },
  {
    key: "date",
    header: "Fecha",
    render: (o) => (
      <span className="text-muted-foreground">{formatDate(o.createdAt)}</span>
    ),
  },
];

/** Lista de pedidos con filtro por estado. */
export function OrdersListPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const { data, isPending, isError, error, refetch } = useOrders(
    status || undefined,
  );

  const subtitle =
    data && !isPending
      ? `${data.length} ${data.length === 1 ? "pedido" : "pedidos"}`
      : "Gestión de pedidos";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pedidos"
        subtitle={subtitle}
        actions={
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Estado
            <select
              aria-label="Estado"
              className={filterSelectClass}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Todos</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {orderStatusLabel(s)}
                </option>
              ))}
            </select>
          </label>
        }
      />

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState
          message={(error as Error).message}
          onRetry={() => refetch()}
        />
      ) : data.length === 0 ? (
        <EmptyState message="No hay pedidos" />
      ) : (
        <DataTable
          columns={columns}
          rows={data}
          rowKey={(o) => o.id}
          onRowClick={(o) => navigate(`/orders/${o.id}`)}
        />
      )}
    </div>
  );
}
