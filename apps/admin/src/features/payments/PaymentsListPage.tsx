import { PAYMENT_STATUSES } from "@avanzar/shared";
import { useState } from "react";
import type { Column } from "@/components/DataTable";
import { DataTable } from "@/components/DataTable";
import { filterSelectClass, PageHeader } from "@/components/PageHeader";
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
      render: (p) =>
        p.reference ? (
          <span className="font-mono text-[13px]">{p.reference}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "method",
      header: "Método",
      render: (p) => paymentMethodLabel(p.method),
    },
    {
      key: "amount",
      header: "Monto",
      align: "right",
      render: (p) => (
        <span className="font-medium">{money(p.amountMinor, p.currency)}</span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      render: (p) => <StatusBadge kind="payment" status={p.status} />,
    },
    {
      key: "date",
      header: "Fecha",
      render: (p) => (
        <span className="text-muted-foreground">{formatDate(p.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (p) =>
        p.status === "pending" ? <ConfirmPaymentDialog payment={p} /> : null,
    },
  ];

  const subtitle =
    data && !isPending
      ? `${data.length} ${data.length === 1 ? "pago" : "pagos"}`
      : "Confirmación de pagos";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pagos"
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
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {paymentStatusLabel(s)}
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
        <EmptyState message="No hay pagos" />
      ) : (
        <DataTable columns={columns} rows={data} rowKey={(p) => p.id} />
      )}
    </div>
  );
}
