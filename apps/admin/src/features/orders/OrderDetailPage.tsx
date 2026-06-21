import { useParams } from "react-router";
import { Card } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/states";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, money, paymentMethodLabel, paymentStatusLabel } from "@/lib/format";
import { useOrder } from "./hooks";
import { StatusChange } from "./StatusChange";

/** Detalle de un pedido: datos, ítems, pagos, historial y cambio de estado. */
export function OrderDetailPage() {
  const { id } = useParams();
  const { data: order, isPending, isError, error, refetch } = useOrder(id);

  if (isPending) return <LoadingState />;
  if (isError) {
    return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Pedido {order.orderNumber}</h2>
        <StatusBadge kind="order" status={order.status} />
      </div>

      <Card className="p-4">
        <h3 className="mb-2 font-medium">Cambiar estado</h3>
        <StatusChange order={order} />
      </Card>

      <Card className="p-4">
        <h3 className="mb-2 font-medium">Comprador y envío</h3>
        <p className="text-sm">{order.buyerName} · {order.buyerEmail} · {order.buyerPhone}</p>
        <p className="text-sm text-muted-foreground">
          {order.shipRecipient} — {order.shipAddressLine}, {order.shipMunicipality},{" "}
          {order.shipProvince}
        </p>
        {order.shipReference && (
          <p className="text-sm text-muted-foreground">Ref: {order.shipReference}</p>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="mb-2 font-medium">Ítems</h3>
        <ul className="space-y-1 text-sm">
          {order.items.map((it) => (
            <li key={it.id} className="flex justify-between">
              <span>{it.productName} × {it.quantity}</span>
              <span>{money(it.lineTotalMinor, order.currency)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-right font-medium">
          Total: {money(order.totalMinor, order.currency)}
        </p>
      </Card>

      <Card className="p-4">
        <h3 className="mb-2 font-medium">Pagos</h3>
        {order.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin pagos</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {order.payments.map((p) => (
              <li key={p.id} className="flex justify-between">
                <span>{paymentMethodLabel(p.method)} · {paymentStatusLabel(p.status)}</span>
                <span>{money(p.amountMinor, p.currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="mb-2 font-medium">Historial</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {order.statusHistory.map((h) => (
            <li key={h.id}>
              {formatDate(h.createdAt)} — <StatusBadge kind="order" status={h.status} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
