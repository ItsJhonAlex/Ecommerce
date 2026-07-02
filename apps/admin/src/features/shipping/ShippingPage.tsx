import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Column } from "@/components/DataTable";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/format";
import { ShippingDialog } from "./ShippingDialog";
import {
  useDeleteShippingRate,
  useShippingRates,
  useUpdateShippingRate,
} from "./hooks";
import type { ShippingRate } from "./types";

/** Checkbox de activa por fila (PATCH active). */
function ActiveToggle({ rate }: { rate: ShippingRate }) {
  const update = useUpdateShippingRate(rate.id);
  return (
    <input
      type="checkbox"
      aria-label={`Activa ${rate.province} ${rate.currency}`}
      checked={rate.active}
      disabled={update.isPending}
      onChange={(e) =>
        update.mutate(
          { active: e.target.checked },
          { onError: () => toast.error("No se pudo actualizar la tarifa") },
        )
      }
    />
  );
}

export function ShippingPage() {
  const { data, isPending, isError, error, refetch } = useShippingRates();
  const del = useDeleteShippingRate();
  // Un solo diálogo: rate undefined = crear, rate presente = editar.
  const [dialog, setDialog] = useState<{ open: boolean; rate?: ShippingRate }>({
    open: false,
  });

  const columns: Column<ShippingRate>[] = [
    { key: "province", header: "Provincia", render: (r) => r.province },
    {
      key: "currency",
      header: "Moneda",
      render: (r) => <span className="font-mono text-xs">{r.currency}</span>,
    },
    {
      key: "amount",
      header: "Monto",
      align: "right",
      render: (r) => (
        <span className="font-medium">{money(r.amountMinor, r.currency)}</span>
      ),
    },
    { key: "active", header: "Activa", render: (r) => <ActiveToggle rate={r} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Editar ${r.province}`}
            onClick={() => setDialog({ open: true, rate: r })}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Borrar ${r.province}`}
            onClick={() => {
              if (confirm(`¿Borrar la tarifa de ${r.province} (${r.currency})?`)) {
                del.mutate(r.id, {
                  onError: () => toast.error("No se pudo borrar la tarifa"),
                });
              }
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Envíos"
        subtitle="Tarifas por provincia"
        actions={
          <Button onClick={() => setDialog({ open: true })}>Nueva tarifa</Button>
        }
      />

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : data.length === 0 ? (
        <EmptyState message="No hay tarifas" />
      ) : (
        <DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
      )}

      {/* Montar solo cuando está abierto → estado inicial fresco en cada apertura
          (incluye creaciones repetidas, que un `key` fijo "new" no re-montaría). */}
      {dialog.open && (
        <ShippingDialog
          open
          onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}
          rate={dialog.rate}
        />
      )}
    </div>
  );
}
