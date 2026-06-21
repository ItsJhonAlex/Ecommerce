import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { useConfirmPayment } from "./hooks";
import type { PaymentListItem } from "./types";

/** Diálogo para confirmar un pago pending con su referencia. */
export function ConfirmPaymentDialog({ payment }: { payment: PaymentListItem }) {
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useConfirmPayment(payment.id);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate(reference, {
      onSuccess: () => {
        toast.success("Pago confirmado");
        setOpen(false);
        setReference("");
      },
      onError: (err) => {
        setError(err instanceof ApiError ? err.message : "Error al confirmar");
      },
    });
  }

  // Al cerrar sin enviar, limpiar para no arrastrar referencia/error a la próxima apertura.
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setReference("");
      setError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">Confirmar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar pago</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="reference">Referencia</Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              required
              minLength={1}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={mutation.isPending || reference.length === 0}>
            Confirmar pago
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
