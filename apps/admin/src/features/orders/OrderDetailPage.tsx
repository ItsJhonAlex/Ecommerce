import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusPipeline } from "@/components/StatusPipeline";
import { ErrorState, LoadingState } from "@/components/states";
import { Card } from "@/components/ui/card";
import {
  formatDate,
  money,
  paymentMethodLabel,
  paymentStatusLabel,
} from "@/lib/format";
import { useOrder } from "./hooks";
import { StatusChange } from "./StatusChange";

/** Fila etiqueta/valor para los datos del pedido. */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

/** Detalle de un pedido: avance, datos, ítems, pagos e historial. */
export function OrderDetailPage() {
  const { id } = useParams();
  const { data: order, isPending, isError, error, refetch } = useOrder(id);

  if (isPending) return <LoadingState />;
  if (isError) {
    return (
      <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="space-y-3">
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Pedidos
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-baseline gap-2.5">
            <span className="font-display text-2xl font-bold tracking-tight">
              Pedido
            </span>
            <span className="font-mono text-xl font-medium text-muted-foreground">
              {order.orderNumber}
            </span>
          </h2>
          <StatusBadge kind="order" status={order.status} />
        </div>
      </div>

      {/* Héroe: el riel de avance + el control de cambio de estado. */}
      <Card className="space-y-5 p-6">
        <StatusPipeline status={order.status} />
        <div className="border-t pt-4">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Cambiar estado
          </h3>
          <StatusChange order={order} />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <h3 className="font-display text-base font-semibold">
            Comprador y envío
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Comprador" value={order.buyerName} />
            <Field label="Email" value={order.buyerEmail} />
            <Field label="Teléfono" value={order.buyerPhone} />
            <Field label="Destinatario" value={order.shipRecipient} />
          </div>
          <div className="border-t pt-4 text-sm text-muted-foreground">
            <p>{order.shipAddressLine}</p>
            <p>
              {order.shipMunicipality}, {order.shipProvince}
            </p>
            {order.shipReference && (
              <p className="mt-1">Ref: {order.shipReference}</p>
            )}
          </div>
        </Card>

        <Card className="space-y-3 p-6">
          <h3 className="font-display text-base font-semibold">Ítems</h3>
          <ul className="divide-y text-sm">
            {order.items.map((it) => (
              <li key={it.id} className="flex justify-between gap-4 py-2">
                <span>
                  {it.productName}
                  <span className="text-muted-foreground"> × {it.quantity}</span>
                </span>
                <span className="font-medium">
                  {money(it.lineTotalMinor, order.currency)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <dt>Subtotal</dt>
              <dd>{money(order.subtotalMinor, order.currency)}</dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>Envío</dt>
              <dd>{money(order.shippingMinor, order.currency)}</dd>
            </div>
            {order.discountMinor > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <dt>Descuento</dt>
                <dd>−{money(order.discountMinor, order.currency)}</dd>
              </div>
            )}
            <div className="flex justify-between pt-1 text-base font-semibold">
              <dt>Total</dt>
              <dd>{money(order.totalMinor, order.currency)}</dd>
            </div>
          </dl>
        </Card>

        <Card className="space-y-3 p-6">
          <h3 className="font-display text-base font-semibold">Pagos</h3>
          {order.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin pagos</p>
          ) : (
            <ul className="divide-y text-sm">
              {order.payments.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-4 py-2"
                >
                  <span className="flex items-center gap-2">
                    {paymentMethodLabel(p.method)}
                    <StatusBadge kind="payment" status={p.status} />
                  </span>
                  <span className="font-medium">
                    {money(p.amountMinor, p.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="space-y-3 p-6">
          <h3 className="font-display text-base font-semibold">Historial</h3>
          <ol className="space-y-3">
            {order.statusHistory.map((h) => (
              <li key={h.id} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-xs text-muted-foreground">
                  {formatDate(h.createdAt)}
                </span>
                <StatusBadge kind="order" status={h.status} />
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
