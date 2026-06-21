import { ORDER_STATUSES } from "@avanzar/shared";
import { useState } from "react";
import { useNavigate } from "react-router";
import { DataTable } from "@/components/DataTable";
import type { Column } from "@/components/DataTable";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, money, orderStatusLabel } from "@/lib/format";
import { useOrders } from "./hooks";
import type { OrderListItem } from "./types";

const columns: Column<OrderListItem>[] = [
  { key: "orderNumber", header: "N° pedido", render: (o: OrderListItem) => o.orderNumber },
  { key: "buyer", header: "Comprador", render: (o: OrderListItem) => o.buyerName },
  {
    key: "total",
    header: "Total",
    render: (o: OrderListItem) => money(o.totalMinor, o.currency),
  },
  {
    key: "status",
    header: "Estado",
    render: (o: OrderListItem) => <StatusBadge kind="order" status={o.status} />,
  },
  {
    key: "date",
    header: "Fecha",
    render: (o: OrderListItem) => formatDate(o.createdAt),
  },
];

/** Lista de pedidos con filtro por estado. */
export function OrdersListPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const { data, isPending, isError, error, refetch } = useOrders(status || undefined);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Pedidos</h2>
        <label className="flex items-center gap-2 text-sm">
          Estado
          <select
            aria-label="Estado"
            className="rounded border px-2 py-1"
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
      </div>

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
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
