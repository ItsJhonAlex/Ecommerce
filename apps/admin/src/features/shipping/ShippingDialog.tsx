import { CUBA_PROVINCES } from "@avanzar/shared";
import { type FormEvent, useState } from "react";
import { filterSelectClass } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { minorToInput, parseMoneyToMinor } from "@/lib/money";
import { useCreateShippingRate, useUpdateShippingRate } from "./hooks";
import type { ShippingRate } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rate?: ShippingRate;
};

/** Diálogo para crear o editar una tarifa de envío. */
export function ShippingDialog({ open, onOpenChange, rate }: Props) {
  const editing = Boolean(rate);
  const [province, setProvince] = useState(rate?.province ?? CUBA_PROVINCES[0]);
  const [currency, setCurrency] = useState(rate?.currency ?? "USD");
  const [amount, setAmount] = useState(
    rate ? minorToInput(rate.amountMinor) : "",
  );
  const [active, setActive] = useState(rate?.active ?? true);
  const [error, setError] = useState<string | null>(null);

  const create = useCreateShippingRate();
  const update = useUpdateShippingRate(rate?.id ?? "");
  const pending = create.isPending || update.isPending;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    let amountMinor: number;
    try {
      amountMinor = parseMoneyToMinor(amount);
    } catch {
      setError("Importe inválido");
      return;
    }
    const normalizedCurrency = currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
      setError("La moneda debe ser un código de 3 letras (ej. USD)");
      return;
    }
    const body = {
      province,
      currency: normalizedCurrency,
      amountMinor,
      active,
    };
    const onError = (err: unknown) =>
      setError(err instanceof ApiError ? err.message : "No se pudo guardar");
    const onSuccess = () => onOpenChange(false);
    if (editing) update.mutate(body, { onSuccess, onError });
    else create.mutate(body, { onSuccess, onError });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar tarifa" : "Nueva tarifa"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sr-province">Provincia</Label>
            <select
              id="sr-province"
              className={`${filterSelectClass} w-full`}
              value={province}
              onChange={(e) => setProvince(e.target.value)}
            >
              {CUBA_PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sr-currency">Moneda</Label>
              <Input
                id="sr-currency"
                className="font-mono uppercase"
                maxLength={3}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sr-amount">Importe</Label>
              <Input
                id="sr-amount"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Activa
          </label>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : editing ? "Guardar" : "Crear"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
