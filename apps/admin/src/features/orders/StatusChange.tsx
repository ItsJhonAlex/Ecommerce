import { allowedTransitions, type OrderStatus } from "@avanzar/shared";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { orderStatusLabel } from "@/lib/format";
import { useUpdateOrderStatus } from "./hooks";
import type { Order } from "./types";

/** Botonera de transiciones permitidas para el estado actual del pedido. */
export function StatusChange({ order }: { order: Order }) {
  const allowed = allowedTransitions(order.fulfillment, order.status);
  const mutation = useUpdateOrderStatus(order.id);
  const [inlineError, setInlineError] = useState<string | null>(null);

  if (allowed.length === 0) {
    return <p className="text-sm text-muted-foreground">Estado final.</p>;
  }

  function changeTo(to: OrderStatus) {
    setInlineError(null);
    if (to === "cancelled" && !confirm("Cancelar repone el stock. ¿Confirmás?")) {
      return;
    }
    mutation.mutate(to, {
      onSuccess: () =>
        toast.success(`Pedido → ${orderStatusLabel(to, order.fulfillment)}`),
      onError: (e) => {
        if (e instanceof ApiError && e.status === 422) {
          setInlineError(e.message);
        } else {
          toast.error(e instanceof Error ? e.message : "Error al cambiar estado");
        }
      },
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {allowed.map((to) => (
          <Button
            key={to}
            variant={to === "cancelled" ? "destructive" : "default"}
            disabled={mutation.isPending}
            onClick={() => changeTo(to)}
          >
            {orderStatusLabel(to, order.fulfillment)}
          </Button>
        ))}
      </div>
      {inlineError && (
        <p className="text-sm text-destructive" role="alert">
          {inlineError}
        </p>
      )}
    </div>
  );
}
