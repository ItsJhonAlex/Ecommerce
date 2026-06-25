import { Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { money } from "@/lib/format";
import { parseMoneyToMinor } from "@/lib/money";
import { useAddPrice, useDeletePrice } from "./hooks";
import type { ProductPrice } from "./types";

/** Editor de precios por moneda de un producto. */
export function PricesEditor({
  productId,
  prices,
}: {
  productId: string;
  prices: ProductPrice[];
}) {
  const add = useAddPrice(productId);
  const del = useDeletePrice(productId);
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    let amountMinor: number;
    try {
      amountMinor = parseMoneyToMinor(amount);
    } catch {
      setError("Importe inválido");
      return;
    }
    add.mutate(
      { currency: currency.trim().toUpperCase(), amountMinor },
      {
        onSuccess: () => {
          setAmount("");
        },
        onError: (e2) =>
          setError(e2 instanceof ApiError ? e2.message : "No se pudo agregar"),
      },
    );
  }

  return (
    <div className="space-y-3">
      {prices.length > 0 && (
        <ul className="divide-y text-sm">
          {prices.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 py-2"
            >
              <span className="font-mono text-xs text-muted-foreground">
                {p.currency}
              </span>
              <span className="ml-auto font-medium">
                {money(p.amountMinor, p.currency)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Borrar precio ${p.currency}`}
                onClick={() =>
                  del.mutate(p.id, {
                    onError: () => toast.error("No se pudo borrar el precio"),
                  })
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleAdd} className="flex items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="currency">Moneda</Label>
          <Input
            id="currency"
            className="w-24 font-mono uppercase"
            maxLength={3}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="amount">Importe</Label>
          <Input
            id="amount"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={add.isPending}>
          Agregar precio
        </Button>
      </form>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
