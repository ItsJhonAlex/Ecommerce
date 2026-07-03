import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { useSettings, useUpdateSettings } from "./hooks";

// Estado del form: strings planas (los null del server se muestran como "").
type FormState = {
  businessName: string;
  phone: string;
  address: string;
  email: string;
  receiptNote: string;
};

const EMPTY_FORM: FormState = {
  businessName: "",
  phone: "",
  address: "",
  email: "",
  receiptNote: "",
};

/** Página "Negocio": datos que aparecen en el recibo. */
export function SettingsPage() {
  const { data, isPending, isError, error, refetch } = useSettings();
  const update = useUpdateSettings();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Inicializar el form desde los ajustes cargados (null → "").
  useEffect(() => {
    if (data) {
      setForm({
        businessName: data.businessName ?? "",
        phone: data.phone ?? "",
        address: data.address ?? "",
        email: data.email ?? "",
        receiptNote: data.receiptNote ?? "",
      });
    }
  }, [data]);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    update.mutate(form, {
      onSuccess: () => toast.success("Ajustes guardados"),
      onError: (err: unknown) =>
        toast.error(
          err instanceof ApiError ? err.message : "No se pudieron guardar",
        ),
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Negocio" subtitle="Datos que aparecen en el recibo" />

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : (
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-businessName">Nombre del negocio</Label>
                <Input
                  id="s-businessName"
                  required
                  value={form.businessName}
                  onChange={(e) => set("businessName", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-phone">Teléfono</Label>
                <Input
                  id="s-phone"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-address">Dirección</Label>
                <Input
                  id="s-address"
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-email">Email</Label>
                <Input
                  id="s-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-receiptNote">Nota del recibo</Label>
                <Textarea
                  id="s-receiptNote"
                  value={form.receiptNote}
                  onChange={(e) => set("receiptNote", e.target.value)}
                />
              </div>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? "Guardando…" : "Guardar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
