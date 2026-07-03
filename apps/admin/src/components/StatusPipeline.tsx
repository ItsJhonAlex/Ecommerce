import { type FulfillmentMethod, type OrderStatus } from "@avanzar/shared";
import { XCircle } from "lucide-react";
import { orderStatusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

const DELIVERY_STEPS: OrderStatus[] = [
  "pending_payment",
  "paid",
  "preparing",
  "shipped",
  "delivered",
];
const PICKUP_STEPS: OrderStatus[] = [
  "pending_payment",
  "paid",
  "preparing",
  "ready_for_pickup",
  "delivered",
];

/**
 * Riel de avance del pedido — la firma de la consola. Secuencia según método.
 * `cancelled` desvía a un estado terminal rosa.
 */
export function StatusPipeline({
  status,
  fulfillment,
}: {
  status: OrderStatus;
  fulfillment: FulfillmentMethod;
}) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
        <XCircle className="size-4 shrink-0" />
        Pedido cancelado — el stock fue repuesto.
      </div>
    );
  }

  const steps = fulfillment === "pickup" ? PICKUP_STEPS : DELIVERY_STEPS;
  const currentIndex = steps.indexOf(status);
  const lastIndex = steps.length - 1;
  // Defensivo: si el estado no pertenece a la secuencia del método (no debería
  // pasar — el backend valida por método), evitar un ancho de progreso negativo.
  const progress = (Math.max(0, currentIndex) / lastIndex) * 100;

  return (
    <div className="relative pt-1">
      <div className="absolute inset-x-[7px] top-[7px] h-0.5 bg-border" />
      <div
        className="absolute left-[7px] top-[7px] h-0.5 bg-primary transition-all"
        style={{ width: `calc(${progress}% - ${(progress / 100) * 14}px)` }}
      />
      <ol className="relative flex justify-between">
        {steps.map((s, i) => {
          const done = i < currentIndex;
          const current = i === currentIndex;
          return (
            <li key={s} className="flex flex-col items-center gap-2">
              <span
                className={cn(
                  "size-3.5 rounded-full border-2 transition-colors",
                  current
                    ? "border-primary bg-primary ring-4 ring-primary/20"
                    : done
                      ? "border-primary bg-primary"
                      : "border-border bg-card",
                )}
              />
              <span
                className={cn(
                  "max-w-20 text-center text-xs leading-tight",
                  current ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {orderStatusLabel(s, fulfillment)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
