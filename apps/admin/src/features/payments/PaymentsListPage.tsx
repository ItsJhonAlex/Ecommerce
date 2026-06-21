import { PAYMENT_STATUSES } from "@avanzar/shared";
import { useState } from "react";
import type { Column } from "@/components/DataTable";
import { DataTable } from "@/components/DataTable";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { StatusBadge } from "@/components/StatusBadge";
import {
  formatDate,
  money,
  paymentMethodLabel,
  paymentStatusLabel,
} from "@/lib/format";
import { ConfirmPaymentDialog } from "./ConfirmPaymentDialog";
import { usePayments } from "./hooks";
import type { PaymentListItem } from "./types";

/** Lista de pagos con filtro por estado y confirmación de pendientes. */
export function PaymentsListPage() {
  const [status, setStatus] = useState("");
  const { data, isPending, isError, error, refetch } = usePayments(
    status || undefined,
  );

  const columns: Column<PaymentListItem>[] = [
    {
      key: "ref",
      header: "Referencia",
      render: (p) => p.reference ?? "—",
    },
    {
      key: "method",
      header: "Método",
      render: (p) => paymentMethodLabel(p.method),
    },
    {
      key: "amount",
      header: "Monto",
      render: (p) => money(p.amountMinor, p.currency),
    },
    {
      key: "status",
      header: "Estado",
      render: (p) => <StatusBadge kind="payment" status={p.status} />,
    },
    {
      key: "date",
      header: "Fecha",
      render: (p) => formatDate(p.createdAt),
    },
    {
      key: "actions",
      header: "",
      render: (p) =>
        p.status === "pending" ? <ConfirmPaymentDialog payment={p} /> : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Pagos</h2>
        <label className="flex items-center gap-2 text-sm">
          Estado
          <select
            aria-label="Estado"
            className="rounded border px-2 py-1"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {paymentStatusLabel(s)}
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
        <EmptyState message="No hay pagos" />
      ) : (
        <DataTable columns={columns} rows={data} rowKey={(p) => p.id} />
      )}
    </div>
  );
}
