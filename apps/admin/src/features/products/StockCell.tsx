import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useUpdateStock } from "./hooks";

/** Celda de stock editable inline: confirma con Enter o blur. */
export function StockCell({ id, value }: { id: string; value: number }) {
  const [text, setText] = useState(String(value));
  const mutation = useUpdateStock();

  // Re-sincronizar con el servidor (tras refetch), pero no mientras se está
  // guardando: evita pisar una edición en curso.
  useEffect(() => {
    if (!mutation.isPending) setText(String(value));
  }, [value, mutation.isPending]);

  function commit() {
    if (text.trim() === "") {
      setText(String(value));
      return;
    }
    const next = Number(text);
    if (!Number.isInteger(next) || next < 0) {
      setText(String(value));
      return;
    }
    if (next === value) return;
    mutation.mutate(
      { id, stockQuantity: next },
      {
        onError: (e) => {
          setText(String(value));
          toast.error(e instanceof ApiError ? e.message : "No se pudo actualizar el stock");
        },
      },
    );
  }

  return (
    <input
      aria-label="Stock"
      type="number"
      min={0}
      value={text}
      disabled={mutation.isPending}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className={cn(
        "h-8 w-20 rounded-md border border-input bg-card px-2 text-right text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40",
        value === 0 && "border-rose-400/50 text-rose-600 dark:text-rose-400",
      )}
    />
  );
}
