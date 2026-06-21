import { Badge } from "@/components/ui/badge";
import { orderStatusLabel, paymentStatusLabel } from "@/lib/format";

type Props = { kind: "order" | "payment"; status: string };

type BadgeVariant = "default" | "secondary" | "destructive";

/** Color por estado para triage rápido: positivo, en curso o cancelado/rechazado. */
const POSITIVE = new Set(["paid", "delivered", "confirmed"]);
const NEGATIVE = new Set(["cancelled", "rejected"]);

function variantFor(status: string): BadgeVariant {
  if (NEGATIVE.has(status)) return "destructive";
  if (POSITIVE.has(status)) return "default";
  return "secondary"; // pendiente / en curso
}

/** Badge de estado para pedidos o pagos, con label en español y color por estado. */
export function StatusBadge({ kind, status }: Props) {
  const label =
    kind === "order" ? orderStatusLabel(status) : paymentStatusLabel(status);
  return (
    <Badge variant={variantFor(status)} data-status={status}>
      {label}
    </Badge>
  );
}
