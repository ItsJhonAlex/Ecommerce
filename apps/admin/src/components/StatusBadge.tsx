import {
  orderStatusLabel,
  paymentStatusLabel,
  productStatusLabel,
  userRoleLabel,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = { kind: "order" | "payment" | "product" | "user"; status: string };

/** Familia de color semántica por estado (ambos modos). */
const FAMILIES: Record<string, string> = {
  // En espera
  pending_payment:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/25",
  pending:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/25",
  // En vuelo
  preparing:
    "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/25",
  shipped:
    "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/25",
  // Positivo / cerrado bien
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/25",
  confirmed:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/25",
  delivered:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/25",
  // Negativo
  cancelled:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/25",
  rejected:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/25",
  // Productos
  draft:
    "bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-400/10 dark:text-zinc-300 dark:ring-zinc-400/20",
  active:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/25",
  archived: "bg-muted text-muted-foreground ring-border",
  // Usuarios
  admin: "bg-primary/10 text-primary ring-primary/25",
  staff:
    "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/25",
  customer: "bg-muted text-muted-foreground ring-border",
};

const FALLBACK = "bg-muted text-muted-foreground ring-border";

/** Badge para estado de pedido/pago/producto o rol de usuario, con label en español y color semántico. */
export function StatusBadge({ kind, status }: Props) {
  const label =
    kind === "order"
      ? orderStatusLabel(status)
      : kind === "payment"
        ? paymentStatusLabel(status)
        : kind === "product"
          ? productStatusLabel(status)
          : userRoleLabel(status);
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        FAMILIES[status] ?? FALLBACK,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}
